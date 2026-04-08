package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.ChatRequest;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.service.LlmForwardService;
import com.nexusai.llm.gateway.service.RequestLogService;
import com.nexusai.llm.gateway.service.RoutingConfigParser;
import com.nexusai.llm.gateway.security.ApiKeyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/llm")
public class LlmController {

    private final LlmForwardService llmForwardService;
    private final ApiKeyService apiKeyService;
    private final RequestLogService requestLogService;
    private final RoutingConfigParser routingConfigParser;

    @Autowired
    public LlmController(LlmForwardService llmForwardService,
                         ApiKeyService apiKeyService,
                         RequestLogService requestLogService,
                         RoutingConfigParser routingConfigParser) {
        this.llmForwardService = llmForwardService;
        this.apiKeyService = apiKeyService;
        this.requestLogService = requestLogService;
        this.routingConfigParser = routingConfigParser;
    }

    @PostMapping("/chat")
    public ResponseEntity<String> chat(
            HttpServletRequest httpRequest,
            @RequestBody ChatRequest request) {

        // 从 ApiKeyAuthenticationFilter 存入的属性中取 ApiKey
        ApiKey key = (ApiKey) httpRequest.getAttribute("apiKey");
        if (key == null) {
            return ResponseEntity.status(401).body("{\"error\": \"API key required\"}");
        }

        // 预估输入 token
        String messagesStr = request.getMessages() != null ? request.getMessages() : "";
        long estimatedInput = llmForwardService.estimateTokenUsage(messagesStr);

        // 配额检查
        if (!apiKeyService.hasEnoughTokens(key, estimatedInput)) {
            return ResponseEntity.status(429).body("{\"error\": \"Token quota exceeded\"}");
        }

        // 解析目标 URL 和模型名
        String targetUrl = routingConfigParser.resolveTargetUrl(key.getRoutingConfig(), key.getTargetUrl());
        String resolvedModel = routingConfigParser.resolveModel(key.getRoutingConfig(), request.getModel());

        // 转发请求并计时
        long startMs = System.currentTimeMillis();
        String response;
        RequestLog.RequestStatus status = RequestLog.RequestStatus.SUCCESS;
        try {
            response = llmForwardService.forwardChatRequest(
                    targetUrl,
                    resolvedModel,
                    messagesStr,
                    Boolean.TRUE.equals(request.getStream())
            );
        } catch (Exception e) {
            status = RequestLog.RequestStatus.FAIL;
            long latency = System.currentTimeMillis() - startMs;
            requestLogService.asyncLogRequest(key.getId(), estimatedInput, 0L,
                    resolvedModel, latency, status, messagesStr, e.getMessage());
            return ResponseEntity.status(502).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
        long latencyMs = System.currentTimeMillis() - startMs;

        // 估算输出 token
        long outputTokens = llmForwardService.estimateTokenUsage(response);
        long totalTokens = estimatedInput + outputTokens;

        // 异步：扣减 token + 更新 lastUsedAt
        requestLogService.asyncRecordUsage(key.getId(), totalTokens);

        // 异步：写入请求日志
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
        return ResponseEntity.ok(Map.of(
                "models", new String[]{"llama2", "mistral", "gemma", "qwen"}
        ));
    }
}
