package com.nexusai.llm.gateway.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/")
public class ViewController {

    @GetMapping("/login")
    public String loginPage(Model model) {
        model.addAttribute("title", "登录");
        return "login";
    }

    @GetMapping("/dashboard")
    public String dashboardPage(Model model) {
        // 不检查认证状态，直接返回页面
        // 前端 JS 负责检查 token 和处理未认证跳转
        model.addAttribute("title", "管理后台");
        return "dashboard";
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/login";
    }
}
