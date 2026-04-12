package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.dto.ModelCatalogResponse;
import com.nexusai.llm.gateway.entity.BackendService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class ModelCatalogService {

    private final UpstreamProviderService upstreamProviderService;
    private final String gatewayBaseUrl;
    private final int circuitFailureThreshold;

    public ModelCatalogService(UpstreamProviderService upstreamProviderService,
                               @Value("${gateway.public-base-url:}") String gatewayBaseUrl,
                               @Value("${gateway.upstream.circuit-failure-threshold:5}") int circuitFailureThreshold) {
        this.upstreamProviderService = upstreamProviderService;
        this.gatewayBaseUrl = normalizeBaseUrl(gatewayBaseUrl);
        this.circuitFailureThreshold = circuitFailureThreshold;
    }

    public ModelCatalogResponse getCatalog() {
        List<ModelCatalogResponse.ModelItem> items = new ArrayList<>();
        for (BackendService provider : upstreamProviderService.findAll()) {
            List<String> models = parseModels(provider.getSupportedModels());
            String status = resolveStatus(provider);
            String statusLabel = resolveStatusLabel(status);
            String sourceLabel = "供应商 #" + provider.getId();

            for (String model : models) {
                items.add(ModelCatalogResponse.ModelItem.builder()
                        .providerId(provider.getId())
                        .modelName(model)
                        .status(status)
                        .statusLabel(statusLabel)
                        .sourceLabel(sourceLabel)
                        .build());
            }
        }

        items.sort(Comparator
                .comparing(ModelCatalogResponse.ModelItem::getModelName, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(item -> item.getProviderId() == null ? Long.MAX_VALUE : item.getProviderId()));

        return ModelCatalogResponse.builder()
                .gatewayBaseUrl(gatewayBaseUrl)
                .chatCompletionsPath("/v1/chat/completions")
                .models(items)
                .build();
    }

    private List<String> parseModels(String supportedModels) {
        List<String> models = new ArrayList<>();
        if (supportedModels == null || supportedModels.isBlank()) {
            return models;
        }

        for (String rawModel : supportedModels.split("[,\\r\\n]+")) {
            String model = rawModel == null ? "" : rawModel.trim();
            if (model.isBlank()) {
                continue;
            }
            models.add(model);
        }
        return models;
    }

    private String resolveStatus(BackendService provider) {
        int failureCount = provider.getFailureCount() == null ? 0 : provider.getFailureCount();
        boolean triggeredCircuit = failureCount >= circuitFailureThreshold && provider.getLastFailureAt() != null;

        if (triggeredCircuit) {
            return "circuit_open";
        }
        if (!Boolean.TRUE.equals(provider.getEnabled())) {
            return "disabled";
        }
        return "enabled";
    }

    private String resolveStatusLabel(String status) {
        return switch (status) {
            case "circuit_open" -> "熔断中";
            case "disabled" -> "已停用";
            default -> "可用";
        };
    }

    private String normalizeBaseUrl(String value) {
        String normalized = value == null ? "" : value.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
