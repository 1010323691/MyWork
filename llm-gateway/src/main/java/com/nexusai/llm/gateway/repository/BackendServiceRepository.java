package com.nexusai.llm.gateway.repository;

import com.nexusai.llm.gateway.entity.BackendService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BackendServiceRepository extends JpaRepository<BackendService, Long> {
    List<BackendService> findByEnabled(Boolean enabled);
}
