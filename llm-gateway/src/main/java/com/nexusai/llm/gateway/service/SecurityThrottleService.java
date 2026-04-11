package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.config.SecurityProtectionProperties;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class SecurityThrottleService {

    private final SecurityProtectionProperties protectionProperties;
    private final Map<String, FixedWindowCounter> requestCounters = new ConcurrentHashMap<>();
    private final Map<String, FixedWindowCounter> loginFailureCounters = new ConcurrentHashMap<>();
    private final Map<String, Long> loginLocks = new ConcurrentHashMap<>();
    private final AtomicLong cleanupTicker = new AtomicLong();

    public SecurityThrottleService(SecurityProtectionProperties protectionProperties) {
        this.protectionProperties = protectionProperties;
    }

    public RateLimitDecision checkRateLimit(String scope, String key, int maxRequests, Duration window) {
        if (!protectionProperties.isEnabled() || key == null || key.isBlank() || maxRequests <= 0 || window.isZero() || window.isNegative()) {
            return RateLimitDecision.permit();
        }

        long now = System.currentTimeMillis();
        long windowMillis = window.toMillis();
        String mapKey = scope + ":" + key;

        FixedWindowCounter counter = requestCounters.compute(mapKey, (ignored, existing) -> {
            if (existing == null || existing.isExpired(now, windowMillis)) {
                return new FixedWindowCounter(now, 1);
            }
            existing.increment();
            return existing;
        });

        maybeCleanup(now, windowMillis);

        if (counter.getCount() <= maxRequests) {
            return RateLimitDecision.permit();
        }

        long retryAfterMillis = Math.max(1000L, (counter.getWindowStart() + windowMillis) - now);
        return RateLimitDecision.blocked(Duration.ofMillis(retryAfterMillis));
    }

    public LoginBlockDecision checkLoginAllowed(String clientIp, String username) {
        if (!protectionProperties.isEnabled()) {
            return LoginBlockDecision.permit();
        }

        long now = System.currentTimeMillis();
        String ipKey = "login-ip:" + normalize(clientIp);
        String userKey = "login-user:" + normalize(username);

        clearExpiredLock(ipKey, now);
        clearExpiredLock(userKey, now);

        Long ipLockedUntil = loginLocks.get(ipKey);
        Long userLockedUntil = loginLocks.get(userKey);
        long lockedUntil = Math.max(ipLockedUntil == null ? 0L : ipLockedUntil, userLockedUntil == null ? 0L : userLockedUntil);
        if (lockedUntil <= now) {
            return LoginBlockDecision.permit();
        }

        return LoginBlockDecision.blocked(Duration.ofMillis(lockedUntil - now));
    }

    public void recordLoginFailure(String clientIp, String username) {
        if (!protectionProperties.isEnabled()) {
            return;
        }

        SecurityProtectionProperties.FailureLock failure = protectionProperties.getLogin().getFailure();
        Duration window = Duration.ofMinutes(Math.max(1, failure.getWindowMinutes()));
        long now = System.currentTimeMillis();

        updateFailureCounter("login-ip:" + normalize(clientIp), failure, window, now);
        updateFailureCounter("login-user:" + normalize(username), failure, window, now);
        maybeCleanup(now, window.toMillis());
    }

    public void resetLoginFailures(String clientIp, String username) {
        if (!protectionProperties.isEnabled()) {
            return;
        }

        loginFailureCounters.remove("login-ip:" + normalize(clientIp));
        loginFailureCounters.remove("login-user:" + normalize(username));
        loginLocks.remove("login-ip:" + normalize(clientIp));
        loginLocks.remove("login-user:" + normalize(username));
    }

    private void updateFailureCounter(
            String key,
            SecurityProtectionProperties.FailureLock failure,
            Duration window,
            long now
    ) {
        long windowMillis = window.toMillis();
        FixedWindowCounter counter = loginFailureCounters.compute(key, (ignored, existing) -> {
            if (existing == null || existing.isExpired(now, windowMillis)) {
                return new FixedWindowCounter(now, 1);
            }
            existing.increment();
            return existing;
        });

        if (counter.getCount() >= failure.getMaxAttempts()) {
            long lockedUntil = now + Duration.ofMinutes(Math.max(1, failure.getLockMinutes())).toMillis();
            loginLocks.put(key, lockedUntil);
        }
    }

    private void clearExpiredLock(String key, long now) {
        Long lockedUntil = loginLocks.get(key);
        if (lockedUntil != null && lockedUntil <= now) {
            loginLocks.remove(key);
            loginFailureCounters.remove(key);
        }
    }

    private void maybeCleanup(long now, long latestWindowMillis) {
        if (cleanupTicker.incrementAndGet() % 200 != 0) {
            return;
        }

        requestCounters.entrySet().removeIf(entry -> entry.getValue().isExpired(now, latestWindowMillis * 2));
        loginFailureCounters.entrySet().removeIf(entry -> entry.getValue().isExpired(now, latestWindowMillis * 2));
        loginLocks.entrySet().removeIf(entry -> entry.getValue() <= now);
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.trim().toLowerCase();
    }

    private static final class FixedWindowCounter {
        private final long windowStart;
        private int count;

        private FixedWindowCounter(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }

        private boolean isExpired(long now, long windowMillis) {
            return now - windowStart >= windowMillis;
        }

        private void increment() {
            count++;
        }

        private long getWindowStart() {
            return windowStart;
        }

        private int getCount() {
            return count;
        }
    }

    public record RateLimitDecision(boolean allowed, long retryAfterSeconds) {
        public static RateLimitDecision permit() {
            return new RateLimitDecision(true, 0);
        }

        public static RateLimitDecision blocked(Duration retryAfter) {
            return new RateLimitDecision(false, Math.max(1, retryAfter.toSeconds()));
        }
    }

    public record LoginBlockDecision(boolean allowed, long retryAfterSeconds) {
        public static LoginBlockDecision permit() {
            return new LoginBlockDecision(true, 0);
        }

        public static LoginBlockDecision blocked(Duration retryAfter) {
            return new LoginBlockDecision(false, Math.max(1, retryAfter.toSeconds()));
        }
    }
}
