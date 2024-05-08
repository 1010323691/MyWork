package com.book.springboot.service;

import com.book.springboot.entity.Category;
import com.book.springboot.mapper.CategoryMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryService {
    @Autowired
    CategoryMapper categoryMapper;

    public List<Category> selectAll(){
        return categoryMapper.selectAllCategory();
    }

    public void insertCategory(Category category){
        categoryMapper.insertCategory(category);
    }
}
