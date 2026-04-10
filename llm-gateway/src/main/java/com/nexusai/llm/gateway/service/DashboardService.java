package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.dto.DashboardSummaryResponse;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.repository.RequestLogRepository;
import com.nexusai.llm.gateway.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final RequestLogRepository requestLogRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final UserRepository userRepository;
    private final SystemService systemService;

    public DashboardService(RequestLogRepository requestLogRepository,
                            ApiKeyRepository apiKeyRepository,
                            UserRepository userRepository,
                            SystemService systemService) {
        this.requestLogRepository = requestLogRepository;
        this.apiKeyRepository = apiKeyRepository;
        this.userRepository = userRepository;
        this.systemService = systemService;
    }

    public DashboardSummaryResponse getSummary(Long userId, boolean isAdmin) {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime trendStart = today.minusDays(6).atStartOfDay();
        LocalDateTime recentWindowStart = LocalDateTime.now().minusDays(30);

        long todayRequests = safeLong(isAdmin
                ? requestLogRepository.countSince(todayStart)
                : requestLogRepository.countByUserIdSince(userId, todayStart));
        long totalRequests = safeLong(isAdmin
                ? requestLogRepository.count()
                : requestLogRepository.countByUserId(userId));
        long successRequests = safeLong(isAdmin
                ? requestLogRepository.countSuccess()
                : requestLogRepository.countSuccessByUserId(userId));
        long todayTokens = safeLong(isAdmin
                ? requestLogRepository.sumTokensSince(todayStart)
                : requestLogRepository.sumTokensByUserSince(userId, todayStart));
        long monthTokens = safeLong(isAdmin
                ? requestLogRepository.sumTokensSince(monthStart)
                : requestLogRepository.sumTokensByUserSince(userId, monthStart));
        long totalTokens = safeLong(isAdmin
                ? requestLogRepository.sumAllTokens()
                : requestLogRepository.sumTokensByUserSince(userId, LocalDate.of(1970, 1, 1).atStartOfDay()));

        BigDecimal todayRevenue = safeMoney(isAdmin
                ? requestLogRepository.sumCostSince(todayStart)
                : requestLogRepository.sumCostByUserSince(userId, todayStart));
        BigDecimal monthRevenue = safeMoney(isAdmin
                ? requestLogRepository.sumCostSince(monthStart)
                : requestLogRepository.sumCostByUserSince(userId, monthStart));
        BigDecimal totalRevenue = safeMoney(isAdmin
                ? requestLogRepository.sumCostSince(LocalDate.of(1970, 1, 1).atStartOfDay())
                : requestLogRepository.sumCostByUserSince(userId, LocalDate.of(1970, 1, 1).atStartOfDay()));

        double successRate = totalRequests > 0 ? round2((double) successRequests * 100 / totalRequests) : 0.0;
        double errorRate = round2(Math.max(0.0, 100.0 - successRate));
        Double avgLatency = isAdmin
                ? requestLogRepository.avgLatencySince(monthStart)
                : requestLogRepository.avgLatencyByUserSince(userId, monthStart);
        long p95Latency = calculateP95(isAdmin
                ? requestLogRepository.findLatenciesSince(monthStart)
                : requestLogRepository.findLatenciesByUserSince(userId, monthStart));

        long totalApiKeys = safeLong(isAdmin
                ? apiKeyRepository.count()
                : apiKeyRepository.countByUserId(userId));
        long activeApiKeys = safeLong(isAdmin
                ? apiKeyRepository.countByEnabled(true)
                : apiKeyRepository.countByUserIdAndEnabled(userId, true));
        long activeModels = safeLong(isAdmin
                ? requestLogRepository.countDistinctModelsSince(recentWindowStart)
                : requestLogRepository.countDistinctModelsByUserSince(userId, recentWindowStart));

        DashboardSummaryResponse.AudienceMetrics audience = DashboardSummaryResponse.AudienceMetrics.builder()
                .totalUsers(isAdmin ? userRepository.count() : null)
                .newUsersToday(isAdmin ? safeLong(userRepository.countByCreatedAtGreaterThanEqual(todayStart)) : null)
                .totalApiKeys(totalApiKeys)
                .activeApiKeys(activeApiKeys)
                .build();

        SystemService.SystemResourceData resources = systemService.getSystemResources();
        double avgGpuUsage = resources.getGpuDataList() == null || resources.getGpuDataList().isEmpty()
                ? 0.0
                : round2(resources.getGpuDataList().stream()
                .filter(gpu -> gpu.getUtilization() != null)
                .mapToDouble(SystemService.GpuData::getUtilization)
                .average()
                .orElse(0.0));

        return DashboardSummaryResponse.builder()
                .role(isAdmin ? "ADMIN" : "USER")
                .revenue(DashboardSummaryResponse.RevenueMetrics.builder()
                        .todayRevenue(todayRevenue)
                        .monthRevenue(monthRevenue)
                        .totalRevenue(totalRevenue)
                        .avgCostPerRequest(totalRequests > 0
                                ? totalRevenue.divide(BigDecimal.valueOf(totalRequests), 4, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO)
                        .build())
                .usage(DashboardSummaryResponse.UsageMetrics.builder()
                        .todayTokens(todayTokens)
                        .monthTokens(monthTokens)
                        .todayRequests(todayRequests)
                        .totalRequests(totalRequests)
                        .avgTokensPerRequest(totalRequests > 0 ? round2((double) totalTokens / totalRequests) : 0.0)
                        .activeModels30d(activeModels)
                        .build())
                .audience(audience)
                .quality(DashboardSummaryResponse.QualityMetrics.builder()
                        .successRate(successRate)
                        .errorRate(errorRate)
                        .avgLatencyMs(round2(avgLatency))
                        .p95LatencyMs(p95Latency)
                        .build())
                .resources(DashboardSummaryResponse.ResourceMetrics.builder()
                        .cpuUsage(round2(resources.getCpuUsage()))
                        .memoryUsage(round2(resources.getMemoryUsage()))
                        .gpuCount(resources.getGpuDataList() != null ? resources.getGpuDataList().size() : 0)
                        .avgGpuUsage(avgGpuUsage)
                        .build())
                .dailyTrend(buildTrend(isAdmin, userId, trendStart))
                .modelMetrics(buildModelMetrics(isAdmin, userId, recentWindowStart))
                .requestStatusDistribution(buildRequestStatus(totalRequests, successRequests))
                .apiKeyStatusDistribution(buildApiKeyStatus(totalApiKeys, activeApiKeys))
                .build();
    }

    private List<DashboardSummaryResponse.TrendPoint> buildTrend(boolean isAdmin, Long userId, LocalDateTime trendStart) {
        List<Object[]> raw = isAdmin
                ? requestLogRepository.getDailySummarySince(trendStart)
                : requestLogRepository.getDailySummaryByUserSince(userId, trendStart);

        Map<String, Object[]> indexed = raw.stream()
                .collect(Collectors.toMap(row -> String.valueOf(row[0]), row -> row, (left, right) -> right));

        List<DashboardSummaryResponse.TrendPoint> points = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            String date = LocalDate.now().minusDays(6L - i).toString();
            Object[] row = indexed.get(date);
            points.add(DashboardSummaryResponse.TrendPoint.builder()
                    .date(date)
                    .requests(row == null ? 0L : toLong(row[1]))
                    .tokens(row == null ? 0L : toLong(row[2]))
                    .revenue(row == null ? BigDecimal.ZERO : toBigDecimal(row[3]))
                    .build());
        }
        return points;
    }

    private List<DashboardSummaryResponse.ModelMetric> buildModelMetrics(boolean isAdmin, Long userId, LocalDateTime since) {
        List<Object[]> raw = isAdmin
                ? requestLogRepository.getModelSummarySince(since)
                : requestLogRepository.getModelSummaryByUserSince(userId, since);

        return raw.stream()
                .limit(6)
                .map(row -> DashboardSummaryResponse.ModelMetric.builder()
                        .name(String.valueOf(row[0]))
                        .requests(toLong(row[1]))
                        .tokens(toLong(row[2]))
                        .avgLatencyMs(round2(toDouble(row[3])))
                        .build())
                .collect(Collectors.toList());
    }

    private List<DashboardSummaryResponse.NameValueMetric> buildRequestStatus(long totalRequests, long successRequests) {
        long failRequests = Math.max(0L, totalRequests - successRequests);
        List<DashboardSummaryResponse.NameValueMetric> items = new ArrayList<>();
        items.add(new DashboardSummaryResponse.NameValueMetric("成功", successRequests));
        items.add(new DashboardSummaryResponse.NameValueMetric("失败", failRequests));
        return items;
    }

    private List<DashboardSummaryResponse.NameValueMetric> buildApiKeyStatus(long totalApiKeys, long activeApiKeys) {
        long disabled = Math.max(0L, totalApiKeys - activeApiKeys);
        List<DashboardSummaryResponse.NameValueMetric> items = new ArrayList<>();
        items.add(new DashboardSummaryResponse.NameValueMetric("启用中", activeApiKeys));
        items.add(new DashboardSummaryResponse.NameValueMetric("已停用", disabled));
        return items;
    }

    private long calculateP95(List<Long> latencies) {
        if (latencies == null || latencies.isEmpty()) {
            return 0L;
        }
        List<Long> sorted = latencies.stream()
                .filter(value -> value != null && value >= 0)
                .sorted(Comparator.naturalOrder())
                .collect(Collectors.toList());
        if (sorted.isEmpty()) {
            return 0L;
        }
        int index = (int) Math.ceil(sorted.size() * 0.95) - 1;
        index = Math.max(0, Math.min(index, sorted.size() - 1));
        return sorted.get(index);
    }

    private long safeLong(Long value) {
        return value != null ? value : 0L;
    }

    private BigDecimal safeMoney(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private double round2(Double value) {
        return round2(value == null ? 0.0 : value);
    }

    private double round2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private double toDouble(Object value) {
        return value == null ? 0.0 : ((Number) value).doubleValue();
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(String.valueOf(value));
    }
}
