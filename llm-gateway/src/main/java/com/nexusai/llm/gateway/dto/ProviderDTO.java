package com.nexusai.llm.gateway.dto;

import com.nexusai.llm.gateway.entity.BackendService;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 上游提供商 DTO
 * 用于 API 响应，不暴露敏感字段（如 upstreamKey）
 */
public class ProviderDTO {

    private Long id;
    private String name;
    private String baseUrl;
    private BackendService.ServiceType serviceType;
    private Boolean enabled;
    private Integer timeoutSeconds;
    private BigDecimal buyPriceInput;
    private BigDecimal sellPriceInput;
    private BigDecimal buyPriceOutput;
    private BigDecimal sellPriceOutput;
    private Integer failureCount;
    private LocalDateTime lastFailureAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ProviderDTO() {
    }

    public ProviderDTO(BackendService provider) {
        this.id = provider.getId();
        this.name = provider.getName();
        this.baseUrl = provider.getBaseUrl();
        this.serviceType = provider.getServiceType();
        this.enabled = provider.getEnabled();
        this.timeoutSeconds = provider.getTimeoutSeconds();
        this.buyPriceInput = provider.getBuyPriceInput();
        this.sellPriceInput = provider.getSellPriceInput();
        this.buyPriceOutput = provider.getBuyPriceOutput();
        this.sellPriceOutput = provider.getSellPriceOutput();
        this.failureCount = provider.getFailureCount();
        this.lastFailureAt = provider.getLastFailureAt();
        this.createdAt = provider.getCreatedAt();
        this.updatedAt = provider.getUpdatedAt();
        // 注意：upstreamKey 不复制到 DTO 中，确保不会暴露
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public BackendService.ServiceType getServiceType() { return serviceType; }
    public void setServiceType(BackendService.ServiceType serviceType) { this.serviceType = serviceType; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public Integer getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(Integer timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }

    public BigDecimal getBuyPriceInput() { return buyPriceInput; }
    public void setBuyPriceInput(BigDecimal buyPriceInput) { this.buyPriceInput = buyPriceInput; }

    public BigDecimal getSellPriceInput() { return sellPriceInput; }
    public void setSellPriceInput(BigDecimal sellPriceInput) { this.sellPriceInput = sellPriceInput; }

    public BigDecimal getBuyPriceOutput() { return buyPriceOutput; }
    public void setBuyPriceOutput(BigDecimal buyPriceOutput) { this.buyPriceOutput = buyPriceOutput; }

    public BigDecimal getSellPriceOutput() { return sellPriceOutput; }
    public void setSellPriceOutput(BigDecimal sellPriceOutput) { this.sellPriceOutput = sellPriceOutput; }

    public Integer getFailureCount() { return failureCount; }
    public void setFailureCount(Integer failureCount) { this.failureCount = failureCount; }

    public LocalDateTime getLastFailureAt() { return lastFailureAt; }
    public void setLastFailureAt(LocalDateTime lastFailureAt) { this.lastFailureAt = lastFailureAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
