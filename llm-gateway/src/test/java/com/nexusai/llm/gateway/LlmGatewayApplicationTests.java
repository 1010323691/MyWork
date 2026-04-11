package com.nexusai.llm.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * LLM Gateway 应用测试类
 * 包含密码加密工具方法
 */
@SpringBootTest
class LlmGatewayApplicationTests {

    @Test
    void contextLoads() {
    }

    // ==================== 密码加密工具 ====================

    /**
     * 密码加密工具
     * 用法：运行此测试方法，输入明文密码，输出加密后的 BCrypt 密码
     *
     * 示例输出：
     * 请输入要加密的密码：123456
     * ==================================
     * 明文密码：123456
     * 加密后密码：$2a$10$N.zmdr9k7uOCQb378NoUnuSJlZlIFiF1v/0gQeb1LT8xcPo6FMKV6
     * ==================================
     */
    @Test
    void encodePassword() {
        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        java.util.Scanner scanner = new java.util.Scanner(System.in);

        System.out.println("================================");
        System.out.println("      BCrypt 密码加密工具");
        System.out.println("================================");
        System.out.print("请输入要加密的密码：");

        String plainPassword = scanner.nextLine();
        String encodedPassword = passwordEncoder.encode(plainPassword);

        System.out.println();
        System.out.println("================================");
        System.out.println("加密结果：");
        System.out.println("================================");
        System.out.println("明文密码：" + plainPassword);
        System.out.println("加密后密码：" + encodedPassword);
        System.out.println("================================");

        scanner.close();
    }
}
