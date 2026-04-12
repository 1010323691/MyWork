package com.nexusai.llm.gateway.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.BackendService;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.service.ApiKeyConcurrencyGuard;
import com.nexusai.llm.gateway.service.OpenAiForwardService;
import com.nexusai.llm.gateway.service.RequestLogService;
import com.nexusai.llm.gateway.service.RoutingConfigParser;
import com.nexusai.llm.gateway.service.UpstreamProviderService;
import com.nexusai.llm.gateway.service.UserBillingService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
public class OpenAiCompatibleController {

    private static final Logger logger = LoggerFactory.getLogger(OpenAiCompatibleController.class);

    private final OpenAiForwardService openAiForwardService;
    private final RequestLogService requestLogService;
    private final RoutingConfigParser routingConfigParser;
    private final UpstreamProviderService upstreamProviderService;
    private final UserBillingService userBillingService;
    private final ObjectMapper objectMapper;
    private final ApiKeyConcurrencyGuard apiKeyConcurrencyGuard;

    public OpenAiCompatibleController(OpenAiForwardService openAiForwardService,
                                      RequestLogService requestLogService,
                                      RoutingConfigParser routingConfigParser,
                                      UpstreamProviderService upstreamProviderService,
                                      UserBillingService userBillingService,
                                      ObjectMapper objectMapper,
                                      ApiKeyConcurrencyGuard apiKeyConcurrencyGuard) {
        this.openAiForwardService = openAiForwardService;
        this.requestLogService = requestLogService;
        this.routingConfigParser = routingConfigParser;
        this.upstreamProviderService = upstreamProviderService;
        this.userBillingService = userBillingService;
        this.objectMapper = objectMapper;
        this.apiKeyConcurrencyGuard = apiKeyConcurrencyGuard;
    }

