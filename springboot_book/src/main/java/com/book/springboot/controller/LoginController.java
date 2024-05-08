package com.book.springboot.controller;

import com.book.springboot.entity.Category;
import com.book.springboot.service.CategoryService;
import com.book.springboot.service.LoginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import javax.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;

@Controller
public class LoginController {

    @Autowired
    LoginService loginService;
    @Autowired
    CategoryService categoryService;
    @PostMapping("/user/login")
    public String adminLogin(@RequestParam("username") String username,
                             @RequestParam("password") String password,
                             Map<String,Object> map,
                             HttpSession session){
        System.out.println("执行登录");
        if(loginService.adminLogin(username, password)){
            List<Category> categories = categoryService.selectAll();
            session.setAttribute("category", categories);
            session.setAttribute("User", username);
            //防止重复提交表单使用重定向
            return "redirect:/main.html";
        }else {
            map.put("msg", "用户名密码错误");
            return "login";
        }
    }
    @GetMapping("/user/logout")
    public String logout(HttpSession session){
        session.removeAttribute("User");
        return "login";
    }
}
