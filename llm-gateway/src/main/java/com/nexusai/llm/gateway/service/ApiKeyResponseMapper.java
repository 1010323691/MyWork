package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.dto.ApiKeyResponse;
import com.nexusai.llm.gateway.entity.ApiKey;
import org.springframework.stereotype.Component;

@Component
public class ApiKeyResponseMapper {

    public ApiKeyResponse toResponse(ApiKey apiKey) {
        return ApiKeyResponse.builder()
                .id(apiKey.getId())
                .userId(apiKey.getUser() != null ? apiKey.getUser().getId() : null)
                .username(apiKey.getUser() != null ? apiKey.getUser().getUsername() : null)
                .apiKeyValue(apiKey.getApiKeyValue())
                .name(apiKey.getName())
                .usedTokens(apiKey.getUsedTokens())
                .enabled(apiKey.getEnabled())
                .expiresAt(apiKey.getExpiresAt())
                .createdAt(apiKey.getCreatedAt())
                .lastUsedAt(apiKey.getLastUsedAt())
                .targetUrl(apiKey.getTargetUrl())
                .routingConfig(apiKey.getRoutingConfig())
                .build();
    }
}
