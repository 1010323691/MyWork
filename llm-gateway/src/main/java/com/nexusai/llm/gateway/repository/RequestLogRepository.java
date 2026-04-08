package com.nexusai.llm.gateway.repository;

import com.nexusai.llm.gateway.entity.RequestLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RequestLogRepository extends JpaRepository<RequestLog, Long>, JpaSpecificationExecutor<RequestLog> {

    Page<RequestLog> findByApiKey_User_Id(Long userId, Pageable pageable);

    @Query(value = "SELECT DATE_FORMAT(r.created_at,'%Y-%m-%d') as date, " +
                   "COALESCE(SUM(r.input_tokens + r.output_tokens), 0) as tokens " +
                   "FROM request_logs r WHERE r.api_key_id IN " +
                   "(SELECT k.id FROM api_keys k WHERE k.user_id = :userId) " +
                   "AND r.created_at >= :since " +
                   "GROUP BY DATE_FORMAT(r.created_at,'%Y-%m-%d') ORDER BY 1 ASC",
           nativeQuery = true)
    List<Object[]> getDailyTrendByUser(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(r.inputTokens + r.outputTokens), 0) FROM RequestLog r " +
           "WHERE r.apiKey.user.id = :userId AND r.createdAt >= :since")
    Long sumTokensByUserSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.apiKey.user.id = :userId")
    Long countByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.apiKey.user.id = :userId AND r.status = 'SUCCESS'")
    Long countSuccessByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.status = 'SUCCESS'")
    Long countSuccess();

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.status = 'FAIL'")
    Long countFail();

    @Query("SELECT COALESCE(AVG(r.latencyMs), 0) FROM RequestLog r WHERE r.createdAt >= :since")
    Double avgLatencySince(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(r.inputTokens + r.outputTokens), 0) FROM RequestLog r")
    Long sumAllTokens();
}
