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
import com.nexusai.llm.gateway.service.SystemService.GpuData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
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

    // ===== 用户管理 =====

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<AdminUserResponse>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String username) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<User> users;
        if (username != null && !username.isBlank()) {
            users = userRepository.findByUsernameContainingIgnoreCase(username, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }

        return ResponseEntity.ok(users.map(this::toUserResponse));
    }

    @PutMapping("/users/{id}/toggle")
    @Transactional
    public ResponseEntity<AdminUserResponse> toggleUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        user.setEnabled(!Boolean.TRUE.equals(user.getEnabled()));
        userRepository.save(user);
        return ResponseEntity.ok(toUserResponse(user));
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ===== API Key 管理 =====

    @PutMapping("/keys/{id}")
    @Transactional
    public ResponseEntity<ApiKeyResponse> updateKey(
            @PathVariable Long id,
            @RequestBody AdminKeyUpdateRequest req) {

        ApiKey key = apiKeyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("API Key not found: " + id));

        if (Boolean.TRUE.equals(req.getClearTokenLimit())) {
            key.setTokenLimit(null);
        } else if (req.getTokenLimit() != null) {
            key.setTokenLimit(req.getTokenLimit());
        }
        if (req.getUsedTokens() != null) key.setUsedTokens(req.getUsedTokens());
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
        if (req.getEnabled() != null) key.setEnabled(req.getEnabled());

        apiKeyRepository.save(key);
        return ResponseEntity.ok(toKeyResponse(key));
    }

    @PostMapping("/keys/{id}/reset-usage")
    @Transactional
    public ResponseEntity<ApiKeyResponse> resetKeyUsage(@PathVariable Long id) {
        ApiKey key = apiKeyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("API Key not found: " + id));
        key.setUsedTokens(0L);
        apiKeyRepository.save(key);
        return ResponseEntity.ok(toKeyResponse(key));
    }

    // ===== 系统监控 =====

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

        // 获取系统资源数据
        SystemService.SystemResourceData resourceData = systemService.getSystemResources();
        java.util.List<SystemService.GpuData> gpuDataList = resourceData.getGpuDataList();

        // 转换为响应格式
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
            ).collect(java.util.stream.Collectors.toList());
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
                // 系统资源字段
                .cpuUsage(resourceData.getCpuUsage())
                .memoryUsage(resourceData.getMemoryUsage())
                .gpus(gpuInfoList)
                .build();

        return ResponseEntity.ok(monitor);
    }

    // ===== 转换器 =====

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
                .tokenLimit(key.getTokenLimit())
                .usedTokens(key.getUsedTokens())
                .remainingTokens(key.getRemainingTokens())
                .enabled(key.getEnabled())
                .expiresAt(key.getExpiresAt())
                .createdAt(key.getCreatedAt())
                .lastUsedAt(key.getLastUsedAt())
                .targetUrl(key.getTargetUrl())
                .routingConfig(key.getRoutingConfig())
                .build();
    }
}
