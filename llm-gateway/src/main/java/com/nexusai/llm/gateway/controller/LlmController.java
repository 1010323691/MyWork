package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.ChatRequest;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.security.ApiKeyService;
import com.nexusai.llm.gateway.service.LlmForwardService;
import com.nexusai.llm.gateway.service.RequestLogService;
import com.nexusai.llm.gateway.service.RoutingConfigParser;
import com.nexusai.llm.gateway.service.UpstreamProviderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/llm")
public class LlmController {

    private final LlmForwardService llmForwardService;
    private final ApiKeyService apiKeyService;
    private final RequestLogService requestLogService;
    private final RoutingConfigParser routingConfigParser;
    private final UpstreamProviderService upstreamProviderService;

    @Autowired
    public LlmController(LlmForwardService llmForwardService,
                         ApiKeyService apiKeyService,
                         RequestLogService requestLogService,
                         RoutingConfigParser routingConfigParser,
                         UpstreamProviderService upstreamProviderService) {
        this.llmForwardService = llmForwardService;
        this.apiKeyService = apiKeyService;
        this.requestLogService = requestLogService;
        this.routingConfigParser = routingConfigParser;
        this.upstreamProviderService = upstreamProviderService;
    }

    @PostMapping("/chat")
    public ResponseEntity<String> chat(HttpServletRequest httpRequest, @RequestBody ChatRequest request) {
        ApiKey key = (ApiKey) httpRequest.getAttribute("apiKey");
        if (key == null) {
            return ResponseEntity.status(401).body("{\"error\": \"API key required\"}");
        }

        String messagesStr = request.getMessages() != null ? request.getMessages() : "";
        long estimatedInput = llmForwardService.estimateTokenUsage(messagesStr);

        if (Boolean.TRUE.equals(request.getStream())) {
            return ResponseEntity.badRequest().body(
                    "{\"error\": \"Legacy endpoint /api/llm/chat does not support streaming. Use /v1/chat/completions instead.\"}"
            );
        }

        if (!apiKeyService.hasEnoughTokens(key, estimatedInput)) {
            return ResponseEntity.status(429).body("{\"error\": \"Token quota exceeded\"}");
        }

        String targetUrl = routingConfigParser.resolveTargetUrl(key.getRoutingConfig(), key.getTargetUrl());
        String resolvedModel = routingConfigParser.resolveModel(key.getRoutingConfig(), request.getModel());
        if (targetUrl == null || targetUrl.isBlank()) {
            return ResponseEntity.status(502).body("{\"error\": \"No backend target configured\"}");
        }

        long startMs = System.currentTimeMillis();
        String response;
        RequestLog.RequestStatus status = RequestLog.RequestStatus.SUCCESS;
        try {
            response = llmForwardService.forwardChatRequest(targetUrl, resolvedModel, messagesStr, false);
        } catch (Exception e) {
            status = RequestLog.RequestStatus.FAIL;
            long latency = System.currentTimeMillis() - startMs;
            requestLogService.asyncLogRequest(key.getId(), estimatedInput, 0L,
                    resolvedModel, latency, status, messagesStr, e.getMessage());
            return ResponseEntity.status(502).body("{\"error\": \"Upstream request failed\"}");
        }
        long latencyMs = System.currentTimeMillis() - startMs;

        long outputTokens = llmForwardService.estimateTokenUsage(response);
        long totalTokens = estimatedInput + outputTokens;

        requestLogService.asyncRecordUsage(key.getId(), totalTokens);
        requestLogService.asyncLogRequest(key.getId(), estimatedInput, outputTokens,
                resolvedModel, latencyMs, status, messagesStr, response);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/models")
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

        return ResponseEntity.ok(Map.of(
                "models", models
        ));
    }
}
