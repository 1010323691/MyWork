package com.nexusai.llm.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Service
public class OpenAiForwardService {

    private static final Logger logger = LoggerFactory.getLogger(OpenAiForwardService.class);
    private static final int MAX_CAPTURED_BODY_LENGTH = 4000;

    private final ObjectMapper objectMapper;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;

    public OpenAiForwardService(ObjectMapper objectMapper,
                                @Value("${gateway.forward.connect-timeout-seconds:30}") long connectTimeoutSeconds,
                                @Value("${gateway.forward.read-timeout-seconds:300}") long readTimeoutSeconds) {
        this.objectMapper = objectMapper;
        this.connectTimeoutMs = Math.toIntExact(connectTimeoutSeconds * 1000);
        this.readTimeoutMs = Math.toIntExact(readTimeoutSeconds * 1000);
    }

    public ForwardedResponse forwardChatRequest(String backendUrl, JsonNode requestBody, String upstreamApiKey) {
        HttpURLConnection connection = null;
        try {
            String requestUrl = buildChatCompletionsUrl(backendUrl);
            logger.info("Sending non-stream request to upstream: url={}, upstreamKeyPresent={}",
                    requestUrl, upstreamApiKey != null && !upstreamApiKey.isBlank());

            connection = openPostConnection(requestUrl, requestBody, upstreamApiKey);
            int statusCode = connection.getResponseCode();
            String contentType = Optional.ofNullable(connection.getContentType()).orElse(MediaType.APPLICATION_JSON_VALUE);
            String responseBody = readResponseBody(connection, statusCode);

            logger.info("Received non-stream response from upstream: url={}, status={}", requestUrl, statusCode);
            return new ForwardedResponse(statusCode, contentType, responseBody);
        } catch (IOException e) {
            logger.error("Forward request failed: {}", e.getMessage(), e);
            throw new RuntimeException("Backend service error: " + e.getMessage(), e);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    public PreparedStreamingResponse openStreamingChatRequest(String backendUrl, JsonNode requestBody, String upstreamApiKey) {
        try {
            String requestUrl = buildChatCompletionsUrl(backendUrl);
            logger.info("Opening stream request to upstream: url={}, upstreamKeyPresent={}",
                    requestUrl, upstreamApiKey != null && !upstreamApiKey.isBlank());

            HttpURLConnection connection = openPostConnection(requestUrl, requestBody, upstreamApiKey);
            int statusCode = connection.getResponseCode();
            String contentType = Optional.ofNullable(connection.getContentType()).orElse(MediaType.TEXT_EVENT_STREAM_VALUE);
            InputStream inputStream = statusCode >= 400 ? connection.getErrorStream() : connection.getInputStream();

            if (inputStream == null) {
                connection.disconnect();
                throw new IOException("Upstream returned no response body");
            }

            logger.info("Upstream stream headers received: url={}, status={}", requestUrl, statusCode);
            return new PreparedStreamingResponse(statusCode, contentType, connection, inputStream);
        } catch (IOException e) {
            logger.error("Open streaming request failed: {}", e.getMessage(), e);
            throw new RuntimeException("Backend service error: " + e.getMessage(), e);
        }
    }

    public StreamSummary relayStream(HttpURLConnection connection, InputStream inputStream, OutputStream outputStream) throws IOException {
        StringBuilder captured = new StringBuilder();
        StringBuilder visibleContent = new StringBuilder();
        StringBuilder eventBuffer = new StringBuilder();
        byte[] buffer = new byte[8192];
        long totalBytes = 0L;
        long outputTokens = 0L;

        try (InputStream upstream = inputStream) {
            int read;
            while ((read = upstream.read(buffer)) != -1) {
                totalBytes += read;
                outputStream.write(buffer, 0, read);
                outputStream.flush();

                if (captured.length() < MAX_CAPTURED_BODY_LENGTH) {
                    int remaining = MAX_CAPTURED_BODY_LENGTH - captured.length();
                    captured.append(new String(buffer, 0, Math.min(read, remaining), StandardCharsets.UTF_8));
                }

                String chunkText = new String(buffer, 0, read, StandardCharsets.UTF_8);
                eventBuffer.append(chunkText);
                ParsedStreamStats parsedStats = parseStreamingStats(eventBuffer.toString());
                eventBuffer.setLength(0);
                eventBuffer.append(parsedStats.remainingBuffer());
                if (parsedStats.outputTokens() > 0) {
                    outputTokens = parsedStats.outputTokens();
                }
                if (!parsedStats.deltaContent().isEmpty()) {
                    visibleContent.append(parsedStats.deltaContent());
                }
            }
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }

        logger.info("Completed stream relay from upstream: bytes={}, capturedChars={}", totalBytes, captured.length());
        return new StreamSummary(
                captured.toString(),
                visibleContent.toString(),
                outputTokens
        );
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

    private HttpURLConnection openPostConnection(String url, JsonNode requestBody, String upstreamApiKey) throws IOException {
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
            connection.setRequestProperty("Authorization", "Bearer " + upstreamApiKey);
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

    private String buildChatCompletionsUrl(String backendUrl) {
        URI uri = URI.create(normalizeBaseUrl(backendUrl));
        String authority = uri.getRawAuthority();
        if (authority == null || authority.isBlank()) {
            throw new IllegalArgumentException("Backend URL must include host: " + backendUrl);
        }

        StringBuilder builder = new StringBuilder()
                .append(uri.getScheme())
                .append("://")
                .append(authority)
                .append("/v1/chat/completions");

        return builder.toString();
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

    public record PreparedStreamingResponse(int statusCode, String contentType, HttpURLConnection connection, InputStream inputStream) {
    }

    private ParsedStreamStats parseStreamingStats(String buffer) {
        StringBuilder remaining = new StringBuilder();
        StringBuilder deltaContent = new StringBuilder();
        long outputTokens = 0L;

        String[] lines = buffer.split("\\r?\\n");
        boolean endsWithNewline = buffer.endsWith("\n") || buffer.endsWith("\r");

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            boolean lastLine = i == lines.length - 1;
            if (lastLine && !endsWithNewline) {
                remaining.append(line);
                continue;
            }

            if (!line.startsWith("data: ")) {
                continue;
            }

            String payload = line.substring(6).trim();
            if (payload.isEmpty() || "[DONE]".equals(payload)) {
                continue;
            }

            try {
                JsonNode root = objectMapper.readTree(payload);
                JsonNode usage = root.path("usage");
                if (usage.has("completion_tokens")) {
                    outputTokens = usage.path("completion_tokens").asLong(outputTokens);
                }

                JsonNode contentNode = root.path("choices").path(0).path("delta").path("content");
                if (!contentNode.isMissingNode() && !contentNode.isNull()) {
                    deltaContent.append(contentNode.asText(""));
                }
            } catch (Exception ignored) {
                remaining.append(line);
            }
        }

        return new ParsedStreamStats(remaining.toString(), deltaContent.toString(), outputTokens);
    }

    private record ParsedStreamStats(String remainingBuffer, String deltaContent, long outputTokens) {
    }

    public record StreamSummary(String capturedBody, String visibleContent, long outputTokens) {
    }
}
