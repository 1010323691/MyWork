package com.nexusai.llm.gateway.security;

import jakarta.servlet.http.HttpServletRequest;

public final class ClientRequestUtils {

    private ClientRequestUtils() {
    }

    public static String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String clientIp = forwardedFor.split(",")[0].trim();
            if (!clientIp.isBlank()) {
                return clientIp;
            }
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        String remoteAddr = request.getRemoteAddr();
        return remoteAddr == null || remoteAddr.isBlank() ? "unknown" : remoteAddr.trim();
    }
}
