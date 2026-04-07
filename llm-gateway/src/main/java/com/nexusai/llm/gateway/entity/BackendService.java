package com.nexusai.llm.gateway.entity;

import jakarta.persistence.*;
import lombok.*;

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
