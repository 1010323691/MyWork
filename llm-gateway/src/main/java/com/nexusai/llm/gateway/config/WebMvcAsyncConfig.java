package com.nexusai.llm.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcAsyncConfig implements WebMvcConfigurer {

    private final long asyncTimeoutMs;
    private final int corePoolSize;
    private final int maxPoolSize;
    private final int queueCapacity;

    public WebMvcAsyncConfig(
            @Value("${gateway.async.request-timeout-ms:300000}") long asyncTimeoutMs,
            @Value("${gateway.async.executor-core-pool-size:8}") int corePoolSize,
            @Value("${gateway.async.executor-max-pool-size:32}") int maxPoolSize,
            @Value("${gateway.async.executor-queue-capacity:200}") int queueCapacity
    ) {
        this.asyncTimeoutMs = asyncTimeoutMs;
        this.corePoolSize = corePoolSize;
        this.maxPoolSize = maxPoolSize;
        this.queueCapacity = queueCapacity;
    }

    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        configurer.setDefaultTimeout(asyncTimeoutMs);
        configurer.setTaskExecutor(streamingTaskExecutor());
    }

    @Bean(name = "streamingTaskExecutor")
    public AsyncTaskExecutor streamingTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("streaming-");
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setAllowCoreThreadTimeOut(true);
        executor.initialize();
        return executor;
    }
}
