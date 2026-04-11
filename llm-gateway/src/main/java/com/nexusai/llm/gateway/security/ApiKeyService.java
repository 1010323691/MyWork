package com.nexusai.llm.gateway.security;

import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

@Service
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final UserRepository userRepository;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    public ApiKeyService(ApiKeyRepository apiKeyRepository, UserRepository userRepository) {
        this.apiKeyRepository = apiKeyRepository;
        this.userRepository = userRepository;
    }

    public Optional<ApiKey> findByKey(String apiKeyValue) {
        return apiKeyRepository.findByApiKeyValue(apiKeyValue);
    }

    public Optional<ApiKey> findByKeyNoCache(String apiKeyValue) {
        return apiKeyRepository.findByApiKeyValue(apiKeyValue);
    }

    @Transactional
    public ApiKey createApiKey(Long userId, String name) {
        String key = generateKey();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        ApiKey apiKey = ApiKey.builder()
                .user(user)
                .apiKeyValue(key)
                .name(name == null ? null : name.trim())
                .usedTokens(0L)
                .enabled(true)
                .build();

        return apiKeyRepository.save(apiKey);
    }

    private String generateKey() {
        byte[] randomBytes = new byte[32];
        RANDOM.nextBytes(randomBytes);
        return "nkey_" + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    @Transactional
    public void recordUsage(ApiKey apiKey, long tokensUsed) {
        apiKey.useTokens(tokensUsed);
    }
}
