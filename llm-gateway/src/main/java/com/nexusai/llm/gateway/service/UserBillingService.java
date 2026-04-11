package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.entity.BackendService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class UserBillingService {

    private static final Logger logger = LoggerFactory.getLogger(UserBillingService.class);

    private final UserBalanceService userBalanceService;

    public UserBillingService(UserBalanceService userBalanceService) {
        this.userBalanceService = userBalanceService;
    }

    public boolean hasEnoughBalance(Long userId, BackendService provider, long estimatedInputTokens) {
        if (userId == null) {
            return true;
        }

        BigDecimal estimatedCost = estimateInputCost(provider, estimatedInputTokens);
        BigDecimal balance = userBalanceService.getBalance(userId);
        return balance.compareTo(estimatedCost) >= 0;
    }

    public BigDecimal estimateInputCost(BackendService provider, long inputTokens) {
        return estimateCost(provider, inputTokens, 0L);
    }

    public BigDecimal estimateCost(BackendService provider, long inputTokens, long outputTokens) {
        BigDecimal inputPrice = provider != null ? provider.getSellPriceInput() : BigDecimal.ZERO;
        BigDecimal outputPrice = provider != null ? provider.getSellPriceOutput() : BigDecimal.ZERO;
        return userBalanceService.estimateCost(inputTokens, outputTokens, inputPrice, outputPrice);
    }

    public BigDecimal settleUsage(Long userId, BackendService provider, long inputTokens, long outputTokens) {
        BigDecimal actualCost = estimateCost(provider, inputTokens, outputTokens);
        if (actualCost.compareTo(BigDecimal.ZERO) <= 0) {
            logger.info("Usage settlement skipped because actual cost is zero or negative: userId={}, providerId={}, providerName={}, inputTokens={}, outputTokens={}, sellPriceInput={}, sellPriceOutput={}, actualCost={}",
                    userId,
                    provider != null ? provider.getId() : null,
                    provider != null ? provider.getName() : null,
                    inputTokens,
                    outputTokens,
                    provider != null ? provider.getSellPriceInput() : null,
                    provider != null ? provider.getSellPriceOutput() : null,
                    actualCost);
        }
        if (userId == null || actualCost.compareTo(BigDecimal.ZERO) <= 0) {
            return actualCost;
        }

        boolean deducted = userBalanceService.deductBalance(userId, actualCost);
        if (!deducted) {
            logger.warn("Failed to deduct settled usage cost from user balance: userId={}, cost={}", userId, actualCost);
        }
        return actualCost;
    }
}
