package com.nexusai.llm.gateway.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
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
        return "pages/login";
    }

    @GetMapping("/register")
    public String registerPage(Model model) {
        model.addAttribute("title", "注册");
        return "pages/register";
    }

    @GetMapping("/dashboard")
    public String dashboardPage(Model model, Authentication authentication) {
        if (!"ADMIN".equals(extractUserRoleFromAuth(authentication))) {
            return "redirect:/apikeys";
        }
        model.addAttribute("title", "管理后台");
        model.addAttribute("currentPage", "dashboard");
        model.addAttribute("currentUserRole", extractUserRoleFromAuth(authentication));
        return "pages/dashboard/index";
    }

    @GetMapping("/apikeys")
    public String apiKeysPage(Model model, Authentication authentication) {
        model.addAttribute("title", "API Key 管理");
        model.addAttribute("currentPage", "apikeys");
        model.addAttribute("currentUserRole", extractUserRoleFromAuth(authentication));
        return "pages/admin/keys";
    }

    @GetMapping("/models")
    public String modelsPage(Model model, Authentication authentication) {
        model.addAttribute("title", "模型列表");
        model.addAttribute("currentPage", "models");
        model.addAttribute("currentUserRole", extractUserRoleFromAuth(authentication));
        return "pages/models/index";
    }

    @GetMapping("/logs")
    public String logsPage(Model model, Authentication authentication) {
        model.addAttribute("title", "请求日志");
        model.addAttribute("currentPage", "logs");
        model.addAttribute("currentUserRole", extractUserRoleFromAuth(authentication));
        return "pages/logs/index";
    }

    @GetMapping("/admin/users")
    public String adminUsersPage(Model model, Authentication authentication) {
        model.addAttribute("title", "用户管理");
        model.addAttribute("currentPage", "admin/users");
        model.addAttribute("currentUserRole", extractUserRoleFromAuth(authentication));
        return "pages/admin/users";
    }

    @GetMapping("/admin/keys")
    public String adminKeysPage() {
        return "redirect:/apikeys";
    }

    @GetMapping("/admin/monitor")
    public String adminMonitorPage(Model model, Authentication authentication) {
        model.addAttribute("title", "系统监控");
        model.addAttribute("currentPage", "admin/monitor");
        model.addAttribute("currentUserRole", extractUserRoleFromAuth(authentication));
        return "pages/admin/monitor";
    }

    @GetMapping("/admin/providers")
    public String adminProvidersPage(Model model, Authentication authentication) {
        model.addAttribute("title", "网关转发管理");
        model.addAttribute("currentPage", "admin/providers");
        model.addAttribute("currentUserRole", extractUserRoleFromAuth(authentication));
        return "pages/admin/providers";
    }

    @GetMapping("/user/balance")
    public String userBalancePage(Model model, Authentication authentication) {
        model.addAttribute("title", "余额明细");
        model.addAttribute("currentPage", "user/balance");
        model.addAttribute("currentUserRole", extractUserRoleFromAuth(authentication));
        return "pages/user/balance";
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/login";
    }

    private String extractUserRoleFromAuth(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return "USER";
        }

        var authorities = AuthorityUtils.authorityListToSet(authentication.getAuthorities());
        if (authorities.contains("ROLE_ADMIN")) {
            return "ADMIN";
        }
        if (authorities.contains("ROLE_USER")) {
            return "USER";
        }
        return "USER";
    }
}
