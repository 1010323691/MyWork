package com.nexusai.llm.gateway.service;

import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class AdminUserBootstrapService implements ApplicationRunner {

    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_ROLE = "ADMIN";
    private static final String ADMIN_EMAIL = "admin@localhost";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String datasourcePassword;

    public AdminUserBootstrapService(UserRepository userRepository,
                                     PasswordEncoder passwordEncoder,
                                     @Value("${spring.datasource.password:}") String datasourcePassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.datasourcePassword = datasourcePassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUserRole(ADMIN_ROLE)) {
            return;
        }

        String encodedPassword = passwordEncoder.encode(datasourcePassword);
        boolean adminUsernameExists = userRepository.existsByUsername(ADMIN_USERNAME);
        User adminUser = adminUsernameExists
                ? promoteExistingAdmin(userRepository.findByUsername(ADMIN_USERNAME).orElseThrow(), encodedPassword)
                : createInitialAdmin(encodedPassword);
        String action = adminUsernameExists ? "promote_existing_admin_user" : "create_initial_admin_user";

        if (datasourcePassword == null || datasourcePassword.isBlank()) {
            log.warn("bootstrap_admin_user | userId={} | username={} | action={} | datasourcePasswordBlank=true",
                    adminUser.getId(),
                    adminUser.getUsername(),
                    action);
            return;
        }

        log.info("bootstrap_admin_user | userId={} | username={} | action={} | datasourcePasswordBlank=false",
                adminUser.getId(),
                adminUser.getUsername(),
                action);
    }

    private User promoteExistingAdmin(User existingUser, String encodedPassword) {
        existingUser.setPassword(encodedPassword);
        existingUser.setUserRole(ADMIN_ROLE);
        existingUser.setEnabled(true);
        if (existingUser.getEmail() == null || existingUser.getEmail().isBlank()) {
            existingUser.setEmail(ADMIN_EMAIL);
        }
        return userRepository.save(existingUser);
    }

    private User createInitialAdmin(String encodedPassword) {
        User adminUser = User.builder()
                .username(ADMIN_USERNAME)
                .password(encodedPassword)
                .email(ADMIN_EMAIL)
                .enabled(true)
                .userRole(ADMIN_ROLE)
                .build();
        return userRepository.save(adminUser);
    }
}
