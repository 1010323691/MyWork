package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.service.UserBalanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

/**
 * 用户余额 Controller
 * 提供余额查询、交易历史等接口
 */
@RestController
@RequestMapping("/api/balance")
public class UserBalanceController {

    private final UserBalanceService balanceService;

    @Autowired
    public UserBalanceController(UserBalanceService balanceService) {
        this.balanceService = balanceService;
    }

    /**
     * 获取当前用户余额
     */
    @GetMapping("/current")
    public ResponseEntity<BalanceResponse> getCurrentBalance(Authentication authentication) {
        Long userId = extractUserId(authentication);
        BigDecimal balance = balanceService.getBalance(userId);
        return ResponseEntity.ok(new BalanceResponse(balance));
    }

    /**
     * 获取指定用户余额（管理员）
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BalanceResponse> getUserBalance(@PathVariable Long userId) {
        BigDecimal balance = balanceService.getBalance(userId);
        return ResponseEntity.ok(new BalanceResponse(balance));
    }

    /**
     * 调整用户余额（管理员充值/扣款）
     */
    @PutMapping("/admin/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BalanceResponse> adjustBalance(
            @PathVariable Long userId,
            @RequestBody BalanceAdjustmentRequest request) {
        BigDecimal newBalance = balanceService.adjustBalance(userId, request.getAmount());
        return ResponseEntity.ok(new BalanceResponse(newBalance));
    }

    /**
     * 估算请求成本
     */
    @PostMapping("/estimate")
    public ResponseEntity<EstimateCostResponse> estimateCost(@RequestBody CostEstimateRequest request) {
        BigDecimal cost = balanceService.estimateCost(
                request.getInputTokens(),
                request.getOutputTokens(),
                request.getSellPriceInput(),
                request.getSellPriceOutput()
        );
        return ResponseEntity.ok(new EstimateCostResponse(cost));
    }

    private Long extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() instanceof String) {
            throw new RuntimeException("User not authenticated");
        }
        User user = (User) authentication.getPrincipal();
        return user.getId();
    }

    /**
     * 余额响应
     */
    public static class BalanceResponse {
        private final BigDecimal balance;

        public BalanceResponse(BigDecimal balance) {
            this.balance = balance;
        }

        public BigDecimal getBalance() {
            return balance;
        }
    }

    /**
     * 余额调整请求
     */
    public static class BalanceAdjustmentRequest {
        private BigDecimal amount;

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
    }

    /**
     * 成本估算请求
     */
    public static class CostEstimateRequest {
        private Long inputTokens;
        private Long outputTokens;
        private BigDecimal sellPriceInput;
        private BigDecimal sellPriceOutput;

        public Long getInputTokens() { return inputTokens; }
        public void setInputTokens(Long inputTokens) { this.inputTokens = inputTokens; }
        public Long getOutputTokens() { return outputTokens; }
        public void setOutputTokens(Long outputTokens) { this.outputTokens = outputTokens; }
        public BigDecimal getSellPriceInput() { return sellPriceInput; }
        public void setSellPriceInput(BigDecimal sellPriceInput) { this.sellPriceInput = sellPriceInput; }
        public BigDecimal getSellPriceOutput() { return sellPriceOutput; }
        public void setSellPriceOutput(BigDecimal sellPriceOutput) { this.sellPriceOutput = sellPriceOutput; }
    }

    /**
     * 成本估算响应
     */
    public static class EstimateCostResponse {
        private final BigDecimal estimatedCost;

        public EstimateCostResponse(BigDecimal estimatedCost) {
            this.estimatedCost = estimatedCost;
        }

        public BigDecimal getEstimatedCost() {
            return estimatedCost;
        }
    }
}
