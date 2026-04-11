package com.nexusai.llm.gateway.repository;

import com.nexusai.llm.gateway.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = {"apiKeys"})
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    Long countByCreatedAtGreaterThanEqual(LocalDateTime createdAt);

    Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable);

    @Query(value = """
        SELECT u FROM User u WHERE
        (:userId IS NULL OR u.id = :userId) AND
        (COALESCE(:username, '') = '' OR LOWER(u.username) LIKE LOWER(CONCAT('%', :username, '%')))
        """)
    Page<User> searchUsers(
        @Param("userId") Long userId,
        @Param("username") String username,
        Pageable pageable);
}
