package com.book.springboot.service;

import com.book.springboot.entity.Admin;
import com.book.springboot.mapper.AdminMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
public class LoginService {
    @Autowired
    AdminMapper adminMapper;
    public boolean adminLogin(String username,
                              String password){
        Admin admin = adminMapper.selectByUsername(username);
        if(admin == null){
            return false;
        }else if (!password.equals(admin.getaPassword())){
            return false;
        }else {
            System.out.println("登陆成功！");
            return true;
        }

    }
}
