package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.dto.BalanceTransactionResponse;
import com.nexusai.llm.gateway.entity.BalanceTransaction;
import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.BalanceTransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class BalanceTransactionService {

    private final BalanceTransactionRepository balanceTransactionRepository;

    public BalanceTransactionService(BalanceTransactionRepository balanceTransactionRepository) {
        this.balanceTransactionRepository = balanceTransactionRepository;
    }

    @Transactional
    public void recordUsage(User user,
                            BigDecimal amount,
                            BigDecimal balanceBefore,
                            BigDecimal balanceAfter,
                            String referenceId,
                            String modelName) {
        String detail = hasText(modelName)
                ? "模型调用扣费 · " + modelName
                : "模型调用扣费";
        if (hasText(referenceId)) {
            detail = detail + " · 请求ID " + referenceId;
        }

        saveTransaction(user,
                BalanceTransaction.TransactionType.USAGE,
                amount.negate(),
                balanceBefore,
                balanceAfter,
                "模型调用扣费",
                detail,
                referenceId,
                "system");
    }

    @Transactional
    public void recordAdjustment(User user,
                                 BigDecimal amount,
                                 BigDecimal balanceBefore,
                                 BigDecimal balanceAfter,
                                 String actor) {
        boolean recharge = amount.compareTo(BigDecimal.ZERO) >= 0;
        saveTransaction(user,
                recharge ? BalanceTransaction.TransactionType.RECHARGE : BalanceTransaction.TransactionType.ADJUSTMENT,
                amount,
                balanceBefore,
                balanceAfter,
                recharge ? "账户充值" : "管理员扣减",
                recharge ? "管理员为账户增加余额" : "管理员手动扣减余额",
                null,
                sanitizeActor(actor));
    }

    @Transactional(readOnly = true)
    public Page<BalanceTransactionResponse> getUserTransactions(Long userId, int page, int size) {
        return balanceTransactionRepository.findByUser_Id(
                        userId,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    private void saveTransaction(User user,
                                 BalanceTransaction.TransactionType transactionType,
                                 BigDecimal amount,
                                 BigDecimal balanceBefore,
                                 BigDecimal balanceAfter,
                                 String title,
                                 String detail,
                                 String referenceId,
                                 String createdBy) {
        balanceTransactionRepository.save(BalanceTransaction.builder()
                .user(user)
                .transactionType(transactionType)
                .amount(amount)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .title(title)
                .detail(detail)
                .referenceId(referenceId)
                .createdBy(createdBy)
                .build());
    }

    private BalanceTransactionResponse toResponse(BalanceTransaction transaction) {
        return BalanceTransactionResponse.builder()
                .id(transaction.getId())
                .type(transaction.getTransactionType().name())
                .amount(transaction.getAmount())
                .balanceBefore(transaction.getBalanceBefore())
                .balanceAfter(transaction.getBalanceAfter())
                .title(transaction.getTitle())
                .detail(transaction.getDetail())
                .referenceId(transaction.getReferenceId())
                .createdBy(transaction.getCreatedBy())
                .createdAt(transaction.getCreatedAt())
                .build();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String sanitizeActor(String actor) {
        if (!hasText(actor)) {
            return "system";
        }
        return actor.replace('|', '/').replaceAll("[\\r\\n]+", " ").trim();
    }
}
