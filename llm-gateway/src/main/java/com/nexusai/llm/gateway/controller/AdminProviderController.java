package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.ProviderDTO;
import com.nexusai.llm.gateway.entity.BackendService;
import com.nexusai.llm.gateway.service.UpstreamProviderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 上游提供商管理 Controller
 * 管理员专用的网关转发配置接口
 */
@RestController
@RequestMapping("/api/admin/providers")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProviderController {

    private final UpstreamProviderService providerService;

    @Autowired
    public AdminProviderController(UpstreamProviderService providerService) {
        this.providerService = providerService;
    }

    /**
     * 获取所有上游提供商列表（不暴露敏感字段）
     */
    @GetMapping
    public ResponseEntity<List<ProviderDTO>> listProviders() {
        List<ProviderDTO> providerDTOs = providerService.findAll()
                .stream()
                .map(ProviderDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(providerDTOs);
    }

    /**
     * 获取单个上游提供商详情（不暴露敏感字段）
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProviderDTO> getProvider(@PathVariable Long id) {
        return providerService.findById(id)
                .map(provider -> ResponseEntity.ok(new ProviderDTO(provider)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 创建上游提供商
     */
    @PostMapping
    public ResponseEntity<ProviderDTO> createProvider(@RequestBody BackendService provider) {
        BackendService created = providerService.create(provider);
        return ResponseEntity.ok(new ProviderDTO(created));
    }

    @PostMapping("/test-connectivity")
    public ResponseEntity<UpstreamProviderService.ConnectivityTestResult> testConnectivity(@RequestBody BackendService provider) {
        return ResponseEntity.ok(providerService.testConnectivity(provider));
    }

    @PostMapping("/discover-models")
    public ResponseEntity<UpstreamProviderService.ModelDiscoveryResult> discoverModels(@RequestBody BackendService provider) {
        return ResponseEntity.ok(providerService.discoverModels(provider));
    }

    /**
     * 更新上游提供商
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProviderDTO> updateProvider(
            @PathVariable Long id,
            @RequestBody BackendService updateData) {
        try {
            BackendService updated = providerService.update(id, updateData);
            return ResponseEntity.ok(new ProviderDTO(updated));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 删除上游提供商
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProvider(@PathVariable Long id) {
        providerService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 启用/禁用上游提供商
     */
    @PatchMapping("/{id}/enabled")
    public ResponseEntity<ProviderDTO> toggleProviderEnabled(
            @PathVariable Long id,
            @RequestBody EnableRequest request) {
        BackendService updateData = new BackendService();
        updateData.setEnabled(request.getEnabled());
        BackendService updated = providerService.update(id, updateData);
        return ResponseEntity.ok(new ProviderDTO(updated));
    }

    /**
     * 重置上游提供商熔断状态（同时启用服务）
     */
    @PostMapping("/{id}/reset-circuit")
    public ResponseEntity<Void> resetCircuit(@PathVariable Long id) {
        providerService.resetFailureCountAndEnable(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 切换熔断器开关状态（不影响启用状态）
     */
    @PatchMapping("/{id}/circuit-breaker")
    public ResponseEntity<ProviderDTO> toggleCircuitBreaker(
            @PathVariable Long id,
            @RequestBody CircuitBreakerRequest request) {
        BackendService updated = providerService.toggleCircuitBreaker(id, request.getCircuitBreakerEnabled());
        return ResponseEntity.ok(new ProviderDTO(updated));
    }

    /**
     * 仅重置熔断计数（不改变启用状态）
     */
    @PostMapping("/{id}/reset-failures")
    public ResponseEntity<ProviderDTO> resetFailures(@PathVariable Long id) {
        providerService.resetFailureCountOnly(id);
        BackendService updated = providerService.findById(id).orElseThrow();
        return ResponseEntity.ok(new ProviderDTO(updated));
    }

    /**
     * 熔断器请求体
     */
    public static class CircuitBreakerRequest {
        private Boolean circuitBreakerEnabled;

        public Boolean getCircuitBreakerEnabled() {
            return circuitBreakerEnabled;
        }

        public void setCircuitBreakerEnabled(Boolean circuitBreakerEnabled) {
            this.circuitBreakerEnabled = circuitBreakerEnabled;
        }
    }

    /**
     * 启用请求体
     */
    public static class EnableRequest {
        private Boolean enabled;

        public Boolean getEnabled() {
            return enabled;
        }

        public void setEnabled(Boolean enabled) {
            this.enabled = enabled;
        }
    }
}
