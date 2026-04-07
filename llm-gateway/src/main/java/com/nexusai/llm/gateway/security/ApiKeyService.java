package com.nexusai.llm.gateway.security;

import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

@Service
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    public ApiKeyService(ApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    public Optional<ApiKey> findByKey(String apiKeyValue) {
        return apiKeyRepository.findByApiKeyValue(apiKeyValue);
    }

    public Optional<ApiKey> findByKeyNoCache(String apiKeyValue) {
        return apiKeyRepository.findByApiKeyValue(apiKeyValue);
    }

    @Transactional
    public ApiKey createApiKey(Long userId, String name, Long tokenLimit, Long expiresAtDays) {
        String key = generateKey();
        java.time.LocalDateTime expiresAt = null;
        if (expiresAtDays != null && expiresAtDays > 0) {
            expiresAt = java.time.LocalDateTime.now().plusDays(expiresAtDays);
        }

        com.nexusai.llm.gateway.entity.User user = new com.nexusai.llm.gateway.entity.User();
        user.setId(userId);

        ApiKey apiKey = ApiKey.builder()
                .user(user)
                .apiKeyValue(key)
                .name(name)
                .tokenLimit(tokenLimit)
                .usedTokens(0L)
                .expiresAt(expiresAt)
                .enabled(true)
                .build();

        return apiKeyRepository.save(apiKey);
    }

    private String generateKey() {
        byte[] randomBytes = new byte[32];
        RANDOM.nextBytes(randomBytes);
        return "nkey_" + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public boolean hasEnoughTokens(ApiKey apiKey, long requiredTokens) {
        if (apiKey.getTokenLimit() == null) {
            return true; // 无限制
        }
        return apiKey.getRemainingTokens() >= requiredTokens;
    }

    @Transactional
    public void recordUsage(ApiKey apiKey, long tokensUsed) {
        apiKey.useTokens(tokensUsed);
    }
}
