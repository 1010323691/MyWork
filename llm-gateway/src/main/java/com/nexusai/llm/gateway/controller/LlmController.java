package com.nexusai.llm.gateway.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.nexusai.llm.gateway.dto.ChatRequest;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.BackendService;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.service.ApiKeyConcurrencyGuard;
import com.nexusai.llm.gateway.service.LlmForwardService;
import com.nexusai.llm.gateway.service.RequestLogService;
import com.nexusai.llm.gateway.service.RoutingConfigParser;
import com.nexusai.llm.gateway.service.UpstreamProviderService;
import com.nexusai.llm.gateway.service.UserBillingService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
public class LlmController {

    private final LlmForwardService llmForwardService;
    private final RequestLogService requestLogService;
    private final RoutingConfigParser routingConfigParser;
    private final UpstreamProviderService upstreamProviderService;
    private final UserBillingService userBillingService;
    private final ApiKeyConcurrencyGuard apiKeyConcurrencyGuard;

    @Autowired
    public LlmController(LlmForwardService llmForwardService,
                         RequestLogService requestLogService,
                         RoutingConfigParser routingConfigParser,
                         UpstreamProviderService upstreamProviderService,
                         UserBillingService userBillingService,
                         ApiKeyConcurrencyGuard apiKeyConcurrencyGuard) {
        this.llmForwardService = llmForwardService;
        this.requestLogService = requestLogService;
        this.routingConfigParser = routingConfigParser;
        this.upstreamProviderService = upstreamProviderService;
        this.userBillingService = userBillingService;
        this.apiKeyConcurrencyGuard = apiKeyConcurrencyGuard;
    }

    @PostMapping({"/api/llm/chat", "/api/chat"})
    public ResponseEntity<String> chat(HttpServletRequest httpRequest, @RequestBody ChatRequest request) {
        ApiKey key = (ApiKey) httpRequest.getAttribute("apiKey");
        String targetUrl = key != null
                ? routingConfigParser.resolveTargetUrl(key.getRoutingConfig(), key.getTargetUrl())
                : request != null ? request.getBackendUrl() : null;

        if (key == null) {
            return ResponseEntity.status(401).body("{\"error\": \"API key required\"}");
        }

        JsonNode messagesNode = request.getMessages();
        String messagesStr = "";
        if (messagesNode != null && !messagesNode.isNull()) {
            messagesStr = messagesNode.isTextual() ? messagesNode.asText("") : messagesNode.toString();
        }
        long estimatedInput = llmForwardService.estimateTokenUsage(messagesStr);

        if (Boolean.TRUE.equals(request.getStream())) {
            return ResponseEntity.badRequest().body(
                    "{\"error\": \"Legacy endpoint /api/llm/chat does not support streaming. Use /v1/chat/completions instead.\"}"
            );
        }

        String resolvedModel = routingConfigParser.resolveModel(key.getRoutingConfig(), request.getModel());
        Optional<BackendService> providerOptional = upstreamProviderService.findByModelName(resolvedModel);
        BackendService provider = providerOptional.orElse(null);
        Long userId = key.getUser() != null ? key.getUser().getId() : null;

        if (provider != null && upstreamProviderService.isCircuitOpen(provider.getId())) {
            return ResponseEntity.status(503).body("{\"error\": \"Upstream provider temporarily unavailable\"}");
        }
        if (!userBillingService.hasEnoughBalance(userId, provider, estimatedInput)) {
            return ResponseEntity.status(402).body("{\"error\": \"Insufficient balance\"}");
        }
        if (targetUrl == null || targetUrl.isBlank()) {
            return ResponseEntity.status(502).body("{\"error\": \"No backend target configured\"}");
        }

        try (ApiKeyConcurrencyGuard.Permit ignored = apiKeyConcurrencyGuard.acquire(key)) {
            long startMs = System.currentTimeMillis();
            String response;
            RequestLog.RequestStatus status = RequestLog.RequestStatus.SUCCESS;
            try {
                response = llmForwardService.forwardChatRequest(targetUrl, resolvedModel, messagesStr);
                if (provider != null) {
                    upstreamProviderService.recordSuccess(provider.getId());
                }
            } catch (Exception e) {
                status = RequestLog.RequestStatus.FAIL;
                long latency = System.currentTimeMillis() - startMs;
                if (provider != null) {
                    upstreamProviderService.recordFailure(provider.getId());
                }
                requestLogService.asyncLogRequest(key.getId(), userId, null, estimatedInput, 0L,
                        estimatedInput, 0L,
                        resolvedModel, latency, BigDecimal.ZERO, status);
                return ResponseEntity.status(502).body("{\"error\": \"Upstream request failed\"}");
            }
            long latencyMs = System.currentTimeMillis() - startMs;

            long outputTokens = llmForwardService.estimateTokenUsage(response);
            long totalTokens = estimatedInput + outputTokens;
            BigDecimal actualCost = userBillingService.settleUsage(userId, provider, estimatedInput, outputTokens, null, resolvedModel);

            requestLogService.asyncRecordUsage(key.getId(), totalTokens);
            requestLogService.asyncLogRequest(key.getId(), userId, null, estimatedInput, outputTokens,
                    estimatedInput, 0L,
                    resolvedModel, latencyMs, actualCost, status);

            return ResponseEntity.ok(response);
        }
    }

    @GetMapping({"/api/llm/models", "/api/models"})
    public ResponseEntity<Map<String, Object>> listModels(HttpServletRequest httpRequest) {
        ApiKey key = (ApiKey) httpRequest.getAttribute("apiKey");
        if (key == null) {
            return ResponseEntity.status(401).body(Map.of("error", "API key required"));
        }

        Set<String> models = new LinkedHashSet<>();
        upstreamProviderService.findAllEnabled().forEach(provider -> {
            String supportedModels = provider.getSupportedModels();
            if (supportedModels == null || supportedModels.isBlank()) {
                return;
            }
            for (String rawModel : supportedModels.split("[,\\r\\n]+")) {
                String model = rawModel.trim();
                if (!model.isBlank() && !"*".equals(model) && !model.endsWith("*")) {
                    models.add(model);
                }
            }
        });

        return ResponseEntity.ok(Map.of("models", models));
    }

}
