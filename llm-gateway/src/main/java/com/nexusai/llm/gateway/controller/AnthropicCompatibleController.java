package com.nexusai.llm.gateway.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.BackendService;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.service.AnthropicForwardService;
import com.nexusai.llm.gateway.service.ApiKeyConcurrencyGuard;
import com.nexusai.llm.gateway.service.RequestLogService;
import com.nexusai.llm.gateway.service.RoutingConfigParser;
import com.nexusai.llm.gateway.service.UpstreamProviderService;
import com.nexusai.llm.gateway.service.UserBillingService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
public class AnthropicCompatibleController {

    private static final Logger logger = LoggerFactory.getLogger(AnthropicCompatibleController.class);

    private final AnthropicForwardService anthropicForwardService;
    private final RequestLogService requestLogService;
    private final RoutingConfigParser routingConfigParser;
    private final UpstreamProviderService upstreamProviderService;
    private final UserBillingService userBillingService;
    private final ObjectMapper objectMapper;
    private final ApiKeyConcurrencyGuard apiKeyConcurrencyGuard;

    public AnthropicCompatibleController(AnthropicForwardService anthropicForwardService,
                                         RequestLogService requestLogService,
                                         RoutingConfigParser routingConfigParser,
                                         UpstreamProviderService upstreamProviderService,
                                         UserBillingService userBillingService,
                                         ObjectMapper objectMapper,
                                         ApiKeyConcurrencyGuard apiKeyConcurrencyGuard) {
        this.anthropicForwardService = anthropicForwardService;
        this.requestLogService = requestLogService;
        this.routingConfigParser = routingConfigParser;
        this.upstreamProviderService = upstreamProviderService;
        this.userBillingService = userBillingService;
        this.objectMapper = objectMapper;
        this.apiKeyConcurrencyGuard = apiKeyConcurrencyGuard;
    }

    @PostMapping("/v1/messages")
    public ResponseEntity<StreamingResponseBody> messages(HttpServletRequest httpRequest, @RequestBody JsonNode requestBody) {
        ApiKey key = (ApiKey) httpRequest.getAttribute("apiKey");
        String requestedModel = requestBody.path("model").asText(null);
        String targetUrl = key != null ? resolveTargetUrl(key, requestedModel) : null;

        if (key == null) {
            return anthropicErrorResponse(401, "authentication_error", "API key required");
        }
        if (requestedModel == null || requestedModel.isBlank()) {
            return anthropicErrorResponse(400, "invalid_request_error", "model is required");
        }

        String requestId = "msg_" + UUID.randomUUID().toString().replace("-", "");
        String resolvedModel = routingConfigParser.resolveModel(key.getRoutingConfig(), requestedModel);
        ObjectNode forwardedRequest = requestBody != null && requestBody.isObject()
                ? ((ObjectNode) requestBody.deepCopy())
                : objectMapper.createObjectNode();
        forwardedRequest.put("model", resolvedModel);

        Optional<BackendService> providerOptional = upstreamProviderService.findByModelName(resolvedModel);
        BackendService provider = providerOptional.orElse(null);
        targetUrl = resolveTargetUrl(key, resolvedModel, providerOptional);
        if (provider != null && upstreamProviderService.isCircuitOpen(provider.getId())) {
            return anthropicErrorResponse(503, "api_error", "Upstream provider temporarily unavailable");
        }
        if (targetUrl == null || targetUrl.isBlank()) {
            logger.warn("Anthropic request routing failed: requestId={}, resolvedModel={}", requestId, resolvedModel);
            return anthropicErrorResponse(502, "api_error", "No backend mapped for model: " + resolvedModel);
        }

        long estimatedInput = anthropicForwardService.estimateTokenUsage(anthropicForwardService.extractMessagesText(forwardedRequest));
        Long userId = key.getUser() != null ? key.getUser().getId() : null;
        if (!userBillingService.hasEnoughBalance(userId, provider, estimatedInput)) {
            BigDecimal estimatedCost = userBillingService.estimateInputCost(provider, estimatedInput);
            logger.warn("Anthropic request rejected for insufficient balance: requestId={}, userId={}, apiKeyId={}, estimatedInput={}, estimatedCost={}",
                    requestId, userId, key.getId(), estimatedInput, estimatedCost);
            return anthropicErrorResponse(402, "invalid_request_error", "Insufficient balance");
        }

        String upstreamApiKey = providerOptional.map(BackendService::getUpstreamKey).orElse(null);
        String anthropicVersion = firstNonBlank(httpRequest.getHeader("anthropic-version"), "2023-06-01");
        String anthropicBeta = httpRequest.getHeader("anthropic-beta");
        boolean stream = forwardedRequest.path("stream").asBoolean(false);
        long startMs = System.currentTimeMillis();
        ApiKeyConcurrencyGuard.Permit permit = apiKeyConcurrencyGuard.acquire(key);

        if (stream) {
            return handleStreamingRequest(key, userId, provider, requestId, resolvedModel, targetUrl, upstreamApiKey,
                    anthropicVersion, anthropicBeta, forwardedRequest, estimatedInput, startMs, permit);
        }
        return handleNonStreamingRequest(key, userId, provider, requestId, resolvedModel, targetUrl, upstreamApiKey,
                anthropicVersion, anthropicBeta, forwardedRequest, estimatedInput, startMs, permit);
    }

