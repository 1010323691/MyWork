package com.nexusai.llm.gateway.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusai.llm.gateway.entity.ApiKey;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private final ApiKeyService apiKeyService;
    private final ObjectMapper objectMapper;
    private List<String> skipPaths = List.of();

    public ApiKeyAuthenticationFilter(ApiKeyService apiKeyService, ObjectMapper objectMapper) {
        this.apiKeyService = apiKeyService;
        this.objectMapper = objectMapper;
    }

    public void setSkipPaths(List<String> skipPaths) {
        this.skipPaths = skipPaths;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        if (shouldSkip(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String apiKey = request.getHeader("X-API-Key");

        if (apiKey == null || !apiKey.startsWith("nkey_")) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Missing or invalid API key");
            return;
        }

        var apiKeyOpt = apiKeyService.findByKeyNoCache(apiKey);
        if (apiKeyOpt.isEmpty()) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid API key");
            return;
        }

        ApiKey key = apiKeyOpt.get();

        if (!Boolean.TRUE.equals(key.getEnabled())) {
            sendError(response, HttpServletResponse.SC_FORBIDDEN, "API key is disabled");
            return;
        }

        if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            sendError(response, HttpServletResponse.SC_FORBIDDEN, "API key has expired");
            return;
        }

        // 设置 SecurityContext
        User principal = new User(
                key.getId().toString(),
                "",
                Collections.singletonList(new SimpleGrantedAuthority("API_USER"))
        );
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 将 API Key 信息存储到 request 属性中，供后续使用
        request.setAttribute("apiKey", key);

        filterChain.doFilter(request, response);
    }

    private void sendError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        Map<String, Object> error = Map.of(
                "error", message,
                "status", status
        );
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }

    private boolean shouldSkip(HttpServletRequest request) {
        String path = request.getServletPath();
        for (String skipPath : skipPaths) {
            if (skipPath.endsWith("/**")) {
                String prefix = skipPath.substring(0, skipPath.length() - 3);
                if (path.startsWith(prefix)) {
                    return true;
                }
            } else if (path.equals(skipPath)) {
                return true;
            }
        }
        return false;
    }
}
