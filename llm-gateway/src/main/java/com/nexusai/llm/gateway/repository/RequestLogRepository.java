package com.nexusai.llm.gateway.repository;

import com.nexusai.llm.gateway.entity.RequestLog;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RequestLogRepository extends JpaRepository<RequestLog, Long>, JpaSpecificationExecutor<RequestLog> {

    @Modifying
    @Query(value = "DELETE FROM request_logs WHERE api_key_id IN (SELECT id FROM api_keys WHERE user_id = :userId)", nativeQuery = true)
    int deleteByUserId(@Param("userId") Long userId);

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

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.apiKey.user.id = :userId AND r.createdAt >= :since")
    Long countByUserIdSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.apiKey.user.id = :userId AND r.status = 'SUCCESS'")
    Long countSuccessByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.status = 'SUCCESS'")
    Long countSuccess();

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.createdAt >= :since")
    Long countSince(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.status = 'SUCCESS' AND r.createdAt >= :since")
    Long countSuccessSince(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.status = 'FAIL'")
    Long countFail();

    @Query("SELECT COALESCE(AVG(r.latencyMs), 0) FROM RequestLog r WHERE r.createdAt >= :since")
    Double avgLatencySince(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(AVG(r.latencyMs), 0) FROM RequestLog r WHERE r.apiKey.user.id = :userId AND r.createdAt >= :since")
    Double avgLatencyByUserSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(r.inputTokens + r.outputTokens), 0) FROM RequestLog r")
    Long sumAllTokens();

    @Query("SELECT COALESCE(SUM(r.inputTokens + r.outputTokens), 0) FROM RequestLog r WHERE r.createdAt >= :since")
    Long sumTokensSince(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(r.costAmount), 0) FROM RequestLog r WHERE r.createdAt >= :since")
    BigDecimal sumCostSince(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(r.costAmount), 0) FROM RequestLog r WHERE r.apiKey.user.id = :userId AND r.createdAt >= :since")
    BigDecimal sumCostByUserSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT r.latencyMs FROM RequestLog r WHERE r.createdAt >= :since AND r.latencyMs IS NOT NULL ORDER BY r.latencyMs ASC")
    List<Long> findLatenciesSince(@Param("since") LocalDateTime since);

    @Query("SELECT r.latencyMs FROM RequestLog r WHERE r.apiKey.user.id = :userId AND r.createdAt >= :since AND r.latencyMs IS NOT NULL ORDER BY r.latencyMs ASC")
    List<Long> findLatenciesByUserSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query(value = "SELECT DATE_FORMAT(r.created_at,'%Y-%m-%d') AS stat_date, " +
            "COUNT(*) AS request_count, " +
            "COALESCE(SUM(r.input_tokens + r.output_tokens), 0) AS token_count, " +
            "COALESCE(SUM(r.cost_amount), 0) AS revenue " +
            "FROM request_logs r " +
            "WHERE r.created_at >= :since " +
            "GROUP BY DATE_FORMAT(r.created_at,'%Y-%m-%d') " +
            "ORDER BY stat_date ASC",
            nativeQuery = true)
    List<Object[]> getDailySummarySince(@Param("since") LocalDateTime since);

    @Query(value = "SELECT DATE_FORMAT(r.created_at,'%Y-%m-%d') AS stat_date, " +
            "COUNT(*) AS request_count, " +
            "COALESCE(SUM(r.input_tokens + r.output_tokens), 0) AS token_count, " +
            "COALESCE(SUM(r.cost_amount), 0) AS revenue " +
            "FROM request_logs r " +
            "JOIN api_keys k ON k.id = r.api_key_id " +
            "WHERE k.user_id = :userId AND r.created_at >= :since " +
            "GROUP BY DATE_FORMAT(r.created_at,'%Y-%m-%d') " +
            "ORDER BY stat_date ASC",
            nativeQuery = true)
    List<Object[]> getDailySummaryByUserSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query(value = "SELECT COALESCE(NULLIF(r.model_name, ''), 'Unknown') AS model_name, " +
            "COUNT(*) AS request_count, " +
            "COALESCE(SUM(r.input_tokens + r.output_tokens), 0) AS token_count, " +
            "COALESCE(AVG(r.latency_ms), 0) AS avg_latency " +
            "FROM request_logs r " +
            "WHERE r.created_at >= :since " +
            "GROUP BY COALESCE(NULLIF(r.model_name, ''), 'Unknown') " +
            "ORDER BY request_count DESC",
            nativeQuery = true)
    List<Object[]> getModelSummarySince(@Param("since") LocalDateTime since);

    @Query(value = "SELECT COALESCE(NULLIF(r.model_name, ''), 'Unknown') AS model_name, " +
            "COUNT(*) AS request_count, " +
            "COALESCE(SUM(r.input_tokens + r.output_tokens), 0) AS token_count, " +
            "COALESCE(AVG(r.latency_ms), 0) AS avg_latency " +
            "FROM request_logs r " +
            "JOIN api_keys k ON k.id = r.api_key_id " +
            "WHERE k.user_id = :userId AND r.created_at >= :since " +
            "GROUP BY COALESCE(NULLIF(r.model_name, ''), 'Unknown') " +
            "ORDER BY request_count DESC",
            nativeQuery = true)
    List<Object[]> getModelSummaryByUserSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(DISTINCT COALESCE(r.modelName, 'Unknown')) FROM RequestLog r WHERE r.createdAt >= :since")
    Long countDistinctModelsSince(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(DISTINCT COALESCE(r.modelName, 'Unknown')) FROM RequestLog r WHERE r.apiKey.user.id = :userId AND r.createdAt >= :since")
    Long countDistinctModelsByUserSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);
}