    @PostMapping("/v1/chat/completions")
    public ResponseEntity<StreamingResponseBody> chatCompletions(HttpServletRequest httpRequest, @RequestBody JsonNode requestBody) {
        ApiKey key = (ApiKey) httpRequest.getAttribute("apiKey");
        String requestedModel = requestBody.path("model").asText(null);

        if (key == null) {
            return jsonResponse(401, Map.of("error", Map.of("message", "API key required", "type", "authentication_error")));
        }

        if (requestedModel == null || requestedModel.isBlank()) {
            return jsonResponse(400, Map.of("error", Map.of("message", "model is required", "type", "invalid_request_error")));
        }

        String requestId = UUID.randomUUID().toString();
        String resolvedModel = routingConfigParser.resolveModel(key.getRoutingConfig(), requestedModel);
        Optional<BackendService> providerOptional = upstreamProviderService.findByModelName(resolvedModel);
        BackendService provider = providerOptional.orElse(null);
        String targetUrl = resolveTargetUrl(key, resolvedModel, providerOptional);

        if (provider != null && upstreamProviderService.isCircuitOpen(provider.getId())) {
            return jsonResponse(503, Map.of("error", Map.of("message", "Upstream provider temporarily unavailable", "type", "provider_unavailable")));
        }
        if (targetUrl == null || targetUrl.isBlank()) {
            logger.warn("OpenAI request routing failed: requestId={}, resolvedModel={}", requestId, resolvedModel);
            return jsonResponse(502, Map.of("error", Map.of("message", "No backend mapped for model: " + resolvedModel, "type", "routing_error")));
        }

        String upstreamApiKey = providerOptional.map(BackendService::getUpstreamKey).orElse(null);
        ObjectNode rewrittenRequest = openAiForwardService.rewriteRequestModel(requestBody, resolvedModel);
        long estimatedInput = openAiForwardService.estimateTokenUsage(openAiForwardService.extractMessagesText(rewrittenRequest));

        boolean stream = rewrittenRequest.path("stream").asBoolean(false);
        long startMs = System.currentTimeMillis();
        Long userId = key.getUser() != null ? key.getUser().getId() : null;

        if (!userBillingService.hasEnoughBalance(userId, provider, estimatedInput)) {
            BigDecimal estimatedCost = userBillingService.estimateInputCost(provider, estimatedInput);
            logger.warn("OpenAI request rejected for insufficient balance: requestId={}, userId={}, apiKeyId={}, estimatedInput={}, estimatedCost={}",
                    requestId, userId, key.getId(), estimatedInput, estimatedCost);
            return jsonResponse(402, Map.of("error", Map.of("message", "Insufficient balance", "type", "insufficient_balance")));
        }

        ApiKeyConcurrencyGuard.Permit permit = apiKeyConcurrencyGuard.acquire(key);
        if (stream) {
            return handleStreamingRequest(key, userId, provider, requestId, resolvedModel, targetUrl, upstreamApiKey, rewrittenRequest, estimatedInput, startMs, permit);
        }

        return handleNonStreamingRequest(key, userId, provider, requestId, resolvedModel, targetUrl, upstreamApiKey, rewrittenRequest, estimatedInput, startMs, permit);
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

    private ResponseEntity<StreamingResponseBody> handleNonStreamingRequest(ApiKey key,
                                                                            Long userId,
                                                                            BackendService provider,
                                                                            String requestId,
                                                                            String resolvedModel,
                                                                            String targetUrl,
                                                                            String upstreamApiKey,
                                                                            JsonNode rewrittenRequest,
                                                                            long estimatedInput,
                                                                            long startMs,
                                                                            ApiKeyConcurrencyGuard.Permit permit) {
        try (permit) {
            OpenAiForwardService.ForwardedResponse response;
            try {
                response = openAiForwardService.forwardChatRequest(targetUrl, rewrittenRequest, upstreamApiKey);
            } catch (Exception e) {
                long latency = System.currentTimeMillis() - startMs;
                if (provider != null) {
                    upstreamProviderService.recordFailure(provider.getId());
                }
                logger.error("OpenAI non-stream upstream failed: requestId={}, latencyMs={}, error={}",
                        requestId, latency, e.getMessage(), e);
                requestLogService.asyncLogRequest(key.getId(), userId, requestId, estimatedInput, 0L,
                        estimatedInput, 0L,
                        resolvedModel, latency, BigDecimal.ZERO, RequestLog.RequestStatus.FAIL);
                return jsonResponse(502, Map.of("error", Map.of("message", e.getMessage(), "type", "upstream_error")));
            }

            long latencyMs = System.currentTimeMillis() - startMs;
            OpenAiForwardService.UsageStats usageStats = openAiForwardService.extractUsageStats(response.body());
            long totalInputTokens = usageStats.totalInputTokensOr(estimatedInput);
            long cachedInputTokens = usageStats.cachedInputTokensOr(0L);
            long actualInputTokens = usageStats.actualInputTokensOr(estimatedInput);
            long outputTokens = usageStats.completionTokensOr(
                    openAiForwardService.estimateTokenUsage(openAiForwardService.extractResponseText(response.body()))
            );
            RequestLog.RequestStatus status = response.statusCode() >= 400 ? RequestLog.RequestStatus.FAIL : RequestLog.RequestStatus.SUCCESS;
            BigDecimal actualCost = status == RequestLog.RequestStatus.SUCCESS
                    ? userBillingService.settleUsage(userId, provider, actualInputTokens, outputTokens, requestId, resolvedModel)
                    : BigDecimal.ZERO;

            if (provider != null) {
                if (response.statusCode() >= 500) {
                    upstreamProviderService.recordFailure(provider.getId());
                } else {
                    upstreamProviderService.recordSuccess(provider.getId());
                }
            }
            if (status == RequestLog.RequestStatus.SUCCESS) {
                requestLogService.asyncRecordUsage(key.getId(), actualInputTokens + outputTokens);
            }
            requestLogService.asyncLogRequest(key.getId(), userId, requestId, actualInputTokens, outputTokens,
                    totalInputTokens, cachedInputTokens,
                    resolvedModel, latencyMs, actualCost, status);

            StreamingResponseBody responseBody = outputStream ->
                    outputStream.write(response.body().getBytes(java.nio.charset.StandardCharsets.UTF_8));

            return ResponseEntity.status(response.statusCode())
                    .contentType(parseMediaType(response.contentType(), MediaType.APPLICATION_JSON))
                    .body(responseBody);
        }
    }

    private ResponseEntity<StreamingResponseBody> handleStreamingRequest(ApiKey key,
                                                                         Long userId,
                                                                         BackendService provider,
                                                                         String requestId,
                                                                         String resolvedModel,
                                                                         String targetUrl,
                                                                         String upstreamApiKey,
                                                                         JsonNode rewrittenRequest,
                                                                         long estimatedInput,
                                                                         long startMs,
                                                                         ApiKeyConcurrencyGuard.Permit permit) {
        OpenAiForwardService.PreparedStreamingResponse response;
        try {
            response = openAiForwardService.openStreamingChatRequest(targetUrl, rewrittenRequest, upstreamApiKey);
        } catch (Exception e) {
            permit.close();
            long latency = System.currentTimeMillis() - startMs;
            if (provider != null) {
                upstreamProviderService.recordFailure(provider.getId());
            }
            logger.error("OpenAI stream upstream open failed: requestId={}, latencyMs={}, error={}",
                    requestId, latency, e.getMessage(), e);
            requestLogService.asyncLogRequest(key.getId(), userId, requestId, estimatedInput, 0L,
                    estimatedInput, 0L,
                    resolvedModel, latency, BigDecimal.ZERO, RequestLog.RequestStatus.FAIL);
            return jsonResponse(502, Map.of("error", Map.of("message", e.getMessage(), "type", "upstream_error")));
        }

        RequestLog.RequestStatus initialStatus = response.statusCode() >= 400 ? RequestLog.RequestStatus.FAIL : RequestLog.RequestStatus.SUCCESS;
        StreamingResponseBody responseBody = outputStream -> {
            RequestLog.RequestStatus finalStatus = initialStatus;
            String visibleContent = "";
            OpenAiForwardService.UsageStats usageStats = OpenAiForwardService.UsageStats.empty();
            boolean providerFailure = false;
            try {
                OpenAiForwardService.StreamSummary summary = openAiForwardService.relayStream(
                        response.connection(),
                        response.inputStream(),
                        outputStream
                );
                visibleContent = summary.visibleContent();
                usageStats = summary.usageStats();
            } catch (Exception e) {
                finalStatus = RequestLog.RequestStatus.FAIL;
                providerFailure = true;
                logger.error("OpenAI stream relay failed: requestId={}, error={}", requestId, e.getMessage(), e);
                throw e;
            } finally {
                long latencyMs = System.currentTimeMillis() - startMs;
                long totalInputTokens = usageStats.totalInputTokensOr(estimatedInput);
                long cachedInputTokens = usageStats.cachedInputTokensOr(0L);
                long actualInputTokens = usageStats.actualInputTokensOr(estimatedInput);
                long outputTokens = usageStats.completionTokensOr(0L);
                if (outputTokens <= 0 && visibleContent != null && !visibleContent.isBlank()) {
                    outputTokens = openAiForwardService.estimateTokenUsage(visibleContent);
                }
                BigDecimal actualCost = finalStatus == RequestLog.RequestStatus.SUCCESS
                        ? userBillingService.settleUsage(userId, provider, actualInputTokens, outputTokens, requestId, resolvedModel)
                        : BigDecimal.ZERO;
                if (provider != null) {
                    if (finalStatus == RequestLog.RequestStatus.SUCCESS) {
                        upstreamProviderService.recordSuccess(provider.getId());
                    } else if (providerFailure || response.statusCode() >= 500) {
                        upstreamProviderService.recordFailure(provider.getId());
                    }
                }
                if (finalStatus == RequestLog.RequestStatus.SUCCESS) {
                    requestLogService.asyncRecordUsage(key.getId(), actualInputTokens + outputTokens);
                }
                requestLogService.asyncLogRequest(key.getId(), userId, requestId, actualInputTokens, outputTokens,
                        totalInputTokens, cachedInputTokens,
                        resolvedModel, latencyMs, actualCost, finalStatus);
                permit.close();
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

    private ResponseEntity<StreamingResponseBody> jsonResponse(int status, Object body) {
        StreamingResponseBody responseBody = outputStream -> outputStream.write(objectMapper.writeValueAsBytes(body));
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(responseBody);
    }

    private String resolveTargetUrl(ApiKey key, String modelName) {
        if (key == null) {
            return null;
        }
        String resolvedModel = routingConfigParser.resolveModel(key.getRoutingConfig(), modelName);
        Optional<BackendService> providerOptional = upstreamProviderService.findByModelName(resolvedModel);
        return resolveTargetUrl(key, resolvedModel, providerOptional);
    }

    private String resolveTargetUrl(ApiKey key, String resolvedModel, Optional<BackendService> providerOptional) {
        String configuredTargetUrl = routingConfigParser.resolveConfiguredTargetUrl(key.getRoutingConfig(), key.getTargetUrl());
        if (configuredTargetUrl != null && !configuredTargetUrl.isBlank()) {
            return configuredTargetUrl;
        }
        return providerOptional.map(BackendService::getBaseUrl).orElse(null);
    }

}
