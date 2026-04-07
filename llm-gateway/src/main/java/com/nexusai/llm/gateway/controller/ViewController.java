package com.nexusai.llm.gateway.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
    public String dashboardPage(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        // 传递用户信息（可能为 null，前端负责检查认证）
        model.addAttribute("user", userDetails);
        model.addAttribute("title", "管理后台");
        return "dashboard";
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/login";
    }
}
