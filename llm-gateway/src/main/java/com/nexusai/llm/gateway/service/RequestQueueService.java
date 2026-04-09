package com.nexusai.llm.gateway.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.*;

/**
 * 请求队列服务
 * 按用户串行化请求，防止并发超扣余额
 */
@Service
public class RequestQueueService {

    private static final Logger logger = LoggerFactory.getLogger(RequestQueueService.class);

    // 每个用户的请求队列
    private final ConcurrentHashMap<Long, BlockingQueue<Runnable>> userQueues = new ConcurrentHashMap<>();

    // 每个用户的线程池
    private final ConcurrentHashMap<Long, ExecutorService> userExecutors = new ConcurrentHashMap<>();

    /**
     * 带队列的请求执行
     * @param userId 用户 ID
     * @param task 任务
     * @param <T> 返回类型
     * @return 任务执行结果
     */
    public <T> T executeWithQueue(Long userId, Callable<T> task) throws InterruptedException, ExecutionException {
        // 获取或创建该用户的队列和执行器
        BlockingQueue<Runnable> queue = userQueues.computeIfAbsent(userId, k -> new LinkedBlockingQueue<>());
        ExecutorService executor = userExecutors.computeIfAbsent(userId, k -> Executors.newSingleThreadExecutor());

        // 创建 CompletableFuture 存储结果
        CompletableFuture<T> resultFuture = new CompletableFuture<>();

        // 提交任务到队列
        Runnable queuedTask = () -> {
            try {
                T result = task.call();
                resultFuture.complete(result);
            } catch (Exception e) {
                resultFuture.completeExceptionally(e);
            }
        };

        queue.put(queuedTask);
        executor.execute(queuedTask);

        // 等待结果
        return resultFuture.get();
    }

    /**
     * 简单实现：使用同步锁实现串行化
     * 每个用户一个锁对象
     */
    private final ConcurrentHashMap<Long, Object> userLocks = new ConcurrentHashMap<>();

    /**
     * 同步执行任务（简单实现）
     * @param userId 用户 ID
     * @param task 任务
     * @param <T> 返回类型
     * @return 任务执行结果
     */
    public <T> T executeSync(Long userId, Callable<T> task) throws Exception {
        Object lock = userLocks.computeIfAbsent(userId, k -> new Object());

        synchronized (lock) {
            return task.call();
        }
    }

    /**
     * 清理用户的队列和资源
     * @param userId 用户 ID
     */
    public void cleanup(Long userId) {
        BlockingQueue<Runnable> queue = userQueues.remove(userId);
        ExecutorService executor = userExecutors.remove(userId);

        if (executor != null) {
            executor.shutdownNow();
        }

        logger.debug("Cleaned up request queue for user: {}", userId);
    }

    /**
     * 关闭所有队列（应用关闭时调用）
     */
    public void shutdown() {
        userQueues.clear();
        userExecutors.values().forEach(executor -> executor.shutdownNow());
        userExecutors.clear();
        logger.info("Request queue service shutdown");
    }
}
