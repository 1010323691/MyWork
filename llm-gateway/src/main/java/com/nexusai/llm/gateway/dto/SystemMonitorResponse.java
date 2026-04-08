package com.nexusai.llm.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemMonitorResponse {
    private Long totalRequests;
    private Long successRequests;
    private Long failRequests;
    private Long totalTokens;
    private Double errorRate;
    private Double avgLatencyMs;
    private Long totalUsers;
    private Long totalApiKeys;
}
