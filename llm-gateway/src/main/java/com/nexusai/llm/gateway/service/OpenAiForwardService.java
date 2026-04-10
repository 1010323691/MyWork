package com.nexusai.llm.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

@Service
public class OpenAiForwardService {

    private static final Logger logger = LoggerFactory.getLogger(OpenAiForwardService.class);
    private static final int MAX_CAPTURED_BODY_LENGTH = 4000;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OpenAiForwardService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
    }

    public ForwardedResponse forwardChatRequest(String backendUrl, JsonNode requestBody, String upstreamApiKey) {
        try {
            HttpRequest request = buildJsonRequest(buildChatCompletionsUrl(backendUrl), requestBody, upstreamApiKey);
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return new ForwardedResponse(
                    response.statusCode(),
                    response.headers().firstValue("Content-Type").orElse(MediaType.APPLICATION_JSON_VALUE),
                    response.body()
            );
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            logger.error("Forward request failed: {}", e.getMessage());
            throw new RuntimeException("Backend service error: " + e.getMessage(), e);
        }
    }

    public PreparedStreamingResponse openStreamingChatRequest(String backendUrl, JsonNode requestBody, String upstreamApiKey) {
        try {
            HttpRequest request = buildJsonRequest(buildChatCompletionsUrl(backendUrl), requestBody, upstreamApiKey);
            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            return new PreparedStreamingResponse(
                    response.statusCode(),
                    response.headers().firstValue("Content-Type").orElse(MediaType.TEXT_EVENT_STREAM_VALUE),
                    response.body()
            );
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            logger.error("Open streaming request failed: {}", e.getMessage());
            throw new RuntimeException("Backend service error: " + e.getMessage(), e);
        }
    }

    public StreamSummary relayStream(InputStream inputStream, OutputStream outputStream) throws IOException {
        StringBuilder captured = new StringBuilder();
        byte[] buffer = new byte[8192];

        try (InputStream upstream = inputStream) {
            int read;
            while ((read = upstream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
                outputStream.flush();

                if (captured.length() < MAX_CAPTURED_BODY_LENGTH) {
                    int remaining = MAX_CAPTURED_BODY_LENGTH - captured.length();
                    captured.append(new String(buffer, 0, Math.min(read, remaining), StandardCharsets.UTF_8));
                }
            }
        }

        return new StreamSummary(captured.toString());
    }

    public ObjectNode rewriteRequestModel(JsonNode originalRequest, String model) {
        ObjectNode requestObject = originalRequest != null && originalRequest.isObject()
                ? ((ObjectNode) originalRequest.deepCopy())
                : objectMapper.createObjectNode();
        requestObject.put("model", model);
        return requestObject;
    }

    public String extractMessagesText(JsonNode requestBody) {
        if (requestBody == null) {
            return "";
        }
        JsonNode messagesNode = requestBody.path("messages");
        return messagesNode.isMissingNode() ? requestBody.toString() : messagesNode.toString();
    }

    public String extractResponseText(String responseBody) {
        return responseBody == null ? "" : responseBody;
    }

    public long estimateTokenUsage(String content) {
        if (content == null || content.isBlank()) {
            return 0L;
        }
        long englishChars = content.chars()
                .filter(c -> (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'))
                .count();
        long chineseChars = content.chars()
                .filter(c -> c >= 0x4e00 && c <= 0x9fff)
                .count();
        long otherChars = content.length() - englishChars - chineseChars;
        return (long) Math.ceil((englishChars / 4.0) + (chineseChars / 1.5) + (otherChars / 4.0));
    }

    private HttpRequest buildJsonRequest(String url, JsonNode requestBody, String upstreamApiKey) throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(300))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .header("Accept", MediaType.ALL_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody), StandardCharsets.UTF_8));

        if (upstreamApiKey != null && !upstreamApiKey.isBlank()) {
            builder.header("Authorization", "Bearer " + upstreamApiKey);
        }

        return builder.build();
    }

    private String buildChatCompletionsUrl(String backendUrl) {
        String normalized = normalizeBaseUrl(backendUrl);
        if (normalized.endsWith("/v1")) {
            return normalized + "/chat/completions";
        }
        if (normalized.endsWith("/chat/completions")) {
            return normalized;
        }
        return normalized + "/v1/chat/completions";
    }

    private String normalizeBaseUrl(String backendUrl) {
        String url = Optional.ofNullable(backendUrl)
                .orElseThrow(() -> new IllegalArgumentException("Backend URL is required"))
                .trim();
        while (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        return url;
    }

    public record ForwardedResponse(int statusCode, String contentType, String body) {
    }

    public record PreparedStreamingResponse(int statusCode, String contentType, InputStream inputStream) {
    }

    public record StreamSummary(String capturedBody) {
    }
}
