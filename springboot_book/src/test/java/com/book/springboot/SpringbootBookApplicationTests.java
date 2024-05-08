package com.book.springboot;

import com.book.springboot.mapper.BookMapper;
import com.book.springboot.mapper.BorrowMapper;
import com.book.springboot.mapper.CategoryMapper;
import com.book.springboot.mapper.ReaderMapper;
import com.book.springboot.mapper.AdminMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.text.SimpleDateFormat;
import java.util.*;

@SpringBootTest
class SpringbootBookApplicationTests {

	@Autowired
	BookMapper bookMapper;
	@Autowired
	BorrowMapper borrowMapper;
	@Autowired
	CategoryMapper categoryMapper;
	@Autowired
	ReaderMapper readerMapper;
	@Autowired
	AdminMapper adminMapper;

	@Test
	public void dateTest() {
		Date date = new Date(); // 创建一个Date对象，获取当前时间
		SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy年MM月dd日 E HH:mm:ss");
		String newDate = simpleDateFormat.format(date);
		System.out.println(newDate);
	}

}
