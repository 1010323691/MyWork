package com.nexusai.llm.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusai.llm.gateway.entity.BackendService;
import com.nexusai.llm.gateway.repository.BackendServiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class UpstreamProviderService {

    private static final Logger logger = LoggerFactory.getLogger(UpstreamProviderService.class);
    private static final int CIRCUIT_FAILURE_THRESHOLD = 5;
    private static final Duration CIRCUIT_RESET_DURATION = Duration.ofMinutes(5);

    private final BackendServiceRepository backendServiceRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public UpstreamProviderService(BackendServiceRepository backendServiceRepository, ObjectMapper objectMapper) {
        this.backendServiceRepository = backendServiceRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public Optional<BackendService> findById(Long id) {
        return backendServiceRepository.findById(id);
    }

    public Optional<BackendService> findByModelName(String modelName) {
        return backendServiceRepository.findAll()
                .stream()
                .filter(BackendService::getEnabled)
                .filter(provider -> matchesModel(provider, modelName))
                .findFirst();
    }

    public List<BackendService> findAllEnabled() {
        return backendServiceRepository.findByEnabled(true);
    }

    public List<BackendService> findAll() {
        return backendServiceRepository.findAll();
    }

    @Transactional
    public BackendService create(BackendService provider) {
        return backendServiceRepository.save(provider);
    }

    @Transactional
    public BackendService update(Long id, BackendService updateData) {
        BackendService existing = backendServiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + id));

        if (updateData.getName() != null) {
            existing.setName(updateData.getName());
        }
        if (updateData.getBaseUrl() != null) {
            existing.setBaseUrl(updateData.getBaseUrl());
        }
        if (updateData.getSupportedModels() != null) {
            existing.setSupportedModels(updateData.getSupportedModels());
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
        if (updateData.getUpstreamKey() != null) {
            existing.setUpstreamKey(updateData.getUpstreamKey().isBlank() ? null : updateData.getUpstreamKey());
        }
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

    @Transactional
    public void delete(Long id) {
        backendServiceRepository.deleteById(id);
    }

    public String getUpstreamKey(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getUpstreamKey();
    }

    public BigDecimal getSellPriceInput(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getSellPriceInput() != null ? provider.getSellPriceInput() : BigDecimal.ZERO;
    }

    public BigDecimal getSellPriceOutput(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getSellPriceOutput() != null ? provider.getSellPriceOutput() : BigDecimal.ZERO;
    }

    public BigDecimal getBuyPriceInput(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getBuyPriceInput() != null ? provider.getBuyPriceInput() : BigDecimal.ZERO;
    }

    public BigDecimal getBuyPriceOutput(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        return provider.getBuyPriceOutput() != null ? provider.getBuyPriceOutput() : BigDecimal.ZERO;
    }

    @Transactional
    public void recordFailure(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));

        int newFailureCount = (provider.getFailureCount() != null ? provider.getFailureCount() : 0) + 1;
        provider.setFailureCount(newFailureCount);
        provider.setLastFailureAt(LocalDateTime.now());

        if (newFailureCount >= CIRCUIT_FAILURE_THRESHOLD) {
            logger.warn("Circuit breaker triggered for provider {}: {} failures", providerId, newFailureCount);
            provider.setEnabled(false);
        }

        backendServiceRepository.save(provider);
    }

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
            }
            resetFailureCount(providerId);
        }

        return false;
    }

    @Transactional
    public void resetFailureCount(Long providerId) {
        BackendService provider = backendServiceRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        provider.setFailureCount(0);
        provider.setLastFailureAt(null);
        backendServiceRepository.save(provider);
    }

    @Transactional
    public void recordSuccess(Long providerId) {
        resetFailureCount(providerId);
    }

    public ConnectivityTestResult testConnectivity(BackendService provider) {
        List<String> attempts = buildDiscoveryUrls(provider.getBaseUrl());
        List<String> traces = new ArrayList<>();
        String serviceType = provider.getServiceType() != null ? provider.getServiceType().name() : "UNKNOWN";

        for (String url : attempts) {
            try {
                // 连通性测试使用较短的超时时间，快速失败
                HttpResponse<String> response = sendGet(url, provider.getUpstreamKey(), 5);
                traces.add("GET " + url + " -> " + response.statusCode());

                // 成功状态码 (2xx) 表示连接正常
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    return new ConnectivityTestResult(true, response.statusCode(),
                            "Connected to " + serviceType + " endpoint: " + url, traces);
                }

                // 认证失败 (401/403) 也视为连通性正常，只是需要 Key
                if (response.statusCode() == 401 || response.statusCode() == 403) {
                    return new ConnectivityTestResult(true, response.statusCode(),
                            "Server reachable but requires authentication: " + url, traces);
                }
            } catch (Exception e) {
                traces.add("GET " + url + " -> FAILED: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            }
        }

        return new ConnectivityTestResult(false, HttpStatus.BAD_GATEWAY.value(),
                "Unable to connect to provider at " + provider.getBaseUrl(), traces);
    }

    public ModelDiscoveryResult discoverModels(BackendService provider) {
        List<String> traces = new ArrayList<>();
        Set<String> modelIds = new LinkedHashSet<>();

        tryDiscovery(appendPath(provider.getBaseUrl(), "/v1/models"), provider.getUpstreamKey(), traces, modelIds);
        if (modelIds.isEmpty()) {
            tryDiscovery(appendPath(provider.getBaseUrl(), "/api/tags"), provider.getUpstreamKey(), traces, modelIds);
        }

        if (modelIds.isEmpty()) {
            return new ModelDiscoveryResult(false, List.of(),
                    "No models discovered from " + provider.getBaseUrl(), traces);
        }

        return new ModelDiscoveryResult(true, new ArrayList<>(modelIds),
                "Discovered " + modelIds.size() + " model(s)", traces);
    }

    private boolean matchesModel(BackendService service, String modelName) {
        if (modelName == null || modelName.isBlank()) {
            return false;
        }

        String configuredModels = service.getSupportedModels();
        if (configuredModels == null || configuredModels.isBlank()) {
            return false;
        }

        String normalizedModel = modelName.trim().toLowerCase();
        String[] patterns = configuredModels.split("[,\\r\\n]+");
        for (String rawPattern : patterns) {
            String pattern = rawPattern.trim().toLowerCase();
            if (pattern.isBlank()) {
                continue;
            }
            if ("*".equals(pattern)) {
                return true;
            }
            if (pattern.endsWith("*")) {
                String prefix = pattern.substring(0, pattern.length() - 1);
                if (!prefix.isBlank() && normalizedModel.startsWith(prefix)) {
                    return true;
                }
                continue;
            }
            if (normalizedModel.equals(pattern)) {
                return true;
            }
        }
        return false;
    }

    private void tryDiscovery(String url, String upstreamKey, List<String> traces, Set<String> modelIds) {
        try {
            HttpResponse<String> response = sendGet(url, upstreamKey, 30);
            traces.add("GET " + url + " -> " + response.statusCode());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return;
            }

            JsonNode root = objectMapper.readTree(response.body());
            collectOpenAiModels(root, modelIds);
            collectOllamaModels(root, modelIds);
        } catch (Exception e) {
            traces.add("GET " + url + " -> " + e.getMessage());
        }
    }

    private void collectOpenAiModels(JsonNode root, Set<String> modelIds) {
        JsonNode data = root.path("data");
        if (!data.isArray()) {
            return;
        }
        for (JsonNode node : data) {
            String id = node.path("id").asText(null);
            if (id != null && !id.isBlank()) {
                modelIds.add(id.trim());
            }
        }
    }

    private void collectOllamaModels(JsonNode root, Set<String> modelIds) {
        JsonNode models = root.path("models");
        if (!models.isArray()) {
            return;
        }
        for (JsonNode node : models) {
            String name = node.path("name").asText(null);
            if (name != null && !name.isBlank()) {
                modelIds.add(name.trim());
            }
        }
    }

    private HttpResponse<String> sendGet(String url, String upstreamKey, int timeoutSeconds) throws IOException, InterruptedException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .header("Accept", "application/json")
                .GET();

        if (upstreamKey != null && !upstreamKey.isBlank()) {
            builder.header("Authorization", "Bearer " + upstreamKey);
        }

        return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    private List<String> buildDiscoveryUrls(String baseUrl) {
        String normalized = normalizeBaseUrl(baseUrl);
        List<String> urls = new ArrayList<>();
        urls.add(appendPath(normalized, "/v1/models"));
        urls.add(appendPath(normalized, "/api/tags"));
        return urls;
    }

    private String appendPath(String baseUrl, String suffix) {
        String normalized = normalizeBaseUrl(baseUrl);
        if (normalized.endsWith(suffix)) {
            return normalized;
        }
        return normalized + suffix;
    }

    private String normalizeBaseUrl(String baseUrl) {
        String normalized = Optional.ofNullable(baseUrl).orElse("").trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    public record ConnectivityTestResult(boolean success, int statusCode, String message, List<String> traces) {
    }

    public record ModelDiscoveryResult(boolean success, List<String> models, String message, List<String> traces) {
    }
}
