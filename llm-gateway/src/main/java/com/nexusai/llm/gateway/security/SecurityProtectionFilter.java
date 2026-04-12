package com.nexusai.llm.gateway.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusai.llm.gateway.config.SecurityProtectionProperties;
import com.nexusai.llm.gateway.entity.ApiKey;
import com.nexusai.llm.gateway.service.SecurityThrottleService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

@Component
public class SecurityProtectionFilter extends OncePerRequestFilter {

    private final SecurityThrottleService throttleService;
    private final SecurityProtectionProperties protectionProperties;
    private final ObjectMapper objectMapper;

    public SecurityProtectionFilter(
            SecurityThrottleService throttleService,
            SecurityProtectionProperties protectionProperties,
            ObjectMapper objectMapper
    ) {
        this.throttleService = throttleService;
        this.protectionProperties = protectionProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        if (!protectionProperties.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getServletPath();
        String method = request.getMethod();

        if (HttpMethod.POST.matches(method) && "/api/auth/login".equals(path)) {
            var decision = throttleService.checkRateLimit(
                    "login-ip",
                    ClientRequestUtils.resolveClientIp(request),
                    protectionProperties.getLogin().getIpMaxRequests(),
                    Duration.ofMinutes(Math.max(1, protectionProperties.getLogin().getIpWindowMinutes()))
            );
            if (!decision.allowed()) {
                sendRateLimitResponse(response, "Too many login requests", decision.retryAfterSeconds());
                return;
            }
        } else if (HttpMethod.POST.matches(method) && "/api/auth/register".equals(path)) {
            var decision = throttleService.checkRateLimit(
                    "register-ip",
                    ClientRequestUtils.resolveClientIp(request),
                    protectionProperties.getRegister().getIpMaxRequests(),
                    Duration.ofMinutes(Math.max(1, protectionProperties.getRegister().getIpWindowMinutes()))
            );
            if (!decision.allowed()) {
                sendRateLimitResponse(response, "Too many registration requests", decision.retryAfterSeconds());
                return;
            }
        } else {
            SecurityThrottleService.RateLimitDecision decision = checkApiRateLimit(request, path, method);
            if (!decision.allowed()) {
                sendRateLimitResponse(response, "Too many requests", decision.retryAfterSeconds());
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private SecurityThrottleService.RateLimitDecision checkApiRateLimit(
            HttpServletRequest request,
            String path,
            String method
    ) {
        if (isCompletionEndpoint(path, method)) {
            return throttleService.checkRateLimit(
                    "completion",
                    resolveActor(request),
                    protectionProperties.getCompletion().getMaxRequests(),
                    Duration.ofMinutes(Math.max(1, protectionProperties.getCompletion().getWindowMinutes()))
            );
        }

        if (isProtectedWriteEndpoint(path, method)) {
            return throttleService.checkRateLimit(
                    "write",
                    resolveActor(request),
                    protectionProperties.getWrite().getMaxRequests(),
                    Duration.ofMinutes(Math.max(1, protectionProperties.getWrite().getWindowMinutes()))
            );
        }

        return SecurityThrottleService.RateLimitDecision.permit();
    }

    private boolean isCompletionEndpoint(String path, String method) {
        return HttpMethod.POST.matches(method)
                && ("/v1/chat/completions".equals(path) || "/v1/messages".equals(path) || "/api/llm/chat".equals(path));
    }

    private boolean isProtectedWriteEndpoint(String path, String method) {
        if (!(HttpMethod.POST.matches(method)
                || HttpMethod.PUT.matches(method)
                || HttpMethod.PATCH.matches(method)
                || HttpMethod.DELETE.matches(method))) {
            return false;
        }

        if (path.startsWith("/api/auth/")) {
            return false;
        }

        return path.startsWith("/api/") || path.startsWith("/v1/");
    }

    private String resolveActor(HttpServletRequest request) {
        Object apiKeyAttr = request.getAttribute("apiKey");
        if (apiKeyAttr instanceof ApiKey apiKey && apiKey.getId() != null) {
            return "apikey:" + apiKey.getId();
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getName() != null) {
            String name = authentication.getName().trim();
            if (!name.isBlank() && !"anonymousUser".equalsIgnoreCase(name)) {
                return "user:" + name.toLowerCase();
            }
        }

        return "ip:" + ClientRequestUtils.resolveClientIp(request);
    }

    private void sendRateLimitResponse(HttpServletResponse response, String message, long retryAfterSeconds) throws IOException {
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType("application/json");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                "error", message,
                "status", 429,
                "retryAfterSeconds", retryAfterSeconds
        )));
    }
}
