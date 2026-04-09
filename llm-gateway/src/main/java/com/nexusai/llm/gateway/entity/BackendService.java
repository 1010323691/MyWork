package com.nexusai.llm.gateway.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "backend_services")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackendService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "base_url", nullable = false)
    private String baseUrl;

    @Column(name = "service_type")
    @Enumerated(EnumType.STRING)
    private ServiceType serviceType = ServiceType.OLLAMA;

    @Builder.Default
    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "timeout_seconds")
    private Integer timeoutSeconds = 300;

    @Column(name = "upstream_key", length = 512)
    @ToString.Exclude  // 不在 toString() 中暴露
    private String upstreamKey;  // 上游 API Key（仅内部使用）

    @Column(name = "buy_price_input", precision = 18, scale = 6)
    private BigDecimal buyPriceInput;  // 输入 Token 买入价（元/百万 Token）

    @Column(name = "sell_price_input", precision = 18, scale = 6)
    private BigDecimal sellPriceInput;  // 输入 Token 卖出价（元/百万 Token）

    @Column(name = "buy_price_output", precision = 18, scale = 6)
    private BigDecimal buyPriceOutput;  // 输出 Token 买入价

    @Column(name = "sell_price_output", precision = 18, scale = 6)
    private BigDecimal sellPriceOutput;  // 输出 Token 卖出价

    @Column(name = "failure_count")
    private Integer failureCount;  // 连续失败次数（用于熔断）

    @Column(name = "last_failure_at")
    private LocalDateTime lastFailureAt;  // 上次失败时间

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ServiceType {
        OLLAMA, VLLM
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
