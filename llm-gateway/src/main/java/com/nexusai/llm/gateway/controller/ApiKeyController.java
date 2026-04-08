package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.ApiKeyRequest;
import com.nexusai.llm.gateway.dto.ApiKeyResponse;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.security.ApiKeyService;
import com.nexusai.llm.gateway.security.JwtService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/apikeys")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;
    private final ApiKeyRepository apiKeyRepository;
    private final JwtService jwtService;

    @Autowired
    public ApiKeyController(ApiKeyService apiKeyService, ApiKeyRepository apiKeyRepository, JwtService jwtService) {
        this.apiKeyService = apiKeyService;
        this.apiKeyRepository = apiKeyRepository;
        this.jwtService = jwtService;
    }

    /**
     * 获取 API Keys 列表
     * - ADMIN: 可以查看所有用户的 API Keys（通过查询参数过滤）
     * - USER: 只能查看自己的 API Keys
     */
    @GetMapping
    public ResponseEntity<List<ApiKeyResponse>> listApiKeys(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long userId) {

        Long currentUserId = getCurrentUserId(userDetails, request);
        boolean isAdmin = isAdmin(userDetails);

        // 检查是否是 ADMIN，如果是 ADMIN 且指定了 userId，则查询指定用户的 API Keys
        Long targetUserId = null;
        if (isAdmin && userId != null) {
            targetUserId = userId;
        } else {
            targetUserId = currentUserId;
        }

        List<ApiKey> apiKeys = apiKeyRepository.findByUserId(targetUserId);

        List<ApiKeyResponse> response = apiKeys.stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * 创建 API Key - 所有认证用户都可以创建自己的 API Key
     */
    @PostMapping
    public ResponseEntity<ApiKeyResponse> createApiKey(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ApiKeyRequest requestBody) {

        Long userId = getCurrentUserId(userDetails, request);

        ApiKey apiKey = apiKeyService.createApiKey(
                userId,
                requestBody.getName(),
                requestBody.getTokenLimit(),
                requestBody.getExpiresAtDays(),
                requestBody.getTargetUrl(),
                requestBody.getRoutingConfig()
        );

        return ResponseEntity.ok(toResponse(apiKey));
    }

    /**
     * 删除 API Key
     * - ADMIN: 可以删除任意用户的 API Key
     * - USER: 只能删除自己的 API Key
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApiKey(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {

        ApiKey apiKey = apiKeyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("API Key not found"));

        Long currentUserId = getCurrentUserId(userDetails, request);
        boolean isAdmin = isAdmin(userDetails);

        // 非 ADMIN 只能删除自己的 API Key
        if (!isAdmin && !apiKey.getUser().getId().equals(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        apiKeyRepository.delete(apiKey);
        return ResponseEntity.noContent().build();
    }

    /**
     * 启用/禁用 API Key
     * - ADMIN: 可以切换任意用户的 API Key 状态
     * - USER: 只能切换自己的 API Key 状态
     */
    @PutMapping("/{id}/toggle")
    public ResponseEntity<ApiKeyResponse> toggleApiKey(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {

        ApiKey apiKey = apiKeyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("API Key not found"));

        Long currentUserId = getCurrentUserId(userDetails, request);
        boolean isAdmin = isAdmin(userDetails);

        // 非 ADMIN 只能切换自己的 API Key
        if (!isAdmin && !apiKey.getUser().getId().equals(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        apiKey.setEnabled(!apiKey.getEnabled());
        apiKeyRepository.save(apiKey);

        return ResponseEntity.ok(toResponse(apiKey));
    }

    /**
     * 获取当前用户 ID
     * 优先从项目 User 实体获取，否则从 request 属性中获取（由 JWT Filter 设置）
     */
    private Long getCurrentUserId(UserDetails userDetails, HttpServletRequest request) {
        // 如果用户详情是项目 User 实体，直接获取 ID
        if (userDetails instanceof User) {
            return ((User) userDetails).getId();
        }
        // 否则从 request 属性中获取（由 JWT Filter 设置）
        return (Long) request.getAttribute("currentUserId");
    }

    /**
     * 判断当前用户是否是 ADMIN
     */
    private boolean isAdmin(UserDetails userDetails) {
        return userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private ApiKeyResponse toResponse(ApiKey apiKey) {
        return ApiKeyResponse.builder()
                .id(apiKey.getId())
                .apiKeyValue(apiKey.getApiKeyValue())
                .name(apiKey.getName())
                .tokenLimit(apiKey.getTokenLimit())
                .usedTokens(apiKey.getUsedTokens())
                .remainingTokens(apiKey.getRemainingTokens())
                .enabled(apiKey.getEnabled())
                .expiresAt(apiKey.getExpiresAt())
                .createdAt(apiKey.getCreatedAt())
                .lastUsedAt(apiKey.getLastUsedAt())
                .targetUrl(apiKey.getTargetUrl())
                .routingConfig(apiKey.getRoutingConfig())
                .build();
    }
}
