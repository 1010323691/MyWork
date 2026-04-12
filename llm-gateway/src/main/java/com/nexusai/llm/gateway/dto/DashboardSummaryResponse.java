package com.nexusai.llm.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse {
    private String role;
    private RevenueMetrics revenue;
    private UsageMetrics usage;
    private AudienceMetrics audience;
    private QualityMetrics quality;
    private ResourceMetrics resources;
    private List<TrendPoint> dailyTrend;
    private List<ModelMetric> modelMetrics;
    private List<NameValueMetric> requestStatusDistribution;
    private List<NameValueMetric> apiKeyStatusDistribution;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueMetrics {
        private BigDecimal todayRevenue;
        private BigDecimal monthRevenue;
        private BigDecimal totalRevenue;
        private BigDecimal avgCostPerRequest;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageMetrics {
        private Long todayTokens;
        private Long monthTokens;
        private Long todayCachedTokens;
        private Long monthCachedTokens;
        private Double todayCacheHitRate;
        private Double monthCacheHitRate;
        private Long todayRequests;
        private Long totalRequests;
        private Double avgTokensPerRequest;
        private Long activeModels30d;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AudienceMetrics {
        private Long totalUsers;
        private Long newUsersToday;
        private Long totalApiKeys;
        private Long activeApiKeys;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QualityMetrics {
        private Double successRate;
        private Double errorRate;
        private Double avgLatencyMs;
        private Long p95LatencyMs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceMetrics {
        private Double cpuUsage;
        private Double memoryUsage;
        private Integer gpuCount;
        private Double avgGpuUsage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private String date;
        private Long requests;
        private Long tokens;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModelMetric {
        private String name;
        private Long requests;
        private Long tokens;
        private Double avgLatencyMs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NameValueMetric {
        private String name;
        private Long value;
    }
}
