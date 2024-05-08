package com.book.springboot.controller;

import com.book.springboot.dto.BookDto;
import com.book.springboot.entity.Book;
import com.book.springboot.entity.Category;
import com.book.springboot.service.BookService;
import com.book.springboot.service.CategoryService;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.Iterator;
import java.util.List;

@Controller
public class BookController {

    @Autowired
    BookService bookService;
    @Autowired
    CategoryService categoryService;

    //查询所有图书返回列表页面
    @GetMapping("/books")
    public String list(@RequestParam(defaultValue = "1")Integer pn,
                       Model model){
        PageHelper.startPage(pn, 10);//每页多少条数据
        List<BookDto> books = bookService.selectAll();
        PageInfo<BookDto> page = new PageInfo<>(books, 5);//连续显示的页数
        //放在请求域中
        model.addAttribute("pageInfo", page);
        return "book/list";
    }

    //通过分类查询图书
    @GetMapping("/category")
    public String categoryList(@RequestParam(defaultValue = "1")Integer pn,
                               @RequestParam String cName,
                                Model model){
        PageHelper.startPage(pn, 10);//每页多少条数据
        List<BookDto> books = bookService.selectByCategoryName(cName);
        PageInfo<BookDto> page = new PageInfo<>(books, 5);//连续显示的页数
        //放在请求域中
        model.addAttribute("pageInfo", page);
        return "book/list";
    }

    //删除信息
    @ResponseBody
    @DeleteMapping("/book/{id}")
    public void bookDelete(@PathVariable Integer id){
        bookService.deleteEmp(id);
    }

    //跳转到添加页面
    @GetMapping("/book")
    public String toBookAdd(Model model){
        List<Category> categories = categoryService.selectAll();
        Iterator<Category> iterator = categories.iterator();
        while (iterator.hasNext()){
            System.out.println(iterator.next());
        }
        model.addAttribute("category", categories);
        return "book/add";
    }

    //图书添加
    @PostMapping("/book")
    public String addEmp(BookDto book){//自动将请求参数和入参对象进行一一绑定
        System.out.println("保存成的员工信息："+book.toString());
        bookService.insertBook(book);
        //来到员工列表，/代表当前项目路径
        return "redirect:/books";
    }

    //跳转到修改页面
    @GetMapping("/book/{bId}")
    public String toEditBook(@PathVariable(value = "bId") Integer id,
                             Model model){
    	BookDto book = bookService.selectById(id);
        model.addAttribute("book", book);
        List<Category> categories = categoryService.selectAll();
        model.addAttribute("category", categories);
        return "book/add";
    }

    //图书修改
    @PutMapping("/book")
    public String editPage(BookDto book){
        bookService.updateBook(book);
        return "redirect:/books";
    }

    //图书搜索
    @GetMapping("/search")
    public String searchBook(@RequestParam String bName,
                             @RequestParam(defaultValue = "1") Integer pn,
                             Model model){
        PageHelper.startPage(pn, 10);//每页多少条数据
        List<BookDto> books = bookService.searchBook(bName);
        PageInfo<BookDto> page = new PageInfo<>(books, 5);//连续显示的页数
        //放在请求域中
        model.addAttribute("pageInfo", page);
        model.addAttribute("name", bName);
        return "book/searchList";
    }
    
    public void searchBookmain(){}
}
