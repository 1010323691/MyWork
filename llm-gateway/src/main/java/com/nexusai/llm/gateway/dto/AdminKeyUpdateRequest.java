package com.nexusai.llm.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminKeyUpdateRequest {
    private Long tokenLimit;
    private Boolean clearTokenLimit;
    private Long usedTokens;
    private String targetUrl;
    private Boolean clearTargetUrl;
    private String routingConfig;
    private Boolean clearRoutingConfig;
    private Boolean enabled;
}
