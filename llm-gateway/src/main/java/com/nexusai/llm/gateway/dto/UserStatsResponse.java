package com.nexusai.llm.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsResponse {
    private Long todayTokens;
    private Long monthTokens;
    private Long totalRequests;
    private Double successRate;
    private Long activeKeys;
    private Long totalKeys;
    private List<DailyTokenStat> dailyTrend;
}
