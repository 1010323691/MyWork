package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

/**
 * 用户余额服务
 * 负责用户余额的查询、冻结、扣减、解冻等操作
 * 使用乐观锁控制并发扣费
 */
@Service
public class UserBalanceService {

    private static final Logger logger = LoggerFactory.getLogger(UserBalanceService.class);

    // 最大重试次数
    private static final int MAX_RETRY = 3;

    // 百万（用于价格计算）
    private static final BigDecimal MILLION = BigDecimal.valueOf(1_000_000);

    private final UserRepository userRepository;

    public UserBalanceService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 获取用户余额
     */
    public BigDecimal getBalance(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        return user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO;
    }

    /**
     * 估算请求成本
     * @param inputTokens 输入 Token 数
     * @param outputTokens 输出 Token 数（估算值）
     * @param sellPriceInput 输入 Token 卖出价（元/百万 Token）
     * @param sellPriceOutput 输出 Token 卖出价（元/百万 Token）
     * @return 预估成本（人民币）
     */
    public BigDecimal estimateCost(long inputTokens, long outputTokens,
                                   BigDecimal sellPriceInput, BigDecimal sellPriceOutput) {
        BigDecimal normalizedSellPriceInput = sellPriceInput != null ? sellPriceInput : BigDecimal.ZERO;
        BigDecimal normalizedSellPriceOutput = sellPriceOutput != null ? sellPriceOutput : BigDecimal.ZERO;

        BigDecimal inputCost = BigDecimal.valueOf(inputTokens)
                .multiply(normalizedSellPriceInput)
                .divide(MILLION, 8, RoundingMode.HALF_UP);

        BigDecimal outputCost = BigDecimal.valueOf(outputTokens)
                .multiply(normalizedSellPriceOutput)
                .divide(MILLION, 8, RoundingMode.HALF_UP);

        return inputCost.add(outputCost);
    }

    /**
     * 冻结余额（用于流式请求预冻结）
     * 注意：当前实现简化为直接预留，实际生产环境需要单独的冻结表
     */
    @Transactional
    public boolean freezeBalance(Long userId, BigDecimal amount) {
        // 简化实现：直接检查余额是否足够
        BigDecimal balance = getBalance(userId);
        return balance.compareTo(amount) >= 0;
    }

    /**
     * 扣减余额（使用乐观锁控制并发）
     * @param userId 用户 ID
     * @param amount 扣减金额
     * @return 扣减是否成功
     */
    @Transactional
    public boolean deductBalance(Long userId, BigDecimal amount) {
        return deductBalanceWithRetry(userId, amount, MAX_RETRY);
    }

    /**
     * 带重试的余额扣减
     */
    private boolean deductBalanceWithRetry(Long userId, BigDecimal amount, int retryCount) {
        for (int i = 0; i < retryCount; i++) {
            try {
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId));

                BigDecimal currentBalance = user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO;

                // 检查余额是否充足
                if (currentBalance.compareTo(amount) < 0) {
                    logger.warn("Insufficient balance for user {}: balance={}, requested={}",
                            userId, currentBalance, amount);
                    return false;
                }

                // 计算新余额
                BigDecimal newBalance = currentBalance.subtract(amount);
                user.setBalance(newBalance);

                userRepository.save(user);
                logger.info("Balance deducted for user {}: {} -> {}", userId, currentBalance, newBalance);
                return true;

            } catch (OptimisticLockingFailureException e) {
                logger.debug("Optimistic locking failure for user {}, retry {}/", userId, i + 1);
                // 乐观锁失败，重试
                if (i == retryCount - 1) {
                    logger.error("Failed to deduct balance for user {} after {} retries", userId, retryCount);
                    return false;
                }
            }
        }
        return false;
    }

    /**
     * 退款/增加余额
     */
    @Transactional
    public boolean refundBalance(Long userId, BigDecimal amount) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        BigDecimal currentBalance = user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO;
        BigDecimal newBalance = currentBalance.add(amount);
        user.setBalance(newBalance);

        userRepository.save(user);
        logger.info("Balance refunded for user {}: {} -> {}", userId, currentBalance, newBalance);
        return true;
    }

    /**
     * 结算余额（用于流式请求完成后的实际扣费）
     * @param userId 用户 ID
     * @param estimatedCost 预估成本
     * @param actualCost 实际成本
     * @return 结算是否成功
     */
    @Transactional
    public boolean settleBalance(Long userId, BigDecimal estimatedCost, BigDecimal actualCost) {
        // 简化实现：直接按实际成本扣减
        // 实际生产环境需要考虑预冻结金额的处理
        return deductBalance(userId, actualCost);
    }

    /**
     * 调整余额（管理员充值/扣款）
     */
    @Transactional
    public BigDecimal adjustBalance(Long userId, BigDecimal amount) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        BigDecimal currentBalance = user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO;
        BigDecimal newBalance = currentBalance.add(amount);

        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Balance cannot be negative");
        }

        user.setBalance(newBalance);
        userRepository.save(user);

        logger.info("Balance adjusted for user {}: {} -> {} (adjustment: {})",
                userId, currentBalance, newBalance, amount);

        return newBalance;
    }

    /**
     * 初始化用户余额（新用户）
     */
    @Transactional
    public void initializeBalance(Long userId, BigDecimal initialBalance) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        if (user.getBalance() == null || user.getBalance().equals(BigDecimal.ZERO)) {
            user.setBalance(initialBalance);
            userRepository.save(user);
            logger.info("Initial balance set for user {}: {}", userId, initialBalance);
        }
    }
}
