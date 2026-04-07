package com.nexusai.llm.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootTest
class LlmGatewayApplicationTests {

	@Test
	void contextLoads() {
	}
	
	
	@Test
    void generatePassword() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawPassword = "Aa123456";

        String encoded = encoder.encode(rawPassword);

        System.out.println("原始密码: " + rawPassword);
        System.out.println("加密后: " + encoded);
    }

}
