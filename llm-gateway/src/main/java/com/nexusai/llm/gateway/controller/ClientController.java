package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.TokenUsageResponse;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.security.ApiKeyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ApiKeyService apiKeyService;

    @Autowired
    public ClientController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @GetMapping("/token-usage")
    public ResponseEntity<TokenUsageResponse> getTokenUsage(@RequestHeader("X-API-Key") String apiKey) {
        var apiKeyOpt = apiKeyService.findByKey(apiKey);

        if (apiKeyOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ApiKey key = apiKeyOpt.get();

        TokenUsageResponse response = TokenUsageResponse.builder()
                .totalTokens(key.getTokenLimit())
                .usedTokens(key.getUsedTokens())
                .remainingTokens(key.getRemainingTokens())
                .apiKeyName(key.getName())
                .hasLimit(key.getTokenLimit() != null)
                .build();

        return ResponseEntity.ok(response);
    }
}
