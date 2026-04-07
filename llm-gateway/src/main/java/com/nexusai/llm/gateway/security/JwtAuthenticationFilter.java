package com.nexusai.llm.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final List<String> skipPaths;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
        // JWT 过滤器只对/api/** 路径生效，其他由 SecurityFilterChain 控制
        this.skipPaths = List.of(
                "/api/auth/**",           // 登录注册不需要认证
                "/v3/api-docs/**",        // Swagger
                "/swagger-ui/**",
                "/swagger-resources/**",
                "/actuator/**",
                "/webjars/**"
        );
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        if (shouldSkip(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
            username = jwtService.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // 从 JWT 提取权限（避免每次都查数据库）
                List<String> authorityStrings = jwtService.extractAuthorities(jwt);
                List<GrantedAuthority> authorities = new ArrayList<>();
                for (String authority : authorityStrings) {
                    authorities.add(new SimpleGrantedAuthority(authority));
                }

                // 创建简单的 UserDetails（仅用于认证，不需要查数据库）
                UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                        username,
                        "",  // 密码不需要
                        authorities
                );

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authenticationToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );
                    authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // 将 userId 存储到 request 属性中供控制器使用
                    Long userId = jwtService.extractUserId(jwt);
                    if (userId != null) {
                        request.setAttribute("currentUserId", userId);
                    }

                    SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean shouldSkip(HttpServletRequest request) {
        String path = request.getServletPath();
        for (String skipPath : skipPaths) {
            if (skipPath.endsWith("/**")) {
                String prefix = skipPath.substring(0, skipPath.length() - 3);
                if (path.startsWith(prefix)) {
                    return true;
                }
            } else if (path.equals(skipPath)) {
                return true;
            }
        }
        return false;
    }
}
