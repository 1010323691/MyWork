package com.nexusai.llm.gateway.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.entity.BackendService;
import com.nexusai.llm.gateway.service.RoutingConfigParser;
import com.nexusai.llm.gateway.service.UpstreamProviderService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Component
public class GatewayRequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(GatewayRequestLoggingFilter.class);

    private final ObjectMapper objectMapper;
    private final RoutingConfigParser routingConfigParser;
    private final UpstreamProviderService upstreamProviderService;

    public GatewayRequestLoggingFilter(ObjectMapper objectMapper,
                                       RoutingConfigParser routingConfigParser,
                                       UpstreamProviderService upstreamProviderService) {
        this.objectMapper = objectMapper;
        this.routingConfigParser = routingConfigParser;
        this.upstreamProviderService = upstreamProviderService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!shouldLog(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        ContentCachingRequestWrapper wrappedRequest = request instanceof ContentCachingRequestWrapper existing
                ? existing
                : new ContentCachingRequestWrapper(request);

        try {
            filterChain.doFilter(wrappedRequest, response);
        } finally {
            logRequest(wrappedRequest, response);
        }
    }

    private boolean shouldLog(HttpServletRequest request) {
        if (!HttpMethod.POST.matches(request.getMethod())) {
            return false;
        }
        String path = request.getServletPath();
        return "/api/llm/chat".equals(path)
                || "/api/chat".equals(path)
                || "/v1/chat/completions".equals(path)
                || "/v1/messages".equals(path);
    }

    private void logRequest(ContentCachingRequestWrapper request, HttpServletResponse response) {
        ApiKey key = (ApiKey) request.getAttribute("apiKey");
        String model = extractModel(request);
        String targetUrl = resolveTargetUrl(request, key, model);
        logger.info("gateway_chat_request_received | requestUrl={} | targetUrl={} | model={} | keyAuthStatus={} | responseStatus={}",
                buildRequestUrl(request),
                targetUrl,
                model,
                buildKeyAuthStatus(request, response, key),
                response.getStatus());
    }

    private String extractModel(ContentCachingRequestWrapper request) {
        byte[] content = request.getContentAsByteArray();
        if (content == null || content.length == 0) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(new String(content, StandardCharsets.UTF_8));
            JsonNode modelNode = root.path("model");
            return modelNode.isMissingNode() || modelNode.isNull() ? null : modelNode.asText(null);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String resolveTargetUrl(HttpServletRequest request, ApiKey key, String model) {
        if (key == null) {
            return null;
        }

        String path = request.getServletPath();
        if ("/api/llm/chat".equals(path) || "/api/chat".equals(path)) {
            return routingConfigParser.resolveTargetUrl(key.getRoutingConfig(), key.getTargetUrl());
        }

        String resolvedModel = routingConfigParser.resolveModel(key.getRoutingConfig(), model);
        String configuredTargetUrl = routingConfigParser.resolveConfiguredTargetUrl(key.getRoutingConfig(), key.getTargetUrl());
        if (configuredTargetUrl != null && !configuredTargetUrl.isBlank()) {
            return configuredTargetUrl;
        }
        Optional<BackendService> providerOptional = upstreamProviderService.findByModelName(resolvedModel);
        return providerOptional.map(BackendService::getBaseUrl).orElse(null);
    }

    private String buildRequestUrl(HttpServletRequest request) {
        StringBuilder requestUrl = new StringBuilder(request.getRequestURL());
        if (request.getQueryString() != null && !request.getQueryString().isBlank()) {
            requestUrl.append('?').append(request.getQueryString());
        }
        return requestUrl.toString();
    }

    private String buildKeyAuthStatus(HttpServletRequest request, HttpServletResponse response, ApiKey key) {
        Object keyStatus = request.getAttribute(ApiKeyAuthenticationFilter.REQUEST_ATTR_API_KEY_STATUS);
        if (keyStatus instanceof String status && !status.isBlank()) {
            return status;
        }
        if (key != null) {
            return Boolean.TRUE.equals(key.getEnabled())
                    ? "authenticated"
                    : "authenticated_but_disabled";
        }

        boolean keyHeaderPresent = hasText(request.getHeader("X-API-Key"))
                || hasText(request.getHeader("x-api-key"))
                || hasBearerToken(request.getHeader("Authorization"));
        if (keyHeaderPresent) {
            return response.getStatus() == HttpServletResponse.SC_UNAUTHORIZED || response.getStatus() == HttpServletResponse.SC_FORBIDDEN
                    ? "provided_but_rejected"
                    : "provided_but_unresolved";
        }
        return "missing";
    }

    private boolean hasBearerToken(String authorization) {
        return hasText(authorization) && authorization.regionMatches(true, 0, "Bearer ", 0, 7);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
