package com.nexusai.llm.gateway.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.BackendService;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.security.ApiKeyService;
import com.nexusai.llm.gateway.service.OpenAiForwardService;
import com.nexusai.llm.gateway.service.RequestLogService;
import com.nexusai.llm.gateway.service.RoutingConfigParser;
import com.nexusai.llm.gateway.service.UpstreamProviderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
public class OpenAiCompatibleController {

    private final OpenAiForwardService openAiForwardService;
    private final ApiKeyService apiKeyService;
    private final RequestLogService requestLogService;
    private final RoutingConfigParser routingConfigParser;
    private final UpstreamProviderService upstreamProviderService;
    private final ObjectMapper objectMapper;

    public OpenAiCompatibleController(OpenAiForwardService openAiForwardService,
                                      ApiKeyService apiKeyService,
                                      RequestLogService requestLogService,
                                      RoutingConfigParser routingConfigParser,
                                      UpstreamProviderService upstreamProviderService,
                                      ObjectMapper objectMapper) {
        this.openAiForwardService = openAiForwardService;
        this.apiKeyService = apiKeyService;
        this.requestLogService = requestLogService;
        this.routingConfigParser = routingConfigParser;
        this.upstreamProviderService = upstreamProviderService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/v1/chat/completions")
    public ResponseEntity<?> chatCompletions(HttpServletRequest httpRequest, @RequestBody JsonNode requestBody) {
        ApiKey key = (ApiKey) httpRequest.getAttribute("apiKey");
        if (key == null) {
            return ResponseEntity.status(401).body(Map.of("error", Map.of("message", "API key required", "type", "authentication_error")));
        }

        String requestedModel = requestBody.path("model").asText(null);
        if (requestedModel == null || requestedModel.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", Map.of("message", "model is required", "type", "invalid_request_error")));
        }

        String requestId = UUID.randomUUID().toString();
        String resolvedModel = routingConfigParser.resolveModel(key.getRoutingConfig(), requestedModel);
        Optional<BackendService> providerOptional = upstreamProviderService.findByModelName(resolvedModel);
        String configuredTargetUrl = routingConfigParser.resolveConfiguredTargetUrl(key.getRoutingConfig(), key.getTargetUrl());
        String targetUrl = configuredTargetUrl != null && !configuredTargetUrl.isBlank()
                ? configuredTargetUrl
                : providerOptional.map(BackendService::getBaseUrl).orElse(null);

        if (targetUrl == null || targetUrl.isBlank()) {
            return ResponseEntity.status(502).body(Map.of("error", Map.of("message", "No backend mapped for model: " + resolvedModel, "type", "routing_error")));
        }

        String upstreamApiKey = providerOptional.map(BackendService::getUpstreamKey).orElse(null);
        ObjectNode rewrittenRequest = openAiForwardService.rewriteRequestModel(requestBody, resolvedModel);
        String requestBodyText = rewrittenRequest.toString();
        long estimatedInput = openAiForwardService.estimateTokenUsage(openAiForwardService.extractMessagesText(rewrittenRequest));

        if (!apiKeyService.hasEnoughTokens(key, estimatedInput)) {
            return ResponseEntity.status(429).body(Map.of("error", Map.of("message", "Token quota exceeded", "type", "insufficient_quota")));
        }

        boolean stream = rewrittenRequest.path("stream").asBoolean(false);
        long startMs = System.currentTimeMillis();
        Long userId = key.getUser() != null ? key.getUser().getId() : null;

        if (stream) {
            return handleStreamingRequest(key, userId, requestId, resolvedModel, targetUrl, upstreamApiKey, rewrittenRequest, requestBodyText, estimatedInput, startMs);
        }

        return handleNonStreamingRequest(key, userId, requestId, resolvedModel, targetUrl, upstreamApiKey, rewrittenRequest, requestBodyText, estimatedInput, startMs);
    }

    @GetMapping("/v1/models")
    public ResponseEntity<Map<String, Object>> listModels(HttpServletRequest httpRequest) {
        ApiKey key = (ApiKey) httpRequest.getAttribute("apiKey");
        if (key == null) {
            return ResponseEntity.status(401).body(Map.of("error", Map.of("message", "API key required", "type", "authentication_error")));
        }

        Set<String> modelIds = new LinkedHashSet<>();
        for (BackendService provider : upstreamProviderService.findAllEnabled()) {
            String supportedModels = provider.getSupportedModels();
            if (supportedModels == null || supportedModels.isBlank()) {
                continue;
            }
            for (String rawModel : supportedModels.split("[,\\r\\n]+")) {
                String model = rawModel.trim();
                if (!model.isBlank() && !model.endsWith("*") && !"*".equals(model)) {
                    modelIds.add(model);
                }
            }
        }

        List<Map<String, Object>> data = new ArrayList<>();
        for (String modelId : modelIds) {
            data.add(Map.of(
                    "id", modelId,
                    "object", "model",
                    "created", 0,
                    "owned_by", "llm-gateway"
            ));
        }

        return ResponseEntity.ok(Map.of("object", "list", "data", data));
    }

    private ResponseEntity<?> handleNonStreamingRequest(ApiKey key,
                                                        Long userId,
                                                        String requestId,
                                                        String resolvedModel,
                                                        String targetUrl,
                                                        String upstreamApiKey,
                                                        JsonNode rewrittenRequest,
                                                        String requestBodyText,
                                                        long estimatedInput,
                                                        long startMs) {
        OpenAiForwardService.ForwardedResponse response;
        try {
            response = openAiForwardService.forwardChatRequest(targetUrl, rewrittenRequest, upstreamApiKey);
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startMs;
            requestLogService.asyncLogRequest(key.getId(), userId, requestId, estimatedInput, 0L,
                    resolvedModel, latency, RequestLog.RequestStatus.FAIL, requestBodyText, e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", Map.of("message", e.getMessage(), "type", "upstream_error")));
        }

        long latencyMs = System.currentTimeMillis() - startMs;
        long outputTokens = openAiForwardService.estimateTokenUsage(openAiForwardService.extractResponseText(response.body()));
        RequestLog.RequestStatus status = response.statusCode() >= 400 ? RequestLog.RequestStatus.FAIL : RequestLog.RequestStatus.SUCCESS;

        if (status == RequestLog.RequestStatus.SUCCESS) {
            requestLogService.asyncRecordUsage(key.getId(), estimatedInput + outputTokens);
        }
        requestLogService.asyncLogRequest(key.getId(), userId, requestId, estimatedInput, outputTokens,
                resolvedModel, latencyMs, status, requestBodyText, response.body());

        return ResponseEntity.status(response.statusCode())
                .contentType(parseMediaType(response.contentType(), MediaType.APPLICATION_JSON))
                .body(response.body());
    }

    private ResponseEntity<StreamingResponseBody> handleStreamingRequest(ApiKey key,
                                                                         Long userId,
                                                                         String requestId,
                                                                         String resolvedModel,
                                                                         String targetUrl,
                                                                         String upstreamApiKey,
                                                                         JsonNode rewrittenRequest,
                                                                         String requestBodyText,
                                                                         long estimatedInput,
                                                                         long startMs) {
        OpenAiForwardService.PreparedStreamingResponse response;
        try {
            response = openAiForwardService.openStreamingChatRequest(targetUrl, rewrittenRequest, upstreamApiKey);
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startMs;
            requestLogService.asyncLogRequest(key.getId(), userId, requestId, estimatedInput, 0L,
                    resolvedModel, latency, RequestLog.RequestStatus.FAIL, requestBodyText, e.getMessage());
            StreamingResponseBody errorBody = outputStream -> outputStream.write(objectMapper.writeValueAsBytes(
                    Map.of("error", Map.of("message", e.getMessage(), "type", "upstream_error"))
            ));
            return ResponseEntity.status(502).contentType(MediaType.APPLICATION_JSON).body(errorBody);
        }

        RequestLog.RequestStatus initialStatus = response.statusCode() >= 400 ? RequestLog.RequestStatus.FAIL : RequestLog.RequestStatus.SUCCESS;
        StreamingResponseBody responseBody = outputStream -> {
            RequestLog.RequestStatus finalStatus = initialStatus;
            String capturedBody = "";
            try {
                OpenAiForwardService.StreamSummary summary = openAiForwardService.relayStream(response.inputStream(), outputStream);
                capturedBody = summary.capturedBody();
            } catch (Exception e) {
                finalStatus = RequestLog.RequestStatus.FAIL;
                capturedBody = e.getMessage();
                throw e;
            } finally {
                long latencyMs = System.currentTimeMillis() - startMs;
                long outputTokens = openAiForwardService.estimateTokenUsage(capturedBody);
                if (finalStatus == RequestLog.RequestStatus.SUCCESS) {
                    requestLogService.asyncRecordUsage(key.getId(), estimatedInput + outputTokens);
                }
                requestLogService.asyncLogRequest(key.getId(), userId, requestId, estimatedInput, outputTokens,
                        resolvedModel, latencyMs, finalStatus, requestBodyText, capturedBody);
            }
        };

        return ResponseEntity.status(response.statusCode())
                .contentType(parseMediaType(response.contentType(), MediaType.TEXT_EVENT_STREAM))
                .body(responseBody);
    }

    private MediaType parseMediaType(String value, MediaType fallback) {
        try {
            return MediaType.parseMediaType(value);
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
