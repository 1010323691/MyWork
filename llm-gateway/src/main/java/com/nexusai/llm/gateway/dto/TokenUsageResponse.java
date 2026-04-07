package com.nexusai.llm.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenUsageResponse {

    private Long totalTokens;
    private Long usedTokens;
    private Long remainingTokens;
    private String apiKeyName;
    private Boolean hasLimit;
}
