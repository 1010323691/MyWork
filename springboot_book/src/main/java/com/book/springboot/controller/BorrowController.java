package com.book.springboot.controller;

import com.book.springboot.dto.BookDto;
import com.book.springboot.dto.BorrowDto;
import com.book.springboot.entity.Book;
import com.book.springboot.entity.Borrow;
import com.book.springboot.entity.Reader;
import com.book.springboot.mapper.ReaderMapper;
import com.book.springboot.service.BookService;
import com.book.springboot.service.BorrowService;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Controller
public class BorrowController {
    @Autowired
    BorrowService borrowService;
    @Autowired
    BookService bookService;
    @Autowired
    ReaderMapper readerMapper;
    //查询所有归还后图书记录
    @GetMapping("/borrows")
    public String borrowList(@RequestParam(defaultValue = "1")Integer pn,
                       Model model){
        PageHelper.startPage(pn, 10);//每页多少条数据
        List<BorrowDto> borrows = borrowService.selectBorrowed();
        PageInfo<BorrowDto> page = new PageInfo<>(borrows, 5);//连续显示的页数
        //放在请求域中
        model.addAttribute("pageInfo", page);
        return "book/borrowList";
    }

    //在借中图书
    @GetMapping("/borrowing")
    public String borrowingList(@RequestParam(defaultValue = "1")Integer pn,
                       Model model){
        PageHelper.startPage(pn, 10);//每页多少条数据
        List<BorrowDto> borrows = borrowService.selectBorrowing();
        PageInfo<BorrowDto> page = new PageInfo<>(borrows, 5);//连续显示的页数
        //放在请求域中
        model.addAttribute("pageInfo", page);
        return "book/borrowing";
    }

    //跳转到图书出借界面
    @GetMapping("/bookBorrow/{bId}")
    public String toBookBorrow(@PathVariable(value = "bId") Integer id,
                             Model model){
        BookDto book = bookService.selectById(id);
        model.addAttribute("book", book);

        return "book/bookBorrow";
    }

    //图书借出
    @PostMapping("/bookBorrow")
    public String bookBorrow(Book book, Reader reader,
                             @RequestParam(value = "rNumber")Integer number){
        borrowService.insertBorrow(book, reader,number);
        return "redirect:/books";
    }

    //跳转到还书页面
    @GetMapping("/toReturn")
    public String toReturn(@RequestParam(value = "brId")Integer id,
                           Model model){
    	BorrowDto borrow = borrowService.selectById(id);
        model.addAttribute("borrow", borrow);
        return "book/return";
    }

    //还书
    @PostMapping("doReturn")
    public String doReturn(Borrow borrow1){
        borrowService.updateBorrow(borrow1);
        return "redirect:/borrowing";
    }
}
