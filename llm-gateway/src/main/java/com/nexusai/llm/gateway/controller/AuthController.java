package com.nexusai.llm.gateway.controller;

import com.nexusai.llm.gateway.dto.AuthRequest;
import com.nexusai.llm.gateway.dto.RegisterRequest;
import com.nexusai.llm.gateway.entity.User;
import com.nexusai.llm.gateway.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          BCryptPasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request,
                                   HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {
        try {
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                    request.getUsername(), request.getPassword()
            );
            Authentication authenticated = authenticationManager.authenticate(authenticationToken);

            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new BadCredentialsException("User not found"));

            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(authenticated);
            SecurityContextHolder.setContext(securityContext);

            new HttpSessionSecurityContextRepository().saveContext(
                    securityContext,
                    httpRequest,
                    httpResponse
            );

            log.info("auth_login_success | userId={} | username={} | roles={}",
                    user.getId(),
                    sanitize(user.getUsername()),
                    user.getAuthorities());
            return ResponseEntity.ok(Map.of("message", "登录成功"));
        } catch (BadCredentialsException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "用户名或密码错误"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            return ResponseEntity.badRequest().body(Map.of("error", "用户名已存在"));
        }

        if (userRepository.existsByEmail(req.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "邮箱已存在"));
        }

        User user = User.builder()
                .username(req.getUsername())
                .password(passwordEncoder.encode(req.getPassword()))
                .email(req.getEmail())
                .enabled(true)
                .userRole("USER")
                .build();
        userRepository.save(user);

        log.info("audit_user_create | userId={} | username={} | role={} | enabled={}",
                user.getId(),
                sanitize(user.getUsername()),
                sanitize(user.getUserRole()),
                Boolean.TRUE.equals(user.getEnabled()));
        return ResponseEntity.ok(Map.of("message", "注册成功"));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("User not found"));

        String role = user.getUserRole() != null
                ? user.getUserRole().replaceFirst("^ROLE_", "")
                : "USER";

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", role
        ));
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace('|', '/').replaceAll("[\\r\\n]+", " ").trim();
    }
}
