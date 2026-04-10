package com.nexusai.llm.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestLogResponse {
    private Long id;
    private String requestId;
    private Long userId;
    private Long apiKeyId;
    private String apiKeyName;
    private Long inputTokens;
    private Long outputTokens;
    private String modelName;
    private Long latencyMs;
    private BigDecimal costAmount;
    private String status;
    private LocalDateTime createdAt;
}
