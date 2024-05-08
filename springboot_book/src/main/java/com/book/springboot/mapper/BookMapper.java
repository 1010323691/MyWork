package com.book.springboot.mapper;

import com.book.springboot.entity.Book;

import java.util.List;

public interface BookMapper {

    public List<Book> selectAllBook();

    public List<Book> selectByName(String bName);

    public List<Book> selectByCategory(String cName);

    public Book selectById(Integer id);

    public void insertBook(Book book);

    public void deleteBook(Integer id);

    public void updateBook(Book book);

    public void updateStock(Book book);
}
