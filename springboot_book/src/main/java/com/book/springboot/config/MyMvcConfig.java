package com.book.springboot.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurerAdapter;

/***MVC配置类***/
//@EnableWebMvc 不要人为接管mvc
@Configuration
public class MyMvcConfig extends WebMvcConfigurerAdapter {

    //所有的WebMvcConfigurerAdapter组件都一起起作用
    @Bean//将组件注册在容器中
    public WebMvcConfigurerAdapter webMvcConfigurerAdapter(){
        WebMvcConfigurerAdapter adapter = new WebMvcConfigurerAdapter() {
            @Override//视图渲染跳转
            public void addViewControllers(ViewControllerRegistry registry) {
                registry.addViewController("/").setViewName("login");
                registry.addViewController("/index.html").setViewName("login");
                registry.addViewController("/main.html").setViewName("dashboard");
            }

            @Override//拦截器
            public void addInterceptors(InterceptorRegistry registry) {
                //
                registry.addInterceptor(new LoginHandlerInterceptor()).addPathPatterns("/**")
                        .excludePathPatterns("/",
                                "/index.html",
                                "/mybatis/**",
                                "/user/login",
                                "/login",
                                "/asserts/**"
                                ,"/webjars/**");
            }
        };
        return adapter;
    }
    //国际化配置
    @Bean
    public LocaleResolver localeResolver(){
        return new MyLocaleResolve();
    }
}