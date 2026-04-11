package com.nexusai.llm.gateway.repository;

import com.nexusai.llm.gateway.entity.ApiKey;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    @EntityGraph(attributePaths = {"user"})
    Optional<ApiKey> findByApiKeyValue(String apiKeyValue);

    @EntityGraph(attributePaths = {"user"})
    List<ApiKey> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"user"})
    List<ApiKey> findByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"user"})
    Optional<ApiKey> findWithUserById(Long id);

    boolean existsByIdAndUser_Id(Long id, Long userId);

    boolean existsByApiKeyValue(String apiKeyValue);

    Long countByUserId(Long userId);

    Long countByUserIdAndEnabled(Long userId, Boolean enabled);

    Long countByEnabled(Boolean enabled);

    @Query("SELECT COALESCE(SUM(k.usedTokens), 0) FROM ApiKey k WHERE k.user.id = :userId")
    Long sumUsedTokensByUserId(@Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query("UPDATE ApiKey k SET k.usedTokens = k.usedTokens + :tokens, k.lastUsedAt = :now WHERE k.id = :id")
    void incrementUsedTokens(@Param("id") Long id, @Param("tokens") long tokens, @Param("now") LocalDateTime now);
}
