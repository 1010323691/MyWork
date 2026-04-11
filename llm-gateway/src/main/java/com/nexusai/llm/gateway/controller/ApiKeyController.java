package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.ApiKeyRequest;
import com.nexusai.llm.gateway.dto.ApiKeyResponse;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.repository.UserRepository;
import com.nexusai.llm.gateway.security.ApiKeyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/apikeys", "/api/admin/apikeys"})
public class ApiKeyController {

    private final ApiKeyService apiKeyService;
    private final ApiKeyRepository apiKeyRepository;
    private final UserRepository userRepository;

    @Autowired
    public ApiKeyController(ApiKeyService apiKeyService,
                            ApiKeyRepository apiKeyRepository,
                            UserRepository userRepository) {
        this.apiKeyService = apiKeyService;
        this.apiKeyRepository = apiKeyRepository;
        this.userRepository = userRepository;
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
                .map(this::toResponse)
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

        ApiKey apiKey = apiKeyService.createApiKey(
                targetUserId,
                name
        );

        return ResponseEntity.ok(toResponse(apiKey));
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

        apiKey.setEnabled(!apiKey.getEnabled());
        apiKeyRepository.save(apiKey);

        return ResponseEntity.ok(toResponse(apiKey));
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

    private ApiKeyResponse toResponse(ApiKey apiKey) {
        return ApiKeyResponse.builder()
                .id(apiKey.getId())
                .userId(apiKey.getUser() != null ? apiKey.getUser().getId() : null)
                .username(apiKey.getUser() != null ? apiKey.getUser().getUsername() : null)
                .apiKeyValue(apiKey.getApiKeyValue())
                .name(apiKey.getName())
                .usedTokens(apiKey.getUsedTokens())
                .enabled(apiKey.getEnabled())
                .expiresAt(apiKey.getExpiresAt())
                .createdAt(apiKey.getCreatedAt())
                .lastUsedAt(apiKey.getLastUsedAt())
                .targetUrl(apiKey.getTargetUrl())
                .routingConfig(apiKey.getRoutingConfig())
                .build();
    }
}
