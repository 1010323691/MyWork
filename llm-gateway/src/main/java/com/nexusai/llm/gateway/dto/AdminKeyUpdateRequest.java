package com.nexusai.llm.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminKeyUpdateRequest {
    private Long tokenLimit;
    private Long usedTokens;
    private String targetUrl;
    private String routingConfig;
    private Boolean enabled;
}
