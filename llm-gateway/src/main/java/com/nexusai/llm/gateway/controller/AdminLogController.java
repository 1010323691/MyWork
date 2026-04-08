package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.RequestLogResponse;
import com.nexusai.llm.gateway.entity.RequestLog;
import com.nexusai.llm.gateway.repository.RequestLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/admin/logs")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLogController {

    private final RequestLogRepository requestLogRepository;

    public AdminLogController(RequestLogRepository requestLogRepository) {
        this.requestLogRepository = requestLogRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Page<RequestLogResponse>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long apiKeyId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String status) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<RequestLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (apiKeyId != null) {
                predicates.add(cb.equal(root.get("apiKey").get("id"), apiKeyId));
            }
            if (startDate != null && !startDate.isBlank()) {
                LocalDateTime start = LocalDate.parse(startDate).atStartOfDay();
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
            }
            if (endDate != null && !endDate.isBlank()) {
                LocalDateTime end = LocalDate.parse(endDate).plusDays(1).atStartOfDay();
                predicates.add(cb.lessThan(root.get("createdAt"), end));
            }
            if (status != null && !status.isBlank()) {
                try {
                    RequestLog.RequestStatus s = RequestLog.RequestStatus.valueOf(status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), s));
                } catch (IllegalArgumentException ignored) {}
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<RequestLogResponse> result = requestLogRepository.findAll(spec, pageable)
                .map(this::toResponse);
        return ResponseEntity.ok(result);
    }

    private RequestLogResponse toResponse(RequestLog log) {
        return RequestLogResponse.builder()
                .id(log.getId())
                .apiKeyId(log.getApiKey().getId())
                .apiKeyName(log.getApiKey().getName())
                .inputTokens(log.getInputTokens())
                .outputTokens(log.getOutputTokens())
                .modelName(log.getModelName())
                .latencyMs(log.getLatencyMs())
                .status(log.getStatus() != null ? log.getStatus().name() : null)
                .createdAt(log.getCreatedAt())
                .build();
    }
}
