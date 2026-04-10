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
public class SystemMonitorResponse {
    private Long totalRequests;
    private Long successRequests;
    private Long failRequests;
    private Long totalTokens;
    private Double errorRate;
    private Double avgLatencyMs;
    private Long totalUsers;
    private Long totalApiKeys;

    private Double cpuUsage;
    private Double memoryUsage;
    private List<GpuInfo> gpus;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GpuInfo {
        private int index;
        private String name;
        private Double utilization;
        private Long memoryUsedMb;
        private Long memoryTotalMb;
        private Double memoryUsagePercent;

        public Double getMemoryUsagePercent() {
            if (memoryUsagePercent != null) {
                return memoryUsagePercent;
            }
            if (memoryTotalMb == null || memoryTotalMb == 0 || memoryUsedMb == null) {
                return null;
            }
            return Math.round((double) memoryUsedMb / memoryTotalMb * 1000) / 10.0;
        }
    }
}
