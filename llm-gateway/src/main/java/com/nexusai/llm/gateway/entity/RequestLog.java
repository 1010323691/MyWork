package com.nexusai.llm.gateway.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "request_logs", indexes = {
        @Index(name = "idx_request_logs_api_key_id", columnList = "api_key_id"),
        @Index(name = "idx_request_logs_created_at", columnList = "created_at"),
        @Index(name = "idx_request_log_user_id", columnList = "user_id"),
        @Index(name = "idx_request_log_request_id", columnList = "request_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "api_key_id", nullable = false)
    private ApiKey apiKey;

    @Column(name = "request_id", length = 64)
    private String requestId;  // 请求追踪 ID

    @Column(name = "user_id")
    private Long userId;  // 用户 ID（冗余字段，便于查询）

    @Column(name = "input_tokens")
    private Long inputTokens;

    @Column(name = "output_tokens")
    private Long outputTokens;

    @Column(name = "model_name")
    private String modelName;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(name = "cost_amount", precision = 18, scale = 4)
    private BigDecimal costAmount;  // 消耗金额（人民币）

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private RequestStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum RequestStatus {
        SUCCESS, FAIL
    }
}
