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

@Service
public class UserBalanceService {

    private static final Logger logger = LoggerFactory.getLogger(UserBalanceService.class);
    private static final int MAX_RETRY = 3;
    private static final BigDecimal MILLION = BigDecimal.valueOf(1_000_000);

    private final UserRepository userRepository;
    private final BalanceTransactionService balanceTransactionService;

    public UserBalanceService(UserRepository userRepository,
                              BalanceTransactionService balanceTransactionService) {
        this.userRepository = userRepository;
        this.balanceTransactionService = balanceTransactionService;
    }

    public BigDecimal getBalance(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        return user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO;
    }

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

    @Transactional
    public boolean deductBalance(Long userId, BigDecimal amount) {
        return deductBalanceWithRetry(userId, amount, MAX_RETRY, null, null);
    }

    @Transactional
    public boolean deductBalance(Long userId, BigDecimal amount, String referenceId, String modelName) {
        return deductBalanceWithRetry(userId, amount, MAX_RETRY, referenceId, modelName);
    }

    private boolean deductBalanceWithRetry(Long userId,
                                           BigDecimal amount,
                                           int retryCount,
                                           String referenceId,
                                           String modelName) {
        for (int i = 0; i < retryCount; i++) {
            try {
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId));

                BigDecimal currentBalance = user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO;
                if (currentBalance.compareTo(amount) < 0) {
                    logger.warn("Insufficient balance for user {}: balance={}, requested={}",
                            userId, currentBalance, amount);
                    return false;
                }

                BigDecimal newBalance = currentBalance.subtract(amount);
                user.setBalance(newBalance);

                userRepository.save(user);
                balanceTransactionService.recordUsage(user, amount, currentBalance, newBalance, referenceId, modelName);
                logger.info("Balance deducted for user {}: {} -> {}", userId, currentBalance, newBalance);
                return true;
            } catch (OptimisticLockingFailureException e) {
                logger.debug("Optimistic locking failure for user {}, retry {}/{}", userId, i + 1, retryCount);
                if (i == retryCount - 1) {
                    logger.error("Failed to deduct balance for user {} after {} retries", userId, retryCount);
                    return false;
                }
            }
        }
        return false;
    }

    @Transactional
    public BigDecimal adjustBalance(Long userId, BigDecimal amount, String actor) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        BigDecimal currentBalance = user.getBalance() != null ? user.getBalance() : BigDecimal.ZERO;
        BigDecimal newBalance = currentBalance.add(amount);

        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Balance cannot be negative");
        }

        user.setBalance(newBalance);
        userRepository.save(user);
        balanceTransactionService.recordAdjustment(user, amount, currentBalance, newBalance, actor);

        logger.debug("Balance adjusted for user {}: {} -> {} (adjustment: {})",
                userId, currentBalance, newBalance, amount);

        return newBalance;
    }
}
