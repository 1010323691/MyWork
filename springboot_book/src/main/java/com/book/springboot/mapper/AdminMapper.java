package com.book.springboot.mapper;

import com.book.springboot.entity.Admin;

public interface AdminMapper {
    public Admin selectByUsername(String username);
}
