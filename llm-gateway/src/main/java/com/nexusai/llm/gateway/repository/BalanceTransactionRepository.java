package com.nexusai.llm.gateway.repository;

import com.nexusai.llm.gateway.entity.BalanceTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BalanceTransactionRepository extends JpaRepository<BalanceTransaction, Long> {
    Page<BalanceTransaction> findByUser_Id(Long userId, Pageable pageable);
}
