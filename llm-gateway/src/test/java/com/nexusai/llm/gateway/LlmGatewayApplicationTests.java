package com.nexusai.llm.gateway;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

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
	
	private static final String URL_STR = "http://127.0.0.1:1234/v1/models";

    @Test
    void testHttpClient() {
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(URL_STR))
                    .timeout(Duration.ofSeconds(5))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            System.out.println("=== HttpClient START ===");

            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            System.out.println("status = " + response.statusCode());
            System.out.println("body = " + response.body());

            System.out.println("=== HttpClient SUCCESS ===");

        } catch (Exception e) {
            System.out.println("=== HttpClient FAILED ===");
            e.printStackTrace();
        }
    }

    @Test
    void testHttpURLConnection() {
        try {
            System.out.println("=== HttpURLConnection START ===");

            URL url = new URL(URL_STR);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();

            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestProperty("Accept", "application/json");

            int status = conn.getResponseCode();

            InputStream in = (status >= 200 && status < 400)
                    ? conn.getInputStream()
                    : conn.getErrorStream();

            String body = "";
            if (in != null) {
                body = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }

            System.out.println("status = " + status);
            System.out.println("body = " + body);

            System.out.println("=== HttpURLConnection SUCCESS ===");

        } catch (Exception e) {
            System.out.println("=== HttpURLConnection FAILED ===");
            e.printStackTrace();
        }
    }

}
