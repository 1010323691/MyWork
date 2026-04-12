package com.nexusai.llm.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelCatalogResponse {

    private String gatewayBaseUrl;
    private String chatCompletionsPath;
    private List<ModelItem> models;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModelItem {
        private Long providerId;
        private String modelName;
        private String status;
        private String statusLabel;
        private String sourceLabel;
    }
}
