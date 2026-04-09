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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * API 登录端点（用于前端 AJAX 登录）
     * Session 认证模式下，需要将认证对象设置到 SecurityContext 并保存到 Session
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        try {
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                    request.getUsername(), request.getPassword()
            );
            // 执行认证并获取已认证的 token
            Authentication authenticated = authenticationManager.authenticate(authenticationToken);

            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new BadCredentialsException("User not found"));

            // ✅ 关键修复：使用 HttpSessionSecurityContextRepository 将 SecurityContext 保存到 Session
            // 这样才能在后续请求中恢复认证状态
            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(authenticated);
            SecurityContextHolder.setContext(securityContext);

            // 手动保存 SecurityContext 到 HttpSession（模拟 SecurityContextPersistenceFilter 的行为）
            new HttpSessionSecurityContextRepository().saveContext(
                securityContext,
                httpRequest,
                httpResponse
            );

            log.info("登录成功 | 用户名：{} | 权限：{}", user.getUsername(), user.getAuthorities());

            return ResponseEntity.ok(Map.of("message", "登录成功"));
        } catch (BadCredentialsException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "用户名或密码错误"));
        }
    }

    /**
     * 注册新用户
     */
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

        log.info("新用户注册 | 用户名：{}", req.getUsername());
        return ResponseEntity.ok(Map.of("message", "注册成功"));
    }

    /**
     * 获取当前登录用户信息
     * Session 认证模式下，前端通过此接口获取用户信息
     * 需要认证，未认证会返回 401
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("User not found"));

        // 提取角色（去掉 ROLE_ 前缀）
        String role = user.getUserRole() != null
                ? user.getUserRole().replaceFirst("^ROLE_", "")
                : "USER";

        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", role
        ));
    }
}
