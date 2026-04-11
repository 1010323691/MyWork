package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.RequestLogResponse;
import com.nexusai.llm.gateway.service.LogQueryService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/logs")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLogController {

    private final LogQueryService logQueryService;

    public AdminLogController(LogQueryService logQueryService) {
        this.logQueryService = logQueryService;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Page<RequestLogResponse>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long apiKeyId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(logQueryService.getAdminLogs(page, size, userId, apiKeyId, startDate, endDate, status));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<RequestLogResponse> getLogDetail(@PathVariable Long id) {
        return ResponseEntity.ok(logQueryService.getAdminLogDetail(id));
    }
}
