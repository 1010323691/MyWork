package com.nexusai.llm.gateway.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.security.protection")
public class SecurityProtectionProperties {

    private boolean enabled = true;
    private LoginRateLimit login = new LoginRateLimit();
    private RegisterRateLimit register = new RegisterRateLimit();
    private GenericRateLimit write = new GenericRateLimit();
    private GenericRateLimit completion = new GenericRateLimit();

    @Getter
    @Setter
    public static class LoginRateLimit {
        private int ipMaxRequests = 5;
        private int ipWindowMinutes = 1;
        private FailureLock failure = new FailureLock();
    }

    @Getter
    @Setter
    public static class RegisterRateLimit {
        private int ipMaxRequests = 2;
        private int ipWindowMinutes = 10;
    }

    @Getter
    @Setter
    public static class GenericRateLimit {
        private int maxRequests = 60;
        private int windowMinutes = 1;
    }

    @Getter
    @Setter
    public static class FailureLock {
        private int maxAttempts = 5;
        private int windowMinutes = 10;
        private int lockMinutes = 15;
    }
}
