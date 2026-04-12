package com.nexusai.llm.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AnthropicForwardService {

    private static final int MAX_CAPTURED_BODY_LENGTH = 4000;

    private final ObjectMapper objectMapper;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;

    public AnthropicForwardService(ObjectMapper objectMapper,
                                   @Value("${gateway.forward.connect-timeout-seconds:30}") long connectTimeoutSeconds,
                                   @Value("${gateway.forward.read-timeout-seconds:300}") long readTimeoutSeconds) {
        this.objectMapper = objectMapper;
        this.connectTimeoutMs = Math.toIntExact(connectTimeoutSeconds * 1000);
        this.readTimeoutMs = Math.toIntExact(readTimeoutSeconds * 1000);
    }

    public ForwardedResponse forwardMessagesRequest(String backendUrl,
                                                    JsonNode requestBody,
                                                    String upstreamApiKey,
                                                    String anthropicVersion,
                                                    String anthropicBeta) {
        HttpURLConnection connection = null;
        try {
            String requestUrl = buildMessagesUrl(backendUrl);
            connection = openPostConnection(requestUrl, requestBody, upstreamApiKey, anthropicVersion, anthropicBeta);
            int statusCode = connection.getResponseCode();
            String contentType = Optional.ofNullable(connection.getContentType()).orElse(MediaType.APPLICATION_JSON_VALUE);
            String responseBody = readResponseBody(connection, statusCode);
            return new ForwardedResponse(statusCode, contentType, responseBody);
        } catch (IOException e) {
            throw new RuntimeException("Backend service error: " + e.getMessage(), e);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    public PreparedStreamingResponse openStreamingMessagesRequest(String backendUrl,
                                                                  JsonNode requestBody,
                                                                  String upstreamApiKey,
                                                                  String anthropicVersion,
                                                                  String anthropicBeta) {
        try {
            String requestUrl = buildMessagesUrl(backendUrl);
            HttpURLConnection connection = openPostConnection(requestUrl, requestBody, upstreamApiKey, anthropicVersion, anthropicBeta);
            int statusCode = connection.getResponseCode();
            String contentType = Optional.ofNullable(connection.getContentType()).orElse(MediaType.TEXT_EVENT_STREAM_VALUE);
            InputStream inputStream = statusCode >= 400 ? connection.getErrorStream() : connection.getInputStream();

            if (inputStream == null) {
                connection.disconnect();
                throw new IOException("Upstream returned no response body");
            }
            return new PreparedStreamingResponse(statusCode, contentType, connection, inputStream);
        } catch (IOException e) {
            throw new RuntimeException("Backend service error: " + e.getMessage(), e);
        }
    }

    public StreamSummary relayStream(HttpURLConnection connection, InputStream inputStream, OutputStream outputStream) throws IOException {
        StringBuilder captured = new StringBuilder();
        StringBuilder visibleContent = new StringBuilder();
        StringBuilder currentEvent = new StringBuilder();
        StringBuilder currentData = new StringBuilder();
        UsageStats usageStats = UsageStats.empty();
        byte[] buffer = new byte[8192];
        StringBuilder eventBuffer = new StringBuilder();

        try (InputStream upstream = inputStream) {
            int read;
            while ((read = upstream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
                outputStream.flush();

                if (captured.length() < MAX_CAPTURED_BODY_LENGTH) {
                    int remaining = MAX_CAPTURED_BODY_LENGTH - captured.length();
                    captured.append(new String(buffer, 0, Math.min(read, remaining), StandardCharsets.UTF_8));
                }

                eventBuffer.append(new String(buffer, 0, read, StandardCharsets.UTF_8));
                int boundary;
                while ((boundary = eventBuffer.indexOf("\n\n")) >= 0) {
                    String eventBlock = eventBuffer.substring(0, boundary);
                    eventBuffer.delete(0, boundary + 2);
                    ParsedStreamEvent parsed = parseStreamEvent(eventBlock);
                    if (parsed == null) {
                        continue;
                    }
                    if (!parsed.textDelta().isEmpty()) {
                        visibleContent.append(parsed.textDelta());
                    }
                    if (parsed.usageStats().hasValues()) {
                        usageStats = usageStats.merge(parsed.usageStats());
                    }
                }
            }
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }

        return new StreamSummary(captured.toString(), visibleContent.toString(), usageStats);
    }

    public String extractMessagesText(JsonNode requestBody) {
        if (requestBody == null) {
            return "";
        }
        List<String> texts = new ArrayList<>();
        collectText(requestBody.path("system"), texts);
        JsonNode messages = requestBody.path("messages");
        if (messages.isArray()) {
            for (JsonNode message : messages) {
                collectText(message.path("content"), texts);
            }
        }
        return String.join("\n", texts);
    }

    public String extractResponseText(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "";
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            List<String> texts = new ArrayList<>();
            collectText(root.path("content"), texts);
            return String.join("\n", texts);
        } catch (Exception ignored) {
            return responseBody;
        }
    }

    public UsageStats extractUsageStats(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return UsageStats.empty();
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return parseUsage(root.path("usage"));
        } catch (Exception ignored) {
            return UsageStats.empty();
        }
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

    private ParsedStreamEvent parseStreamEvent(String eventBlock) {
        String eventName = null;
        StringBuilder dataBuilder = new StringBuilder();
        String[] lines = eventBlock.split("\\r?\\n");
        for (String line : lines) {
            if (line.startsWith("event:")) {
                eventName = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
                if (dataBuilder.length() > 0) {
                    dataBuilder.append('\n');
                }
                dataBuilder.append(line.substring(5).trim());
            }
        }
        if (dataBuilder.length() == 0) {
            return null;
        }
        try {
            JsonNode data = objectMapper.readTree(dataBuilder.toString());
            String textDelta = "";
            if ("content_block_delta".equals(eventName) && "text_delta".equals(data.path("delta").path("type").asText())) {
                textDelta = data.path("delta").path("text").asText("");
            }
            return new ParsedStreamEvent(textDelta, parseUsage(data.path("usage")));
        } catch (Exception ignored) {
            return null;
        }
    }

    private HttpURLConnection openPostConnection(String url,
                                                 JsonNode requestBody,
                                                 String upstreamApiKey,
                                                 String anthropicVersion,
                                                 String anthropicBeta) throws IOException {
        byte[] requestBytes = objectMapper.writeValueAsString(requestBody).getBytes(StandardCharsets.UTF_8);

        HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(connectTimeoutMs);
        connection.setReadTimeout(readTimeoutMs);
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", MediaType.APPLICATION_JSON_VALUE);
        connection.setRequestProperty("Accept", MediaType.ALL_VALUE);
        connection.setRequestProperty("Charset", StandardCharsets.UTF_8.name());
        connection.setRequestProperty("Content-Length", String.valueOf(requestBytes.length));
        connection.setRequestProperty("Connection", "keep-alive");

        if (upstreamApiKey != null && !upstreamApiKey.isBlank()) {
            connection.setRequestProperty("x-api-key", upstreamApiKey);
        }
        if (anthropicVersion != null && !anthropicVersion.isBlank()) {
            connection.setRequestProperty("anthropic-version", anthropicVersion);
        }
        if (anthropicBeta != null && !anthropicBeta.isBlank()) {
            connection.setRequestProperty("anthropic-beta", anthropicBeta);
        }

        try (OutputStream outputStream = connection.getOutputStream()) {
            outputStream.write(requestBytes);
            outputStream.flush();
        }

        return connection;
    }

    private String readResponseBody(HttpURLConnection connection, int statusCode) throws IOException {
        InputStream stream = statusCode >= 400 ? connection.getErrorStream() : connection.getInputStream();
        if (stream == null) {
            return "";
        }
        try (InputStream inputStream = stream) {
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String buildMessagesUrl(String backendUrl) {
        URI uri = URI.create(normalizeBaseUrl(backendUrl));
        String authority = uri.getRawAuthority();
        if (authority == null || authority.isBlank()) {
            throw new IllegalArgumentException("Backend URL must include host: " + backendUrl);
        }
        return new StringBuilder()
                .append(uri.getScheme())
                .append("://")
                .append(authority)
                .append("/v1/messages")
                .toString();
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

    private void collectText(JsonNode node, List<String> texts) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        if (node.isTextual()) {
            String text = node.asText("");
            if (!text.isBlank()) {
                texts.add(text);
            }
            return;
        }
        if (node.isArray()) {
            for (JsonNode item : node) {
                if ("text".equals(item.path("type").asText(""))) {
                    collectText(item.path("text"), texts);
                } else if (item.has("text")) {
                    collectText(item.path("text"), texts);
                }
            }
        }
    }

    private UsageStats parseUsage(JsonNode usage) {
        if (usage == null || usage.isMissingNode() || usage.isNull()) {
            return UsageStats.empty();
        }
        Long inputTokens = readLong(usage, "input_tokens");
        Long outputTokens = readLong(usage, "output_tokens");
        Long cachedTokens = readNestedLong(usage, "input_tokens_details", "cached_tokens");
        if (cachedTokens == null) {
            cachedTokens = readLong(usage, "cached_tokens");
        }
        return new UsageStats(inputTokens, outputTokens, cachedTokens);
    }

    private Long readLong(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull() || !node.has(fieldName)) {
            return null;
        }
        JsonNode value = node.path(fieldName);
        return value.isNumber() ? value.asLong() : null;
    }

    private Long readNestedLong(JsonNode node, String objectField, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        return readLong(node.path(objectField), fieldName);
    }

    public record ForwardedResponse(int statusCode, String contentType, String body) {
    }

    public record PreparedStreamingResponse(int statusCode, String contentType, HttpURLConnection connection, InputStream inputStream) {
    }

    private record ParsedStreamEvent(String textDelta, UsageStats usageStats) {
    }

    public record StreamSummary(String capturedBody, String visibleContent, UsageStats usageStats) {
    }

    public record UsageStats(Long inputTokens, Long outputTokens, Long cachedInputTokens) {
        public static UsageStats empty() {
            return new UsageStats(null, null, null);
        }

        public boolean hasValues() {
            return inputTokens != null || outputTokens != null || cachedInputTokens != null;
        }

        public long totalInputTokensOr(long fallback) {
            return inputTokens != null ? Math.max(inputTokens, 0L) : fallback;
        }

        public long cachedInputTokensOr(long fallback) {
            long value = cachedInputTokens != null ? Math.max(cachedInputTokens, 0L) : fallback;
            long total = totalInputTokensOr(Long.MAX_VALUE);
            return Math.min(value, total);
        }

        public long actualInputTokensOr(long fallback) {
            long total = totalInputTokensOr(fallback);
            long cached = Math.min(cachedInputTokensOr(0L), total);
            return Math.max(total - cached, 0L);
        }

        public long outputTokensOr(long fallback) {
            return outputTokens != null ? Math.max(outputTokens, 0L) : fallback;
        }

        public UsageStats merge(UsageStats other) {
            if (other == null || !other.hasValues()) {
                return this;
            }
            return new UsageStats(
                    other.inputTokens != null ? other.inputTokens : inputTokens,
                    other.outputTokens != null ? other.outputTokens : outputTokens,
                    other.cachedInputTokens != null ? other.cachedInputTokens : cachedInputTokens
            );
        }
    }
}
