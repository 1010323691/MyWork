package com.nexusai.llm.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

@Service
public class LlmForwardService {

    private static final Logger logger = LoggerFactory.getLogger(LlmForwardService.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final WebClient webClient;
    private final Duration readTimeout;

    @Autowired
    public LlmForwardService(ObjectMapper objectMapper,
                             @Value("${gateway.forward.connect-timeout-seconds:30}") long connectTimeoutSeconds,
                             @Value("${gateway.forward.read-timeout-seconds:300}") long readTimeoutSeconds,
                             @Value("${gateway.forward.max-in-memory-size-bytes:16777216}") int maxInMemorySizeBytes) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(connectTimeoutSeconds))
                .build();
        this.readTimeout = Duration.ofSeconds(readTimeoutSeconds);
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(maxInMemorySizeBytes))
                .build();
    }

    public String forwardChatRequest(String backendUrl, String model, String messages, boolean stream) {
        String apiUrl = buildChatApiUrl(backendUrl);

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", parseMessages(messages),
                "stream", stream
        );

        if (stream) {
            return forwardStreaming(apiUrl, requestBody);
        } else {
            return forwardNonStreaming(apiUrl, requestBody);
        }
    }

    private String buildChatApiUrl(String backendUrl) {
        String url = backendUrl.trim();
        if (!url.endsWith("/")) {
            url += "/";
        }
        return url + "api/chat";
    }

    private Object[] parseMessages(String messages) {
        try {
            JsonNode jsonNode = objectMapper.readTree(messages);
            if (jsonNode.isArray()) {
                Object[] array = new Object[jsonNode.size()];
                for (int i = 0; i < jsonNode.size(); i++) {
                    array[i] = objectMapper.convertValue(jsonNode.get(i), Map.class);
                }
                return array;
            }
        } catch (Exception e) {
            logger.warn("Failed to parse messages: {}", e.getMessage());
        }
        return new Object[] { Map.of("role", "user", "content", messages) };
    }

    public String forwardNonStreaming(String url, Map<String, Object> body) {
        try {
            String response = webClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(readTimeout)
                    .block();

            return response;
        } catch (Exception e) {
            logger.error("Forward request failed: {}", e.getMessage());
            throw new RuntimeException("Backend service error: " + e.getMessage());
        }
    }

    public String forwardStreaming(String url, Map<String, Object> body) {
        StringBuilder result = new StringBuilder();
        result.append("{\"stream\": true, \"data\": \"");

        try {
            webClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToFlux(String.class)
                    .timeout(readTimeout)
                    .subscribe(
                            data -> {
                                if (data != null && !data.isBlank()) {
                                    String escaped = data.replace("\"", "\\\"").replace("\n", "\\n");
                                    synchronized (result) {
                                        if (result.length() > "{\"stream\": true, \"data\": \"".length()) {
                                            result.append("\\\";\"");
                                        }
                                        result.append(escaped);
                                    }
                                }
                            },
                            error -> logger.error("Stream error: {}", error.getMessage()),
                            () -> {
                                synchronized (result) {
                                    if (result.length() > "{\"stream\": true, \"data\": \"".length()) {
                                        result.append("\\\"}\"");
                                    }
                                }
                            }
                    );

            return result.toString();
        } catch (Exception e) {
            logger.error("Forward streaming request failed: {}", e.getMessage());
            return "{\"error\": \"Backend service error: " + e.getMessage() + "\"}";
        }
    }

    public long estimateTokenUsage(String content) {
        // 简单的 token 估算：1 token ≈ 4 个字符（英文）或 1.5 个字符（中文）
        long englishChars = content.chars().filter(c -> (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')).count();
        long chineseChars = content.chars().filter(c -> c >= 0x4e00 && c <= 0x9fff).count();
        return (long) ((englishChars / 4.0) + (chineseChars / 1.5));
    }
}
