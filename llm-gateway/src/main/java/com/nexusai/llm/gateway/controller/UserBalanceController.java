package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.service.UserBalanceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/balance")
@Slf4j
public class UserBalanceController {

    private final UserBalanceService balanceService;

    @Autowired
    public UserBalanceController(UserBalanceService balanceService) {
        this.balanceService = balanceService;
    }

    @GetMapping("/current")
    public ResponseEntity<BalanceResponse> getCurrentBalance(Authentication authentication) {
        Long userId = extractUserId(authentication);
        BigDecimal balance = balanceService.getBalance(userId);
        return ResponseEntity.ok(new BalanceResponse(balance));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BalanceResponse> getUserBalance(@PathVariable Long userId) {
        BigDecimal balance = balanceService.getBalance(userId);
        return ResponseEntity.ok(new BalanceResponse(balance));
    }

    @PutMapping("/admin/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BalanceResponse> adjustBalance(
            Authentication authentication,
            @PathVariable Long userId,
            @RequestBody BalanceAdjustmentRequest request) {
        BigDecimal balanceBefore = balanceService.getBalance(userId);
        BigDecimal newBalance = balanceService.adjustBalance(userId, request.getAmount());
        log.info("audit_user_balance_adjust | actor={} | userId={} | amount={} | balanceBefore={} | balanceAfter={}",
                actor(authentication),
                userId,
                request.getAmount(),
                balanceBefore,
                newBalance);
        return ResponseEntity.ok(new BalanceResponse(newBalance));
    }

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

    private String actor(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return "unknown";
        }
        return authentication.getName().replace('|', '/').replaceAll("[\\r\\n]+", " ").trim();
    }

    public static class BalanceResponse {
        private final BigDecimal balance;

        public BalanceResponse(BigDecimal balance) {
            this.balance = balance;
        }

        public BigDecimal getBalance() {
            return balance;
        }
    }

    public static class BalanceAdjustmentRequest {
        private BigDecimal amount;

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
    }

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
