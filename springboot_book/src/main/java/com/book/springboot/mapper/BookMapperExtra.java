package com.book.springboot.mapper;

import com.book.springboot.dto.BookDto;

import java.util.List;

public interface BookMapperExtra {

    public List<BookDto> selectAllBook();

    public List<BookDto> selectByName(String bName);

    public List<BookDto> selectByCategory(String cName);

    public BookDto selectById(Integer id);

    public void insertBook(BookDto book);

    public void deleteBook(Integer id);

    public void updateBook(BookDto book);

    public void updateStock(BookDto book);
}
