package com.nexusai.llm.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKeyResponse {

    private Long id;
    private Long userId;
    private String username;
    @JsonProperty("key")
    private String apiKeyValue;
    private String name;
    private Long usedTokens;
    private Boolean enabled;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime lastUsedAt;
    private String targetUrl;
    private String routingConfig;
}
