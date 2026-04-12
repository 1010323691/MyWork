package com.nexusai.llm.gateway.security;

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

@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    public static final String REQUEST_ATTR_API_KEY_STATUS = "gatewayApiKeyStatus";

    private final ApiKeyService apiKeyService;
    private List<String> skipPaths = List.of();

    public ApiKeyAuthenticationFilter(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
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

        String apiKeyValue = extractApiKey(request);
        if (apiKeyValue == null || apiKeyValue.isBlank()) {
            request.setAttribute(REQUEST_ATTR_API_KEY_STATUS, "missing");
            filterChain.doFilter(request, response);
            return;
        }

        var apiKeyOpt = apiKeyService.findByKey(apiKeyValue);
        if (apiKeyOpt.isEmpty()) {
            request.setAttribute(REQUEST_ATTR_API_KEY_STATUS, "provided_but_rejected");
            filterChain.doFilter(request, response);
            return;
        }

        ApiKey key = apiKeyOpt.get();
        if (!Boolean.TRUE.equals(key.getEnabled())) {
            request.setAttribute(REQUEST_ATTR_API_KEY_STATUS, "authenticated_but_disabled");
            filterChain.doFilter(request, response);
            return;
        }

        if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            request.setAttribute(REQUEST_ATTR_API_KEY_STATUS, "authenticated_but_expired");
            filterChain.doFilter(request, response);
            return;
        }

        User principal = new User(
                key.getId().toString(),
                "",
                Collections.singletonList(new SimpleGrantedAuthority("API_USER"))
        );
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        request.setAttribute("apiKey", key);
        request.setAttribute(REQUEST_ATTR_API_KEY_STATUS, "authenticated");

        filterChain.doFilter(request, response);
    }

    private String extractApiKey(HttpServletRequest request) {
        String path = request.getServletPath();
        if ("/v1/messages".equals(path)) {
            String authorizationToken = extractBearerToken(request.getHeader("Authorization"));
            if (authorizationToken != null) {
                return authorizationToken;
            }
        }

        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null && !apiKey.isBlank()) {
            return apiKey.trim();
        }

        apiKey = request.getHeader("x-api-key");
        if (apiKey != null && !apiKey.isBlank()) {
            return apiKey.trim();
        }

        return extractBearerToken(request.getHeader("Authorization"));
    }

    private String extractBearerToken(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }
        if (!authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        String bearerToken = authorization.substring(7).trim();
        return bearerToken.isBlank() ? null : bearerToken;
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
