package com.book.springboot.service;

import com.book.springboot.entity.Book;
import com.book.springboot.mapper.BookMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookService {
    @Autowired
    BookMapper bookMapper;

    public List<Book> selectAll(){
        return bookMapper.selectAllBook();
    }

    public void deleteEmp(Integer id) {
        bookMapper.deleteBook(id);
    }

    public void insertBook(Book book) {
        bookMapper.insertBook(book);
    }

    public Book selectById(Integer id) {
        return bookMapper.selectById(id);
    }

    public void updateBook(Book book) {
        bookMapper.updateBook(book);
    }

    public void updateStock(Book book) {
        bookMapper.updateStock(book);
    }

    public List<Book> selectByCategoryName(String cName){
        return bookMapper.selectByCategory(cName);
    }

    public List<Book> searchBook(String bName) {
        return bookMapper.selectByName(bName);
    }
}
