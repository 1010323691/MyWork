package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.ModelCatalogResponse;
import com.nexusai.llm.gateway.service.ModelCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/models")
public class ModelCatalogController {

    private final ModelCatalogService modelCatalogService;

    public ModelCatalogController(ModelCatalogService modelCatalogService) {
        this.modelCatalogService = modelCatalogService;
    }

    @GetMapping("/catalog")
    public ResponseEntity<ModelCatalogResponse> getCatalog() {
        return ResponseEntity.ok(modelCatalogService.getCatalog());
    }
}
