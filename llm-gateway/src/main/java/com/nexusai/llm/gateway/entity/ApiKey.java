package com.nexusai.llm.gateway.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "api_keys")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
@ToString(exclude = {"user"})
public class ApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "api_key", unique = true, nullable = false)
    private String apiKeyValue;

    @Column(nullable = false)
    private String name;

    @Column(name = "token_limit")
    private Long tokenLimit;

    @Column(nullable = false)
    private Long usedTokens = 0L;

    @Column(name = "input_tokens")
    private Long inputTokens;  // 输入 Token 累计统计

    @Column(name = "output_tokens")
    private Long outputTokens;  // 输出 Token 累计统计

    @Builder.Default
    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "target_url")
    private String targetUrl;

    @Column(name = "routing_config", columnDefinition = "TEXT")
    private String routingConfig;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getRemainingTokens() {
        if (tokenLimit == null) {
            return null; // 无限制
        }
        return Math.max(0, tokenLimit - usedTokens);
    }

    public void useTokens(long count) {
        this.usedTokens += count;
    }
}
