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

import java.time.LocalDateTime;

@Service
public class RequestLogService {

    private static final Logger logger = LoggerFactory.getLogger(RequestLogService.class);
    private static final int MAX_BODY_LENGTH = 2000;

    private final RequestLogRepository requestLogRepository;
    private final ApiKeyRepository apiKeyRepository;

    public RequestLogService(RequestLogRepository requestLogRepository, ApiKeyRepository apiKeyRepository) {
        this.requestLogRepository = requestLogRepository;
        this.apiKeyRepository = apiKeyRepository;
    }

    @Async
    @Transactional
    public void asyncLogRequest(Long apiKeyId, Long inputTokens, Long outputTokens,
                                String modelName, Long latencyMs,
                                RequestLog.RequestStatus status,
                                String requestBody, String responseBody) {
        try {
            ApiKey apiKeyRef = new ApiKey();
            apiKeyRef.setId(apiKeyId);

            RequestLog log = RequestLog.builder()
                    .apiKey(apiKeyRef)
                    .inputTokens(inputTokens)
                    .outputTokens(outputTokens)
                    .modelName(modelName)
                    .latencyMs(latencyMs)
                    .status(status)
                    .requestBody(truncate(requestBody))
                    .responseBody(truncate(responseBody))
                    .build();
            requestLogRepository.save(log);
        } catch (Exception e) {
            logger.error("Failed to save request log for apiKeyId={}: {}", apiKeyId, e.getMessage());
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

    private String truncate(String s) {
        if (s == null) return null;
        return s.length() <= MAX_BODY_LENGTH ? s : s.substring(0, MAX_BODY_LENGTH);
    }
}
