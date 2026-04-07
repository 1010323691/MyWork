package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.ChatRequest;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.service.LlmForwardService;
import com.nexusai.llm.gateway.security.ApiKeyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/llm")
public class LlmController {

    private final LlmForwardService llmForwardService;
    private final ApiKeyService apiKeyService;

    @Autowired
    public LlmController(LlmForwardService llmForwardService, ApiKeyService apiKeyService) {
        this.llmForwardService = llmForwardService;
        this.apiKeyService = apiKeyService;
    }

    @PostMapping("/chat")
    public ResponseEntity<String> chat(
            @RequestHeader("X-API-Key") String apiKey,
            @RequestBody ChatRequest request) {

        var apiKeyOpt = apiKeyService.findByKey(apiKey);
        if (apiKeyOpt.isEmpty()) {
            return ResponseEntity.status(401).body("{\"error\": \"Invalid API key\"}");
        }

        ApiKey key = apiKeyOpt.get();

        if (!Boolean.TRUE.equals(key.getEnabled())) {
            return ResponseEntity.status(403).body("{\"error\": \"API key is disabled\"}");
        }

        String backendUrl = request.getBackendUrl();
        if (backendUrl == null || backendUrl.isBlank()) {
            backendUrl = "http://localhost:11434"; // 默认 Ollama
        }

        String response = llmForwardService.forwardChatRequest(
                backendUrl,
                request.getModel(),
                request.getMessages(),
                request.getStream() != null && request.getStream()
        );

        // 这里可以记录 token 使用情况
        // llmForwardService.recordUsage(key, estimatedTokens);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/models")
    public ResponseEntity<Map<String, Object>> listModels(@RequestHeader("X-API-Key") String apiKey) {
        var apiKeyOpt = apiKeyService.findByKey(apiKey);
        if (apiKeyOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid API key"));
        }

        // 返回支持的模型列表
        return ResponseEntity.ok(Map.of(
                "models", new String[]{"llama2", "mistral", "gemma", "qwen"}
        ));
    }
}
