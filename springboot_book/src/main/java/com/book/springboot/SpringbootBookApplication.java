package com.book.springboot;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@MapperScan(value = "com.book.springboot.mapper")//批量扫描所有的mappper
@SpringBootApplication
public class SpringbootBookApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpringbootBookApplication.class, args);
    }

}
