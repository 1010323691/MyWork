package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.repository.RequestLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class RequestLogService {

    private static final Logger logger = LoggerFactory.getLogger(RequestLogService.class);
    private final RequestLogRepository requestLogRepository;
    private final ApiKeyRepository apiKeyRepository;

    public RequestLogService(RequestLogRepository requestLogRepository, ApiKeyRepository apiKeyRepository) {
        this.requestLogRepository = requestLogRepository;
        this.apiKeyRepository = apiKeyRepository;
    }

    @Async
    @Transactional
    public void asyncLogRequest(Long apiKeyId, Long userId, String requestId,
                                Long inputTokens, Long outputTokens,
                                Long totalInputTokens, Long cachedInputTokens,
                                String modelName, Long latencyMs,
                                BigDecimal costAmount,
                                RequestLog.RequestStatus status) {
        try {
            Optional<ApiKey> apiKeyOptional = apiKeyRepository.findWithUserById(apiKeyId);
            if (apiKeyOptional.isEmpty()) {
                logger.warn("Skip request log because apiKeyId={} was not found", apiKeyId);
                return;
            }

            ApiKey apiKey = apiKeyOptional.get();
            Long resolvedUserId = apiKey.getUser() != null ? apiKey.getUser().getId() : userId;

            RequestLog log = RequestLog.builder()
                    .apiKey(apiKey)
                    .userId(resolvedUserId)
                    .requestId(requestId)
                    .inputTokens(defaultLong(inputTokens))
                    .outputTokens(defaultLong(outputTokens))
                    .totalInputTokens(defaultLong(totalInputTokens))
                    .cachedInputTokens(defaultLong(cachedInputTokens))
                    .modelName(modelName)
                    .latencyMs(latencyMs)
                    .costAmount(defaultBigDecimal(costAmount))
                    .status(status)
                    .build();
            RequestLog savedLog = requestLogRepository.save(log);
            if (savedLog.getStatus() == RequestLog.RequestStatus.SUCCESS) {
                logger.info("gateway_request_processed_success | requestId={} | userId={} | apiKeyId={} | model={} | inputTokens={} | outputTokens={} | latencyMs={} | costAmount={}",
                        sanitize(savedLog.getRequestId()),
                        savedLog.getUserId(),
                        apiKey.getId(),
                        sanitize(savedLog.getModelName()),
                        defaultLong(savedLog.getInputTokens()),
                        defaultLong(savedLog.getOutputTokens()),
                        defaultLong(savedLog.getLatencyMs()),
                        defaultBigDecimal(savedLog.getCostAmount()));
            }
        } catch (Exception e) {
            logger.error("Failed to save request log for apiKeyId={}: {}", apiKeyId, e.getMessage(), e);
        }
    }

    @Async
    @Transactional
    public void asyncRecordUsage(Long apiKeyId, long totalTokens) {
        try {
            apiKeyRepository.incrementUsedTokens(apiKeyId, totalTokens, LocalDateTime.now());
        } catch (Exception e) {
            logger.error("Failed to record token usage for apiKeyId={}: {}", apiKeyId, e.getMessage());
        }
    }

    private long defaultLong(Long value) {
        return value != null ? value : 0L;
    }

    private BigDecimal defaultBigDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace('|', '/').replaceAll("[\\r\\n]+", " ").trim();
    }
}
