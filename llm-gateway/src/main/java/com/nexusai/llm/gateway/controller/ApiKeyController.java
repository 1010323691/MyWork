package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.ApiKeyRequest;
import com.nexusai.llm.gateway.dto.ApiKeyResponse;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.repository.UserRepository;
import com.nexusai.llm.gateway.security.ApiKeyService;
import com.nexusai.llm.gateway.service.ApiKeyResponseMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/apikeys", "/api/admin/apikeys"})
@Slf4j
public class ApiKeyController {

    private final ApiKeyService apiKeyService;
    private final ApiKeyRepository apiKeyRepository;
    private final UserRepository userRepository;
    private final ApiKeyResponseMapper apiKeyResponseMapper;

    @Autowired
    public ApiKeyController(ApiKeyService apiKeyService,
                            ApiKeyRepository apiKeyRepository,
                            UserRepository userRepository,
                            ApiKeyResponseMapper apiKeyResponseMapper) {
        this.apiKeyService = apiKeyService;
        this.apiKeyRepository = apiKeyRepository;
        this.userRepository = userRepository;
        this.apiKeyResponseMapper = apiKeyResponseMapper;
    }

    @GetMapping
    public ResponseEntity<List<ApiKeyResponse>> listApiKeys(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long userId) {

        Long currentUserId = getCurrentUserId(userDetails, request);
        boolean isAdmin = isAdmin(userDetails);

        List<ApiKey> apiKeys;
        if (isAdmin) {
            apiKeys = userId != null
                    ? apiKeyRepository.findByUserIdOrderByCreatedAtDesc(userId)
                    : apiKeyRepository.findAllByOrderByCreatedAtDesc();
        } else {
            apiKeys = apiKeyRepository.findByUserIdOrderByCreatedAtDesc(currentUserId);
        }

        List<ApiKeyResponse> response = apiKeys.stream()
                .map(apiKeyResponseMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createApiKey(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long userId,
            @RequestBody ApiKeyRequest requestBody) {

        Long currentUserId = getCurrentUserId(userDetails, request);
        boolean isAdmin = isAdmin(userDetails);

        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }

        String name = requestBody != null && requestBody.getName() != null
                ? requestBody.getName().trim()
                : "";
        if (name.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Key name is required"));
        }

        Long targetUserId = (isAdmin && userId != null) ? userId : currentUserId;

        if (targetUserId == null || !userRepository.existsById(targetUserId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "User not found: " + targetUserId));
        }

        ApiKey apiKey = apiKeyService.createApiKey(targetUserId, name);
        log.info("audit_api_key_create | actorUserId={} | admin={} | apiKeyId={} | ownerUserId={} | keyName={} | enabled={} | usedTokens={} | targetUrlSet={} | routingConfigSet={}",
                currentUserId,
                isAdmin,
                apiKey.getId(),
                ownerUserId(apiKey),
                sanitize(apiKey.getName()),
                Boolean.TRUE.equals(apiKey.getEnabled()),
                defaultLong(apiKey.getUsedTokens()),
                hasText(apiKey.getTargetUrl()),
                hasText(apiKey.getRoutingConfig()));

        return ResponseEntity.ok(apiKeyResponseMapper.toResponse(apiKey));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApiKey(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {

        ApiKey apiKey = apiKeyRepository.findWithUserById(id)
                .orElseThrow(() -> new RuntimeException("API Key not found"));

        Long currentUserId = getCurrentUserId(userDetails, request);
        boolean isAdmin = isAdmin(userDetails);

        if (!isAdmin && !apiKey.getUser().getId().equals(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        log.info("audit_api_key_delete | actorUserId={} | admin={} | apiKeyId={} | ownerUserId={} | keyName={} | enabled={} | usedTokens={} | targetUrlSet={} | routingConfigSet={}",
                currentUserId,
                isAdmin,
                apiKey.getId(),
                ownerUserId(apiKey),
                sanitize(apiKey.getName()),
                Boolean.TRUE.equals(apiKey.getEnabled()),
                defaultLong(apiKey.getUsedTokens()),
                hasText(apiKey.getTargetUrl()),
                hasText(apiKey.getRoutingConfig()));
        apiKeyRepository.delete(apiKey);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<ApiKeyResponse> toggleApiKey(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {

        ApiKey apiKey = apiKeyRepository.findWithUserById(id)
                .orElseThrow(() -> new RuntimeException("API Key not found"));

        Long currentUserId = getCurrentUserId(userDetails, request);
        boolean isAdmin = isAdmin(userDetails);

        if (!isAdmin && !apiKey.getUser().getId().equals(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        boolean previousEnabled = Boolean.TRUE.equals(apiKey.getEnabled());
        apiKey.setEnabled(!previousEnabled);
        apiKeyRepository.save(apiKey);
        log.info("audit_api_key_toggle | actorUserId={} | admin={} | apiKeyId={} | ownerUserId={} | keyName={} | enabledBefore={} | enabledAfter={}",
                currentUserId,
                isAdmin,
                apiKey.getId(),
                ownerUserId(apiKey),
                sanitize(apiKey.getName()),
                previousEnabled,
                Boolean.TRUE.equals(apiKey.getEnabled()));

        return ResponseEntity.ok(apiKeyResponseMapper.toResponse(apiKey));
    }

    private Long getCurrentUserId(UserDetails userDetails, HttpServletRequest request) {
        if (userDetails instanceof User) {
            return ((User) userDetails).getId();
        }

        ApiKey apiKey = (ApiKey) request.getAttribute("apiKey");
        if (apiKey != null) {
            return apiKey.getUser().getId();
        }
        return null;
    }

    private boolean isAdmin(UserDetails userDetails) {
        if (userDetails == null) {
            return false;
        }
        return userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private Long ownerUserId(ApiKey apiKey) {
        return apiKey.getUser() != null ? apiKey.getUser().getId() : null;
    }

    private long defaultLong(Long value) {
        return value != null ? value : 0L;
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
}
