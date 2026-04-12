package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.dto.RequestLogResponse;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.repository.ApiKeyRepository;
import com.nexusai.llm.gateway.repository.RequestLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class LogQueryService {

    private final RequestLogRepository requestLogRepository;
    private final ApiKeyRepository apiKeyRepository;

    public LogQueryService(RequestLogRepository requestLogRepository,
                           ApiKeyRepository apiKeyRepository) {
        this.requestLogRepository = requestLogRepository;
        this.apiKeyRepository = apiKeyRepository;
    }

    public Page<RequestLogResponse> getUserLogs(Long currentUserId,
                                                int page,
                                                int size,
                                                Long filterUserId,
                                                Long apiKeyId,
                                                String startDate,
                                                String endDate,
                                                String status) {
        if (filterUserId != null && !currentUserId.equals(filterUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (apiKeyId != null && !apiKeyRepository.existsByIdAndUser_Id(apiKeyId, currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        return requestLogRepository.findAll(
                        buildSpecification(currentUserId, filterUserId, apiKeyId, startDate, endDate, status),
                        buildPageable(page, size))
                .map(this::toResponse);
    }

    public Page<RequestLogResponse> getAdminLogs(int page,
                                                 int size,
                                                 Long userId,
                                                 Long apiKeyId,
                                                 String startDate,
                                                 String endDate,
                                                 String status) {
        return requestLogRepository.findAll(
                        buildSpecification(null, userId, apiKeyId, startDate, endDate, status),
                        buildPageable(page, size))
                .map(this::toResponse);
    }

    public RequestLogResponse getUserLogDetail(Long currentUserId, Long id) {
        RequestLog log = findLog(id);
        Long ownerUserId = log.getApiKey() != null && log.getApiKey().getUser() != null
                ? log.getApiKey().getUser().getId()
                : null;
        if (ownerUserId == null || !ownerUserId.equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return toResponse(log);
    }

    public RequestLogResponse getAdminLogDetail(Long id) {
        return toResponse(findLog(id));
    }

    private Pageable buildPageable(int page, int size) {
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private Specification<RequestLog> buildSpecification(Long ownerUserId,
                                                         Long filterUserId,
                                                         Long apiKeyId,
                                                         String startDate,
                                                         String endDate,
                                                         String status) {
        LocalDateTime start = parseStartDate(startDate);
        LocalDateTime end = parseEndDate(endDate);
        RequestLog.RequestStatus requestStatus = parseStatus(status);

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (ownerUserId != null) {
                predicates.add(cb.equal(root.get("apiKey").get("user").get("id"), ownerUserId));
            }
            if (filterUserId != null) {
                predicates.add(cb.equal(root.get("userId"), filterUserId));
            }
            if (apiKeyId != null) {
                predicates.add(cb.equal(root.get("apiKey").get("id"), apiKeyId));
            }
            if (start != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
            }
            if (end != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), end));
            }
            if (requestStatus != null) {
                predicates.add(cb.equal(root.get("status"), requestStatus));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private LocalDateTime parseStartDate(String startDate) {
        if (startDate == null || startDate.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(startDate).atStartOfDay();
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid startDate: " + startDate);
        }
    }

    private LocalDateTime parseEndDate(String endDate) {
        if (endDate == null || endDate.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(endDate).plusDays(1).atStartOfDay();
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid endDate: " + endDate);
        }
    }

    private RequestLog.RequestStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return RequestLog.RequestStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private RequestLog findLog(Long id) {
        return requestLogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Log not found: " + id));
    }

    private RequestLogResponse toResponse(RequestLog log) {
        return RequestLogResponse.builder()
                .id(log.getId())
                .requestId(log.getRequestId())
                .userId(log.getUserId())
                .apiKeyId(log.getApiKey().getId())
                .apiKeyName(log.getApiKey().getName())
                .inputTokens(log.getInputTokens())
                .outputTokens(log.getOutputTokens())
                .totalInputTokens(log.getTotalInputTokens())
                .cachedInputTokens(log.getCachedInputTokens())
                .modelName(log.getModelName())
                .latencyMs(log.getLatencyMs())
                .costAmount(log.getCostAmount())
                .status(log.getStatus() != null ? log.getStatus().name() : null)
                .createdAt(log.getCreatedAt())
                .build();
    }
}
