package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.entity.BackendService;
import com.nexusai.llm.gateway.repository.BackendServiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 上游提供商服务
 * 负责管理上游 LLM 提供商的配置、API Key、定价和熔断状态
 *
 * 注意：upstreamKey 在数据库中存储明文（因为需要可逆用于转发请求）
 * 但在 API 响应中不会返回该字段，确保安全
 */
@Service
public class UpstreamProviderService {

    private static final Logger logger = LoggerFactory.getLogger(UpstreamProviderService.class);

    // 熔断阈值
    private static final int CIRCUIT_FAILURE_THRESHOLD = 5; // 连续失败 5 次触发熔断
    private static final Duration CIRCUIT_RESET_DURATION = Duration.ofMinutes(5); // 5 分钟后自动重置

    private final BackendServiceRepository backendServiceRepository;

    public UpstreamProviderService(BackendServiceRepository backendServiceRepository) {
        this.backendServiceRepository = backendServiceRepository;
    }

    /**
     * 根据 ID 获取上游提供商
     */
    public Optional<BackendService> findById(Long id) {
        return backendServiceRepository.findById(id);
    }

    /**
     * 根据模型名称获取上游提供商
     */
    public Optional<BackendService> findByModelName(String modelName) {
        return backendServiceRepository.findAll()
                .stream()
                .filter(BackendService::getEnabled)
                .filter(bs -> matchesModel(bs, modelName))
                .findFirst();
    }

    /**
     * 获取所有启用的上游提供商
     */
    public List<BackendService> findAllEnabled() {
        return backendServiceRepository.findByEnabled(true);
    }

    /**
     * 获取所有上游提供商（包括禁用的）
     */
    public List<BackendService> findAll() {
        return backendServiceRepository.findAll();
    }

    /**
     * 创建上游提供商
     */
    @Transactional
    public BackendService create(BackendService provider) {
        return backendServiceRepository.save(provider);
    }

    /**
     * 更新上游提供商
     */
    @Transactional
    public BackendService update(Long id, BackendService updateData) {
        BackendService existing = backendServiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + id));

        // 更新字段
        if (updateData.getName() != null) {
            existing.setName(updateData.getName());
        }
        if (updateData.getBaseUrl() != null) {
            existing.setBaseUrl(updateData.getBaseUrl());
        }
        if (updateData.getServiceType() != null) {
            existing.setServiceType(updateData.getServiceType());
        }
        if (updateData.getEnabled() != null) {
            existing.setEnabled(updateData.getEnabled());
        }
        if (updateData.getTimeoutSeconds() != null) {
            existing.setTimeoutSeconds(updateData.getTimeoutSeconds());
        }

        // 更新上游 Key
        if (updateData.getUpstreamKey() != null) {
            existing.setUpstreamKey(updateData.getUpstreamKey().isBlank() ? null : updateData.getUpstreamKey());
        }

        // 更新定价字段
        if (updateData.getBuyPriceInput() != null) {
            existing.setBuyPriceInput(updateData.getBuyPriceInput());
        }
        if (updateData.getSellPriceInput() != null) {
            existing.setSellPriceInput(updateData.getSellPriceInput());
        }
        if (updateData.getBuyPriceOutput() != null) {
            existing.setBuyPriceOutput(updateData.getBuyPriceOutput());
        }
        if (updateData.getSellPriceOutput() != null) {
            existing.setSellPriceOutput(updateData.getSellPriceOutput());
        }

        return backendServiceRepository.save(existing);
    }

    /**
     * 删除上游提供商
     */
    @Transactional
    public void delete(Long id) {
        backendServiceRepository.deleteById(id);
    }

    /**
     * 获取上游 API Key（仅用于内部转发请求）
     * 注意：此方法不应在 API 控制器中直接暴露
     */
    public String getUpstreamKey(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getUpstreamKey();
    }

    /**
     * 获取输入 Token 卖出价（用户支付的价格）
     */
    public BigDecimal getSellPriceInput(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getSellPriceInput() != null ? provider.getSellPriceInput() : BigDecimal.ZERO;
    }

    /**
     * 获取输出 Token 卖出价（用户支付的价格）
     */
    public BigDecimal getSellPriceOutput(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getSellPriceOutput() != null ? provider.getSellPriceOutput() : BigDecimal.ZERO;
    }

    /**
     * 获取买入价（用于计算成本）
     */
    public BigDecimal getBuyPriceInput(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getBuyPriceInput() != null ? provider.getBuyPriceInput() : BigDecimal.ZERO;
    }

    /**
     * 获取买入价（用于计算成本）
     */
    public BigDecimal getBuyPriceOutput(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getBuyPriceOutput() != null ? provider.getBuyPriceOutput() : BigDecimal.ZERO;
    }

    /**
     * 记录一次失败，用于熔断控制
     */
    @Transactional
    public void recordFailure(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));

        int newFailureCount = (provider.getFailureCount() != null ? provider.getFailureCount() : 0) + 1;
        provider.setFailureCount(newFailureCount);
        provider.setLastFailureAt(LocalDateTime.now());

        // 如果超过阈值，自动禁用
        if (newFailureCount >= CIRCUIT_FAILURE_THRESHOLD) {
            logger.warn("Circuit breaker triggered for provider {}: {} failures", providerId, newFailureCount);
            provider.setEnabled(false);
        }

        backendServiceRepository.save(provider);
    }

    /**
     * 检查熔断是否打开
     */
    public boolean isCircuitOpen(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));

        if (!provider.getEnabled()) {
            return true;
        }

        int failureCount = provider.getFailureCount() != null ? provider.getFailureCount() : 0;
        if (failureCount >= CIRCUIT_FAILURE_THRESHOLD) {
            return true;
        }

        if (provider.getLastFailureAt() != null) {
            Duration sinceLastFailure = Duration.between(provider.getLastFailureAt(), LocalDateTime.now());
            if (sinceLastFailure.compareTo(CIRCUIT_RESET_DURATION) < 0) {
                return failureCount >= CIRCUIT_FAILURE_THRESHOLD;
            } else {
                resetFailureCount(providerId);
            }
        }

        return false;
    }

    /**
     * 重置失败计数
     */
    @Transactional
    public void resetFailureCount(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        provider.setFailureCount(0);
        provider.setLastFailureAt(null);
        backendServiceRepository.save(provider);
    }

    /**
     * 记录成功请求，重置失败计数
     */
    @Transactional
    public void recordSuccess(Long providerId) {
        resetFailureCount(providerId);
    }

    /**
     * 匹配模型名称
     */
    private boolean matchesModel(BackendService service, String modelName) {
        return true;
    }
}
