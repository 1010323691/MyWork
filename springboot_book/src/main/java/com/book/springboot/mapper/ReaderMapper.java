package com.book.springboot.mapper;

import com.book.springboot.entity.Reader;

import java.util.List;

public interface ReaderMapper {

    public List<Reader> selectAllReader();

    public Reader selectByName(String name);

    public void insertReader(Reader reader);

    public void updateReader(Reader reader);

}
