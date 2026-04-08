package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.DailyTokenStat;
import com.nexusai.llm.gateway.dto.RequestLogResponse;
import com.nexusai.llm.gateway.dto.UserStatsResponse;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.repository.RequestLogRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final RequestLogRepository requestLogRepository;
    private final ApiKeyRepository apiKeyRepository;

    public UserController(RequestLogRepository requestLogRepository, ApiKeyRepository apiKeyRepository) {
        this.requestLogRepository = requestLogRepository;
        this.apiKeyRepository = apiKeyRepository;
    }

    /**
     * 查询当前用户的请求日志（分页 + 可选过滤）
     */
    @GetMapping("/logs")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<RequestLogResponse>> getUserLogs(
            HttpServletRequest request,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long apiKeyId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String status) {

        Long userId = (Long) request.getAttribute("currentUserId");
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<RequestLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("apiKey").get("user").get("id"), userId));

            if (apiKeyId != null) {
                predicates.add(cb.equal(root.get("apiKey").get("id"), apiKeyId));
            }
            if (startDate != null && !startDate.isBlank()) {
                LocalDateTime start = LocalDate.parse(startDate).atStartOfDay();
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
            }
            if (endDate != null && !endDate.isBlank()) {
                LocalDateTime end = LocalDate.parse(endDate).plusDays(1).atStartOfDay();
                predicates.add(cb.lessThan(root.get("createdAt"), end));
            }
            if (status != null && !status.isBlank()) {
                try {
                    RequestLog.RequestStatus s = RequestLog.RequestStatus.valueOf(status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), s));
                } catch (IllegalArgumentException ignored) {}
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<RequestLogResponse> result = requestLogRepository.findAll(spec, pageable)
                .map(this::toResponse);
        return ResponseEntity.ok(result);
    }

    /**
     * 获取当前用户的统计数据
     */
    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<UserStatsResponse> getUserStats(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("currentUserId");
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);

        Long todayTokens = requestLogRepository.sumTokensByUserSince(userId, todayStart);
        Long monthTokens = requestLogRepository.sumTokensByUserSince(userId, monthStart);
        Long totalRequests = requestLogRepository.countByUserId(userId);
        Long successCount = requestLogRepository.countSuccessByUserId(userId);
        Long totalKeys = apiKeyRepository.countByUserId(userId);
        Long activeKeys = apiKeyRepository.countByUserIdAndEnabled(userId, true);

        double successRate = totalRequests > 0 ? (double) successCount / totalRequests * 100 : 0.0;

        // 最近7天每日 token 趋势
        List<Object[]> rawTrend = requestLogRepository.getDailyTrendByUser(userId, weekAgo);
        List<DailyTokenStat> dailyTrend = rawTrend.stream()
                .map(row -> new DailyTokenStat(
                        String.valueOf(row[0]),
                        ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        UserStatsResponse stats = UserStatsResponse.builder()
                .todayTokens(todayTokens != null ? todayTokens : 0L)
                .monthTokens(monthTokens != null ? monthTokens : 0L)
                .totalRequests(totalRequests != null ? totalRequests : 0L)
                .successRate(successRate)
                .activeKeys(activeKeys != null ? activeKeys : 0L)
                .totalKeys(totalKeys != null ? totalKeys : 0L)
                .dailyTrend(dailyTrend)
                .build();

        return ResponseEntity.ok(stats);
    }

    private RequestLogResponse toResponse(RequestLog log) {
        return RequestLogResponse.builder()
                .id(log.getId())
                .apiKeyId(log.getApiKey().getId())
                .apiKeyName(log.getApiKey().getName())
                .inputTokens(log.getInputTokens())
                .outputTokens(log.getOutputTokens())
                .modelName(log.getModelName())
                .latencyMs(log.getLatencyMs())
                .status(log.getStatus() != null ? log.getStatus().name() : null)
                .createdAt(log.getCreatedAt())
                .build();
    }
}
