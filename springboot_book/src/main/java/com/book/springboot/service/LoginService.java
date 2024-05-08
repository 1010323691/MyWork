package com.book.springboot.service;

import com.book.springboot.entity.Admin;
import com.book.springboot.entity.AdminExample;
import com.book.springboot.mapper.AdminMapper;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LoginService {
	@Autowired
	AdminMapper adminMapper;

	public boolean adminLogin(String userName, String passWord) {

		// 创建一个 AdminExample 对象，用于设置查询条件
		AdminExample example = new AdminExample();
		AdminExample.Criteria adminCriteria = example.createCriteria();

		// 设置条件 aUserName = #{userName}
		adminCriteria.andAUsernameEqualTo(userName);

		// 调用 selectByExample 方法，传入条件对象 example，获取符合条件的结果集
		List<Admin> adminList = adminMapper.selectByExample(example);
		Admin admin = adminList.get(0);

		if (admin == null) {
			return false;
		} else if (!passWord.equals(admin.getaPassword())) {
			return false;
		} else {
			System.out.println("登陆成功！");
			return true;
		}

	}
}