    private ResponseEntity<StreamingResponseBody> handleNonStreamingRequest(ApiKey key,
                                                                            Long userId,
                                                                            BackendService provider,
                                                                            String requestId,
                                                                            String resolvedModel,
                                                                            String targetUrl,
                                                                            String upstreamApiKey,
                                                                            String anthropicVersion,
                                                                            String anthropicBeta,
                                                                            ObjectNode forwardedRequest,
                                                                            long estimatedInput,
                                                                            long startMs,
                                                                            ApiKeyConcurrencyGuard.Permit permit) {
        try {
            AnthropicForwardService.ForwardedResponse response;
            try {
                response = anthropicForwardService.forwardMessagesRequest(targetUrl, forwardedRequest, upstreamApiKey, anthropicVersion, anthropicBeta);
            } catch (Exception e) {
                long latency = System.currentTimeMillis() - startMs;
                if (provider != null) {
                    upstreamProviderService.recordFailure(provider.getId());
                }
                logger.error("Anthropic non-stream upstream failed: requestId={}, latencyMs={}, error={}",
                        requestId, latency, e.getMessage(), e);
                logRequestIfAuthenticated(key, userId, requestId, estimatedInput, 0L, estimatedInput, 0L,
                        resolvedModel, latency, BigDecimal.ZERO, RequestLog.RequestStatus.FAIL);
                return anthropicErrorResponse(502, "api_error", e.getMessage());
            }

            long latencyMs = System.currentTimeMillis() - startMs;
            AnthropicForwardService.UsageStats usageStats = anthropicForwardService.extractUsageStats(response.body());
            long totalInputTokens = usageStats.totalInputTokensOr(estimatedInput);
            long cachedInputTokens = usageStats.cachedInputTokensOr(0L);
            long actualInputTokens = usageStats.actualInputTokensOr(estimatedInput);
            long outputTokens = usageStats.outputTokensOr(
                    anthropicForwardService.estimateTokenUsage(anthropicForwardService.extractResponseText(response.body()))
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
            recordUsageIfAuthenticated(key, status, actualInputTokens + outputTokens);
            logRequestIfAuthenticated(key, userId, requestId, actualInputTokens, outputTokens,
                    totalInputTokens, cachedInputTokens, resolvedModel, latencyMs, actualCost, status);

            if (response.statusCode() >= 400) {
                return anthropicErrorResponse(response.statusCode(), "api_error", extractUpstreamErrorMessage(response.body()));
            }

            StreamingResponseBody responseBody = outputStream ->
                    outputStream.write(response.body().getBytes(StandardCharsets.UTF_8));
            return ResponseEntity.status(response.statusCode())
                    .contentType(parseMediaType(response.contentType(), MediaType.APPLICATION_JSON))
                    .body(responseBody);
        } finally {
            closePermit(permit);
        }
    }

    private ResponseEntity<StreamingResponseBody> handleStreamingRequest(ApiKey key,
                                                                         Long userId,
                                                                         BackendService provider,
                                                                         String requestId,
                                                                         String resolvedModel,
                                                                         String targetUrl,
                                                                         String upstreamApiKey,
                                                                         String anthropicVersion,
                                                                         String anthropicBeta,
                                                                         ObjectNode forwardedRequest,
                                                                         long estimatedInput,
                                                                         long startMs,
                                                                         ApiKeyConcurrencyGuard.Permit permit) {
        AnthropicForwardService.PreparedStreamingResponse response;
        try {
            response = anthropicForwardService.openStreamingMessagesRequest(targetUrl, forwardedRequest, upstreamApiKey, anthropicVersion, anthropicBeta);
        } catch (Exception e) {
            closePermit(permit);
            long latency = System.currentTimeMillis() - startMs;
            if (provider != null) {
                upstreamProviderService.recordFailure(provider.getId());
            }
            logger.error("Anthropic stream upstream open failed: requestId={}, latencyMs={}, error={}",
                    requestId, latency, e.getMessage(), e);
            logRequestIfAuthenticated(key, userId, requestId, estimatedInput, 0L,
                    estimatedInput, 0L, resolvedModel, latency, BigDecimal.ZERO, RequestLog.RequestStatus.FAIL);
            return anthropicErrorResponse(502, "api_error", e.getMessage());
        }

        if (response.statusCode() >= 400) {
            closePermit(permit);
            String errorBody = readAllAndClose(response.inputStream(), response.connection());
            long latency = System.currentTimeMillis() - startMs;
            if (provider != null) {
                if (response.statusCode() >= 500) {
                    upstreamProviderService.recordFailure(provider.getId());
                } else {
                    upstreamProviderService.recordSuccess(provider.getId());
                }
            }
            logRequestIfAuthenticated(key, userId, requestId, estimatedInput, 0L,
                    estimatedInput, 0L, resolvedModel, latency, BigDecimal.ZERO, RequestLog.RequestStatus.FAIL);
            return anthropicErrorResponse(response.statusCode(), "api_error", extractUpstreamErrorMessage(errorBody));
        }

        StreamingResponseBody responseBody = outputStream -> {
            RequestLog.RequestStatus finalStatus = RequestLog.RequestStatus.SUCCESS;
            AnthropicForwardService.StreamSummary summary = null;
            boolean providerFailure = false;
            try {
                summary = anthropicForwardService.relayStream(response.connection(), response.inputStream(), outputStream);
            } catch (Exception e) {
                finalStatus = RequestLog.RequestStatus.FAIL;
                providerFailure = true;
                logger.error("Anthropic stream relay failed: requestId={}, error={}", requestId, e.getMessage(), e);
                throw e;
            } finally {
                long latencyMs = System.currentTimeMillis() - startMs;
                AnthropicForwardService.UsageStats usageStats = summary != null ? summary.usageStats() : AnthropicForwardService.UsageStats.empty();
                long totalInputTokens = usageStats.totalInputTokensOr(estimatedInput);
                long cachedInputTokens = usageStats.cachedInputTokensOr(0L);
                long actualInputTokens = usageStats.actualInputTokensOr(estimatedInput);
                long outputTokens = usageStats.outputTokensOr(summary != null
                        ? anthropicForwardService.estimateTokenUsage(summary.visibleContent())
                        : 0L);
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
                recordUsageIfAuthenticated(key, finalStatus, actualInputTokens + outputTokens);
                logRequestIfAuthenticated(key, userId, requestId, actualInputTokens, outputTokens,
                        totalInputTokens, cachedInputTokens, resolvedModel, latencyMs, actualCost, finalStatus);
                closePermit(permit);
            }
        };

        return ResponseEntity.status(response.statusCode())
                .contentType(parseMediaType(response.contentType(), MediaType.TEXT_EVENT_STREAM))
                .body(responseBody);
    }

    private ResponseEntity<StreamingResponseBody> anthropicErrorResponse(int status, String errorType, String message) {
        Map<String, Object> body = Map.of(
                "type", "error",
                "error", Map.of(
                        "type", errorType,
                        "message", message
                )
        );
        StreamingResponseBody responseBody = outputStream -> outputStream.write(objectMapper.writeValueAsBytes(body));
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(responseBody);
    }

    private String extractUpstreamErrorMessage(String body) {
        if (body == null || body.isBlank()) {
            return "Upstream request failed";
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode error = root.path("error");
            if (error.isTextual()) {
                return error.asText();
            }
            if (error.has("message")) {
                return error.path("message").asText("Upstream request failed");
            }
        } catch (Exception ignored) {
        }
        return body;
    }

    private MediaType parseMediaType(String value, MediaType fallback) {
        try {
            return MediaType.parseMediaType(value);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private String readAllAndClose(InputStream inputStream, java.net.HttpURLConnection connection) {
        if (inputStream == null) {
            if (connection != null) {
                connection.disconnect();
            }
            return "";
        }
        try (InputStream in = inputStream) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "Upstream request failed";
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
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

    private String firstNonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private void recordUsageIfAuthenticated(ApiKey key, RequestLog.RequestStatus status, long totalTokens) {
        if (key != null && status == RequestLog.RequestStatus.SUCCESS) {
            requestLogService.asyncRecordUsage(key.getId(), totalTokens);
        }
    }

    private void logRequestIfAuthenticated(ApiKey key,
                                           Long userId,
                                           String requestId,
                                           Long inputTokens,
                                           Long outputTokens,
                                           Long totalInputTokens,
                                           Long cachedInputTokens,
                                           String modelName,
                                           Long latencyMs,
                                           BigDecimal costAmount,
                                           RequestLog.RequestStatus status) {
        if (key != null) {
            requestLogService.asyncLogRequest(key.getId(), userId, requestId, inputTokens, outputTokens,
                    totalInputTokens, cachedInputTokens, modelName, latencyMs, costAmount, status);
        }
    }

    private void closePermit(ApiKeyConcurrencyGuard.Permit permit) {
        if (permit != null) {
            permit.close();
        }
    }
}
