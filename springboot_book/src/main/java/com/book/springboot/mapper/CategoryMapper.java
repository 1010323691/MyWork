package com.book.springboot.mapper;

import com.book.springboot.entity.Category;

import java.util.List;

public interface CategoryMapper {

    public List<Category> selectAllCategory();
    public void insertCategory(Category category);
    public void deleteCategory(Integer id);
}
