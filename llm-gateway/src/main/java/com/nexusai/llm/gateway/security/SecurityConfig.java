package com.nexusai.llm.gateway.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final UserDetailsService userDetailsService;
    private final ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    public SecurityConfig(
            UserDetailsService userDetailsService,
            ApiKeyAuthenticationFilter apiKeyAuthenticationFilter
    ) {
        this.userDetailsService = userDetailsService;
        this.apiKeyAuthenticationFilter = apiKeyAuthenticationFilter;

        // Configure skip paths for API Key filter
        apiKeyAuthenticationFilter.setSkipPaths(List.of(
                "/api/auth/**",
                "/v3/api-docs/**",
                "/swagger-ui/**",
                "/swagger-ui.html",
                "/swagger-resources/**",
                "/webjars/**",
                "/actuator/**",
                "/favicon.ico",
                "/css/**",
                "/js/**",
                "/images/**",
                "/fonts/**",
                "/login",
                "/register",
                "/"
        ));
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // CSRF: 禁用 CSRF 保护
                // 原因：1) 登录表单不需要 CSRF token（攻击者无法知道用户密码）
                //      2) API 调用使用 Session Cookie，传统 CSRF 防护不适用于 JSON API
                .csrf(csrf -> csrf.disable())
                // Session 管理：启用 Session 支持
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                // 表单登录配置：禁用 formLogin 以避免默认登录页，但保留认证过滤器
                .formLogin(form -> form.disable())
                // 退出登录配置
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/login?logout")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID"))
                .authorizeHttpRequests(auth -> auth
                        // API 认证接口（无需预先认证）
                        .requestMatchers("POST", "/api/auth/login").permitAll()
                        // 公开路径（无需认证）
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/register").permitAll()
                        // 需要认证的路径
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/v3/api-docs/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/swagger-resources/**").permitAll()
                        .requestMatchers("/webjars/**").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/favicon.ico").permitAll()
                        .requestMatchers("/").permitAll()
                        .requestMatchers("/login").permitAll()
                        .requestMatchers("/register").permitAll()
                        // 静态资源
                        .requestMatchers("/static/**").permitAll()
                        .requestMatchers("/assets/**").permitAll()
                        .requestMatchers("/css/**").permitAll()
                        .requestMatchers("/js/**").permitAll()
                        .requestMatchers("/images/**").permitAll()
                        .requestMatchers("/fonts/**").permitAll()
                        // 需要认证的路径
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/user/**").authenticated()
                        .requestMatchers("/api/clients/**").authenticated()
                        .requestMatchers("/api/llm/**").authenticated()
                        .requestMatchers("/api/**").authenticated()
                        // 需要认证的路径（HTML 页面）
                        .requestMatchers("/dashboard").authenticated()
                        .requestMatchers("/logs").authenticated()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        // 其他请求
                        .anyRequest().permitAll()
                )
                .authenticationProvider(daoAuthenticationProvider())
                // API Key filter 保留，用于 API Key 认证
                .addFilterBefore(apiKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // ✅ 修复：使用具体 origin 而非通配符，以配合 allowCredentials=true
        configuration.setAllowedOrigins(List.of("http://localhost:8080", "http://127.0.0.1:8080"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-API-Key"));
        configuration.setExposedHeaders(Arrays.asList("X-Remaining-Tokens", "X-Total-Tokens"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
