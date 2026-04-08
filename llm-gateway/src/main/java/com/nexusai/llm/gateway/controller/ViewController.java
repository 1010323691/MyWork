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

    @GetMapping("/register")
    public String registerPage(Model model) {
        model.addAttribute("title", "注册");
        return "register";
    }

    @GetMapping("/dashboard")
    public String dashboardPage(Model model) {
        // 不检查认证状态，直接返回页面
        // 前端 JS 负责检查 token 和处理未认证跳转
        model.addAttribute("title", "管理后台");
        return "dashboard";
    }

    @GetMapping("/logs")
    public String logsPage(Model model) {
        model.addAttribute("title", "请求日志");
        return "logs";
    }

    @GetMapping("/admin/users")
    public String adminUsersPage(Model model) {
        model.addAttribute("title", "用户管理");
        return "admin/users";
    }

    @GetMapping("/admin/keys")
    public String adminKeysPage(Model model) {
        model.addAttribute("title", "Key 管理");
        return "admin/keys";
    }

    @GetMapping("/admin/monitor")
    public String adminMonitorPage(Model model) {
        model.addAttribute("title", "系统监控");
        return "admin/monitor";
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/login";
    }
}
