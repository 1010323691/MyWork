package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.entity.ApiKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class ApiKeyConcurrencyGuard {

    private static final String UNKNOWN_API_KEY_SLOT = "__unknown__";

    private final ConcurrentHashMap<String, Semaphore> apiKeySemaphores = new ConcurrentHashMap<>();
    private final int maxConcurrentRequestsPerApiKey;
    private final int maxConcurrentRequests;
    private final Semaphore globalSemaphore;

    public ApiKeyConcurrencyGuard(@Value("${gateway.apikey.max-concurrent-requests:1}") int maxConcurrentRequestsPerApiKey,
                                  @Value("${gateway.concurrent.max-requests:8}") int maxConcurrentRequests) {
        this.maxConcurrentRequestsPerApiKey = maxConcurrentRequestsPerApiKey;
        this.maxConcurrentRequests = maxConcurrentRequests;
        this.globalSemaphore = maxConcurrentRequests > 0 ? new Semaphore(maxConcurrentRequests, true) : null;
    }

    public Permit acquire(ApiKey apiKey) {
        Permit globalPermit = acquireSemaphore(globalSemaphore, maxConcurrentRequests);
        if (maxConcurrentRequestsPerApiKey <= 0) {
            return globalPermit;
        }

        String slotKey = resolveSlotKey(apiKey);
        Semaphore apiKeySemaphore = apiKeySemaphores.computeIfAbsent(
                slotKey,
                ignored -> new Semaphore(maxConcurrentRequestsPerApiKey, true)
        );

        try {
            Permit apiKeyPermit = acquireSemaphore(apiKeySemaphore, maxConcurrentRequestsPerApiKey);
            return Permit.combined(globalPermit, apiKeyPermit);
        } catch (RuntimeException e) {
            globalPermit.close();
            throw e;
        }
    }

    private Permit acquireSemaphore(Semaphore semaphore, int limit) {
        if (semaphore == null || limit <= 0) {
            return Permit.unlimited(limit);
        }

        try {
            semaphore.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for request concurrency slot", e);
        }

        return Permit.acquired(limit, semaphore::release);
    }

    private String resolveSlotKey(ApiKey apiKey) {
        if (apiKey == null) {
            return UNKNOWN_API_KEY_SLOT;
        }
        if (apiKey.getId() != null) {
            return "id:" + apiKey.getId();
        }
        if (apiKey.getApiKeyValue() != null && !apiKey.getApiKeyValue().isBlank()) {
            return "key:" + apiKey.getApiKeyValue();
        }
        return UNKNOWN_API_KEY_SLOT;
    }

    public static final class Permit implements AutoCloseable {

        private static final Permit UNLIMITED = new Permit(true, 0, null);

        private final boolean acquired;
        private final int limit;
        private final Runnable releaser;
        private final AtomicBoolean released = new AtomicBoolean(false);

        private Permit(boolean acquired, int limit, Runnable releaser) {
            this.acquired = acquired;
            this.limit = limit;
            this.releaser = releaser;
        }

        private static Permit acquired(int limit, Runnable releaser) {
            return new Permit(true, limit, releaser);
        }

        private static Permit unlimited(int limit) {
            if (limit <= 0) {
                return UNLIMITED;
            }
            return new Permit(true, limit, null);
        }

        private static Permit combined(Permit first, Permit second) {
            if (first.releaser == null && second.releaser == null) {
                return UNLIMITED;
            }
            return new Permit(true, Math.max(first.limit, second.limit), () -> {
                try {
                    second.close();
                } finally {
                    first.close();
                }
            });
        }

        public boolean acquired() {
            return acquired;
        }

        public int limit() {
            return limit;
        }

        @Override
        public void close() {
            if (!acquired || releaser == null || !released.compareAndSet(false, true)) {
                return;
            }
            releaser.run();
        }
    }
}
