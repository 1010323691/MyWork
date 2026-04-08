package com.nexusai.llm.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class RoutingConfigParser {

    private static final Logger logger = LoggerFactory.getLogger(RoutingConfigParser.class);
    private static final String DEFAULT_BACKEND_URL = "http://localhost:11434";

    private final ObjectMapper objectMapper;

    public RoutingConfigParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * 根据 routingConfig JSON 中的 modelMappings 将请求的模型名映射到实际模型名。
     * 示例: {"modelMappings": {"gpt-4": "llama3"}}
     */
    public String resolveModel(String routingConfig, String requestedModel) {
        if (requestedModel == null) return null;
        if (routingConfig == null || routingConfig.isBlank()) return requestedModel;
        try {
            JsonNode root = objectMapper.readTree(routingConfig);
            JsonNode mappings = root.path("modelMappings");
            if (!mappings.isMissingNode() && mappings.has(requestedModel)) {
                return mappings.get(requestedModel).asText();
            }
        } catch (Exception e) {
            logger.warn("Failed to parse routingConfig for model resolution: {}", e.getMessage());
        }
        return requestedModel;
    }

    /**
     * 优先顺序：routingConfig.targetUrl > apiKey.targetUrl > 默认值。
     */
    public String resolveTargetUrl(String routingConfig, String apiKeyTargetUrl) {
        if (routingConfig != null && !routingConfig.isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(routingConfig);
                JsonNode url = root.path("targetUrl");
                if (!url.isMissingNode() && !url.asText().isBlank()) {
                    return url.asText();
                }
            } catch (Exception e) {
                logger.warn("Failed to parse routingConfig for URL resolution: {}", e.getMessage());
            }
        }
        if (apiKeyTargetUrl != null && !apiKeyTargetUrl.isBlank()) {
            return apiKeyTargetUrl;
        }
        return DEFAULT_BACKEND_URL;
    }
}
