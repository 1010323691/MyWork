package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.DailyTokenStat;
import com.nexusai.llm.gateway.dto.RequestLogResponse;
import com.nexusai.llm.gateway.dto.UserStatsResponse;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.repository.RequestLogRepository;
import com.nexusai.llm.gateway.service.LogQueryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final LogQueryService logQueryService;
    private final RequestLogRepository requestLogRepository;
    private final ApiKeyRepository apiKeyRepository;

    public UserController(LogQueryService logQueryService,
                          RequestLogRepository requestLogRepository,
                          ApiKeyRepository apiKeyRepository) {
        this.logQueryService = logQueryService;
        this.requestLogRepository = requestLogRepository;
        this.apiKeyRepository = apiKeyRepository;
    }

    @GetMapping("/logs")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<RequestLogResponse>> getUserLogs(
            HttpServletRequest request,
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(name = "userId", required = false) Long filterUserId,
            @RequestParam(required = false) Long apiKeyId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String status) {

        Long userId = getCurrentUserId(request, authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(logQueryService.getUserLogs(
                userId, page, size, filterUserId, apiKeyId, startDate, endDate, status));
    }

    @GetMapping("/logs/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<RequestLogResponse> getLogDetail(
            HttpServletRequest request,
            Authentication authentication,
            @PathVariable Long id) {

        Long userId = getCurrentUserId(request, authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(logQueryService.getUserLogDetail(userId, id));
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<UserStatsResponse> getUserStats(
            HttpServletRequest request,
            Authentication authentication) {
        Long userId = getCurrentUserId(request, authentication);
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

    private Long getCurrentUserId(HttpServletRequest request, Authentication authentication) {
        ApiKey apiKey = (ApiKey) request.getAttribute("apiKey");
        if (apiKey != null) {
            return apiKey.getUser().getId();
        }

        if (authentication != null && authentication.getPrincipal() instanceof User) {
            return ((User) authentication.getPrincipal()).getId();
        }

        return null;
    }
}
