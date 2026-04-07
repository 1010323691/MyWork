package com.nexusai.llm.gateway.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKeyRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private Long tokenLimit;

    private Long expiresAtDays;
}
