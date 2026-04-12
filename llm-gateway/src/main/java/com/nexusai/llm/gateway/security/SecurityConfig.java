package com.nexusai.llm.gateway.security;

import com.nexusai.llm.gateway.config.SecurityProtectionProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(SecurityProtectionProperties.class)
public class SecurityConfig {

    private final ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    private final SecurityProtectionFilter securityProtectionFilter;
    private final boolean swaggerEnabled;
    private final List<String> allowedOriginPatterns;

    public SecurityConfig(ApiKeyAuthenticationFilter apiKeyAuthenticationFilter,
                          SecurityProtectionFilter securityProtectionFilter,
                          @Value("${app.security.swagger-enabled:false}") boolean swaggerEnabled,
                          @Value("${app.security.allowed-origin-patterns:}") String allowedOriginPatterns) {
        this.apiKeyAuthenticationFilter = apiKeyAuthenticationFilter;
        this.securityProtectionFilter = securityProtectionFilter;
        this.swaggerEnabled = swaggerEnabled;
        this.allowedOriginPatterns = Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toList());

        apiKeyAuthenticationFilter.setSkipPaths(List.of(
                "/api/auth/**",
                "/actuator/health",
                "/actuator/info",
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
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .formLogin(form -> form.disable())
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/login?logout")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID"))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
                    auth.requestMatchers("/api/auth/login").permitAll();
                    auth.requestMatchers("/api/auth/register").permitAll();
                    auth.requestMatchers("/api/auth/me").authenticated();
                    auth.requestMatchers("/actuator/health", "/actuator/info").permitAll();
                    auth.requestMatchers("/actuator/**").hasRole("ADMIN");
                    auth.requestMatchers("/favicon.ico").permitAll();
                    auth.requestMatchers("/").permitAll();
                    auth.requestMatchers("/login").permitAll();
                    auth.requestMatchers("/register").permitAll();
                    auth.requestMatchers("/static/**").permitAll();
                    auth.requestMatchers("/assets/**").permitAll();
                    auth.requestMatchers("/css/**").permitAll();
                    auth.requestMatchers("/js/**").permitAll();
                    auth.requestMatchers("/images/**").permitAll();
                    auth.requestMatchers("/fonts/**").permitAll();
                    auth.requestMatchers("/api/chat", "/api/llm/chat").permitAll();
                    auth.requestMatchers("/api/models", "/api/llm/models").permitAll();
                    auth.requestMatchers("/v1/chat/completions", "/v1/models").permitAll();

                    if (swaggerEnabled) {
                        auth.requestMatchers("/v3/api-docs/**").hasRole("ADMIN");
                        auth.requestMatchers("/swagger-ui/**", "/swagger-ui.html").hasRole("ADMIN");
                        auth.requestMatchers("/swagger-resources/**").hasRole("ADMIN");
                        auth.requestMatchers("/webjars/**").hasRole("ADMIN");
                    } else {
                        auth.requestMatchers("/v3/api-docs/**").denyAll();
                        auth.requestMatchers("/swagger-ui/**", "/swagger-ui.html").denyAll();
                        auth.requestMatchers("/swagger-resources/**").denyAll();
                        auth.requestMatchers("/webjars/**").denyAll();
                    }

                    auth.requestMatchers("/api/apikeys/**").authenticated();
                    auth.requestMatchers("/api/admin/**").hasRole("ADMIN");
                    auth.requestMatchers("/api/user/**").authenticated();
                    auth.requestMatchers("/api/clients/**").authenticated();
                    auth.requestMatchers("/api/llm/**").authenticated();
                    auth.requestMatchers("/v1/**").authenticated();
                    auth.requestMatchers("/api/**").authenticated();
                    auth.requestMatchers("/dashboard").authenticated();
                    auth.requestMatchers("/apikeys").authenticated();
                    auth.requestMatchers("/logs").authenticated();
                    auth.requestMatchers("/admin/**").hasRole("ADMIN");
                    auth.anyRequest().permitAll();
                })
                .addFilterBefore(apiKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(securityProtectionFilter, ApiKeyAuthenticationFilter.class);

        return http.build();
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
        configuration.setAllowedOriginPatterns(allowedOriginPatterns);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-API-Key", "X-Requested-With"));
        configuration.setExposedHeaders(Arrays.asList("X-Remaining-Tokens", "X-Total-Tokens"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
