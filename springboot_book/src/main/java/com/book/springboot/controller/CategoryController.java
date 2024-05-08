package com.book.springboot.controller;

import com.book.springboot.entity.Category;
import com.book.springboot.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

import javax.servlet.http.HttpSession;
import java.util.List;

@Controller
public class CategoryController {
    @Autowired
    CategoryService categoryService;

    @GetMapping("/toAddCategory")
    public String toAddCategory(){
        return "category/add";
    }
    //添加分类
    @PostMapping("/addCategory")
    public String addCategory(Category category,
                              HttpSession session){
        session.removeAttribute("category");
        categoryService.insertCategory(category);
        List<Category> categories = categoryService.selectAll();
        session.setAttribute("category", categories);
        return "redirect:/main.html";
    }
}
