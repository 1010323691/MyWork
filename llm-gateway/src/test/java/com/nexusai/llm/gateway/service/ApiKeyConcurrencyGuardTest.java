package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.entity.ApiKey;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiKeyConcurrencyGuardTest {

    @Test
    void shouldBlockUntilPreviousRequestReleasesPermit() throws Exception {
        ApiKeyConcurrencyGuard guard = new ApiKeyConcurrencyGuard(1, 8);
        ApiKey apiKey = ApiKey.builder().id(100L).apiKeyValue("test-key").build();

        ApiKeyConcurrencyGuard.Permit first = guard.acquire(apiKey);
        AtomicBoolean secondAcquired = new AtomicBoolean(false);
        Thread waitingThread = new Thread(() -> {
            try (ApiKeyConcurrencyGuard.Permit ignored = guard.acquire(apiKey)) {
                secondAcquired.set(true);
            }
        });

        waitingThread.start();
        Thread.sleep(150L);
        assertFalse(secondAcquired.get());

        first.close();
        waitingThread.join(1000L);

        assertTrue(secondAcquired.get());
    }

    @Test
    void shouldAllowNewRequestAfterPermitReleased() {
        ApiKeyConcurrencyGuard guard = new ApiKeyConcurrencyGuard(1, 8);
        ApiKey apiKey = ApiKey.builder().id(200L).apiKeyValue("test-key").build();

        ApiKeyConcurrencyGuard.Permit first = guard.acquire(apiKey);
        first.close();
        ApiKeyConcurrencyGuard.Permit second = guard.acquire(apiKey);

        assertTrue(second.acquired());

        second.close();
    }

    @Test
    void shouldBypassConcurrencyCheckWhenLimitDisabled() {
        ApiKeyConcurrencyGuard guard = new ApiKeyConcurrencyGuard(0, 0);
        ApiKey apiKey = ApiKey.builder().id(300L).apiKeyValue("test-key").build();

        ApiKeyConcurrencyGuard.Permit first = guard.acquire(apiKey);
        ApiKeyConcurrencyGuard.Permit second = guard.acquire(apiKey);

        assertTrue(first.acquired());
        assertTrue(second.acquired());
    }

    @Test
    void shouldBlockWhenGlobalConcurrencyLimitIsReached() throws Exception {
        ApiKeyConcurrencyGuard guard = new ApiKeyConcurrencyGuard(2, 1);
        ApiKey firstApiKey = ApiKey.builder().id(400L).apiKeyValue("key-1").build();
        ApiKey secondApiKey = ApiKey.builder().id(401L).apiKeyValue("key-2").build();

        ApiKeyConcurrencyGuard.Permit first = guard.acquire(firstApiKey);
        AtomicBoolean secondAcquired = new AtomicBoolean(false);
        Thread waitingThread = new Thread(() -> {
            try (ApiKeyConcurrencyGuard.Permit ignored = guard.acquire(secondApiKey)) {
                secondAcquired.set(true);
            }
        });

        waitingThread.start();
        Thread.sleep(150L);
        assertFalse(secondAcquired.get());

        first.close();
        waitingThread.join(1000L);

        assertTrue(secondAcquired.get());
    }
}
