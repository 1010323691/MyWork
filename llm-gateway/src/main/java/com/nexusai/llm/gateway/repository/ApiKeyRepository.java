package com.nexusai.llm.gateway.repository;

import com.nexusai.llm.gateway.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    Optional<ApiKey> findByApiKeyValue(String apiKeyValue);
    List<ApiKey> findByUserId(Long userId);
    List<ApiKey> findByEnabled(Boolean enabled);
    boolean existsByApiKeyValue(String apiKeyValue);
}
