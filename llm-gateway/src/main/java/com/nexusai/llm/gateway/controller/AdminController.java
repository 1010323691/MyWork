package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.AdminKeyUpdateRequest;
import com.nexusai.llm.gateway.dto.AdminUserResponse;
import com.nexusai.llm.gateway.dto.ApiKeyResponse;
import com.nexusai.llm.gateway.dto.SystemMonitorResponse;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.repository.RequestLogRepository;
import com.nexusai.llm.gateway.repository.UserRepository;
import com.nexusai.llm.gateway.service.SystemService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Objects;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminController {

    private final UserRepository userRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final RequestLogRepository requestLogRepository;
    private final SystemService systemService;

    public AdminController(UserRepository userRepository,
                           ApiKeyRepository apiKeyRepository,
                           RequestLogRepository requestLogRepository,
                           SystemService systemService) {
        this.userRepository = userRepository;
        this.apiKeyRepository = apiKeyRepository;
        this.requestLogRepository = requestLogRepository;
        this.systemService = systemService;
    }

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<AdminUserResponse>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String username) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<User> users = userRepository.searchUsers(userId, username, pageable);
        return ResponseEntity.ok(users.map(this::toUserResponse));
    }

    @PutMapping("/users/{id}/toggle")
    @Transactional
    public ResponseEntity<AdminUserResponse> toggleUser(Authentication authentication, @PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));

        boolean previousEnabled = Boolean.TRUE.equals(user.getEnabled());
        user.setEnabled(!previousEnabled);
        userRepository.save(user);
        log.info("audit_user_toggle | actor={} | userId={} | username={} | role={} | enabledBefore={} | enabledAfter={}",
                actor(authentication),
                user.getId(),
                sanitize(user.getUsername()),
                sanitize(user.getUserRole()),
                previousEnabled,
                Boolean.TRUE.equals(user.getEnabled()));
        return ResponseEntity.ok(toUserResponse(user));
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Void> deleteUser(Authentication authentication, @PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        Long keyCount = apiKeyRepository.countByUserId(id);
        log.info("audit_user_delete | actor={} | userId={} | username={} | role={} | enabled={} | keyCount={} | balance={}",
                actor(authentication),
                user.getId(),
                sanitize(user.getUsername()),
                sanitize(user.getUserRole()),
                Boolean.TRUE.equals(user.getEnabled()),
                keyCount != null ? keyCount : 0L,
                user.getBalance());
        requestLogRepository.deleteByUserId(id);
        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/keys/{id}")
    @Transactional
    public ResponseEntity<ApiKeyResponse> updateKey(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody AdminKeyUpdateRequest req) {

        ApiKey key = apiKeyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("API Key not found: " + id));

        Boolean previousEnabled = key.getEnabled();
        String previousTargetUrl = key.getTargetUrl();
        String previousRoutingConfig = key.getRoutingConfig();

        if (Boolean.TRUE.equals(req.getClearTargetUrl())) {
            key.setTargetUrl(null);
        } else if (req.getTargetUrl() != null) {
            key.setTargetUrl(req.getTargetUrl());
        }
        if (Boolean.TRUE.equals(req.getClearRoutingConfig())) {
            key.setRoutingConfig(null);
        } else if (req.getRoutingConfig() != null) {
            key.setRoutingConfig(req.getRoutingConfig());
        }
        if (req.getEnabled() != null) {
            key.setEnabled(req.getEnabled());
        }

        apiKeyRepository.save(key);
        log.info("audit_api_key_update | actor={} | apiKeyId={} | ownerUserId={} | keyName={} | enabled={} | enabledChanged={} | targetUrlSet={} | targetUrlChanged={} | routingConfigSet={} | routingConfigChanged={}",
                actor(authentication),
                key.getId(),
                key.getUser() != null ? key.getUser().getId() : null,
                sanitize(key.getName()),
                Boolean.TRUE.equals(key.getEnabled()),
                !Objects.equals(previousEnabled, key.getEnabled()),
                hasText(key.getTargetUrl()),
                !Objects.equals(previousTargetUrl, key.getTargetUrl()),
                hasText(key.getRoutingConfig()),
                !Objects.equals(previousRoutingConfig, key.getRoutingConfig()));
        return ResponseEntity.ok(toKeyResponse(key));
    }

    @GetMapping("/monitor")
    @Transactional(readOnly = true)
    public ResponseEntity<SystemMonitorResponse> getMonitorStats() {
        Long successCount = requestLogRepository.countSuccess();
        Long failCount = requestLogRepository.countFail();
        Long totalRequests = (successCount != null ? successCount : 0L) + (failCount != null ? failCount : 0L);
        Long totalTokens = requestLogRepository.sumAllTokens();
        Double avgLatency = requestLogRepository.avgLatencySince(LocalDateTime.now().minusDays(1));
        Long totalUsers = userRepository.count();
        Long totalApiKeys = apiKeyRepository.count();

        double errorRate = totalRequests > 0
                ? (double) (failCount != null ? failCount : 0L) / totalRequests * 100
                : 0.0;

        SystemService.SystemResourceData resourceData = systemService.getSystemResources();
        java.util.List<SystemService.GpuData> gpuDataList = resourceData.getGpuDataList();

        java.util.List<SystemMonitorResponse.GpuInfo> gpuInfoList = null;
        if (gpuDataList != null && !gpuDataList.isEmpty()) {
            gpuInfoList = gpuDataList.stream().map(gpu ->
                SystemMonitorResponse.GpuInfo.builder()
                    .index(gpu.getIndex())
                    .name(gpu.getName())
                    .utilization(gpu.getUtilization())
                    .memoryUsedMb(gpu.getUsedMemoryMb())
                    .memoryTotalMb(gpu.getTotalMemoryMb())
                    .memoryUsagePercent(gpu.getMemoryUsagePercent())
                    .build()
            ).toList();
        }

        SystemMonitorResponse monitor = SystemMonitorResponse.builder()
                .totalRequests(totalRequests)
                .successRequests(successCount != null ? successCount : 0L)
                .failRequests(failCount != null ? failCount : 0L)
                .totalTokens(totalTokens != null ? totalTokens : 0L)
                .errorRate(errorRate)
                .avgLatencyMs(avgLatency != null ? avgLatency : 0.0)
                .totalUsers(totalUsers)
                .totalApiKeys(totalApiKeys)
                .cpuUsage(resourceData.getCpuUsage())
                .memoryUsage(resourceData.getMemoryUsage())
                .gpus(gpuInfoList)
                .build();

        return ResponseEntity.ok(monitor);
    }

    private String actor(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return "unknown";
        }
        return sanitize(authentication.getName());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace('|', '/').replaceAll("[\\r\\n]+", " ").trim();
    }

    private AdminUserResponse toUserResponse(User user) {
        Long keyCount = apiKeyRepository.countByUserId(user.getId());
        Long usedTokens = apiKeyRepository.sumUsedTokensByUserId(user.getId());
        return AdminUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .enabled(user.getEnabled())
                .userRole(user.getUserRole() != null ? user.getUserRole() : "USER")
                .apiKeyCount(keyCount != null ? keyCount : 0L)
                .totalUsedTokens(usedTokens != null ? usedTokens : 0L)
                .balance(user.getBalance())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private ApiKeyResponse toKeyResponse(ApiKey key) {
        return ApiKeyResponse.builder()
                .id(key.getId())
                .userId(key.getUser() != null ? key.getUser().getId() : null)
                .username(key.getUser() != null ? key.getUser().getUsername() : null)
                .apiKeyValue(key.getApiKeyValue())
                .name(key.getName())
                .usedTokens(key.getUsedTokens())
                .enabled(key.getEnabled())
                .expiresAt(key.getExpiresAt())
                .createdAt(key.getCreatedAt())
                .lastUsedAt(key.getLastUsedAt())
                .targetUrl(key.getTargetUrl())
                .routingConfig(key.getRoutingConfig())
                .build();
    }
}
