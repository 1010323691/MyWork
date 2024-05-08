package com.book.springboot.service;

import com.book.springboot.dto.BookDto;
import com.book.springboot.entity.Book;
import com.book.springboot.mapper.BookMapper;
import com.book.springboot.mapper.BookMapperExtra;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookService {
    @Autowired
    BookMapper bookMapper;
    
    @Autowired
    BookMapperExtra bookMapperExtra;

    public List<BookDto> selectAll(){
        return bookMapperExtra.selectAllBook();
    }

    public void deleteEmp(Integer id) {
    	bookMapperExtra.deleteBook(id);
    }

    public void insertBook(BookDto book) {
    	bookMapperExtra.insertBook(book);
    }

    public BookDto selectById(Integer id) {
        return bookMapperExtra.selectById(id);
    }

    public void updateBook(BookDto book) {
    	bookMapperExtra.updateBook(book);
    }

    public void updateStock(BookDto book) {
    	bookMapperExtra.updateStock(book);
    }

    public List<BookDto> selectByCategoryName(String cName){
        return bookMapperExtra.selectByCategory(cName);
    }

    public List<BookDto> searchBook(String bName) {
        return bookMapperExtra.selectByName(bName);
    }
}
