package com.nexusai.llm.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RoutingConfigParser {

    private static final Logger logger = LoggerFactory.getLogger(RoutingConfigParser.class);

    private final ObjectMapper objectMapper;
    private final String defaultBackendUrl;

    public RoutingConfigParser(ObjectMapper objectMapper,
                               @Value("${gateway.default-backend-url:}") String defaultBackendUrl) {
        this.objectMapper = objectMapper;
        this.defaultBackendUrl = defaultBackendUrl;
    }

    public String resolveModel(String routingConfig, String requestedModel) {
        if (requestedModel == null) {
            return null;
        }
        if (routingConfig == null || routingConfig.isBlank()) {
            return requestedModel;
        }
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

    public String resolveTargetUrl(String routingConfig, String apiKeyTargetUrl) {
        String configuredTarget = resolveConfiguredTargetUrl(routingConfig, apiKeyTargetUrl);
        if (configuredTarget != null && !configuredTarget.isBlank()) {
            return configuredTarget;
        }
        return defaultBackendUrl == null || defaultBackendUrl.isBlank() ? null : defaultBackendUrl.trim();
    }

    public String resolveConfiguredTargetUrl(String routingConfig, String apiKeyTargetUrl) {
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
        return null;
    }
}
