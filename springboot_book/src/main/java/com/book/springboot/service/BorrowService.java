package com.book.springboot.service;

import com.book.springboot.dto.BorrowDto;
import com.book.springboot.entity.Book;
import com.book.springboot.entity.Borrow;
import com.book.springboot.entity.Reader;
import com.book.springboot.entity.ReaderExample;
import com.book.springboot.mapper.BookMapper;
import com.book.springboot.mapper.BorrowMapper;
import com.book.springboot.mapper.BorrowMapperExtra;
import com.book.springboot.mapper.ReaderMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.List;

@Service
public class BorrowService {
	@Autowired
	BorrowMapper borrowMapper;

	@Autowired
	BorrowMapperExtra borrowMapperExtra;

	@Autowired
	ReaderMapper readerMapper;

	@Autowired
	BookMapper bookMapper;

	public List<BorrowDto> selectAllBorrow() {
		return borrowMapperExtra.selectAllBorrow();
	}

	public List<BorrowDto> selectBorrowing() {
		return borrowMapperExtra.selectBorrowing();
	}

	public List<BorrowDto> selectBorrowed() {
		return borrowMapperExtra.selectBorrowed();
	}

	public void insertBorrow(Book book, Reader reader, Integer number) {

		// 设置读者借书状态
		reader.setrIfborrow(1);
		// 查出图书修改库存
		Book book1 = bookMapper.selectByPrimaryKey(book.getbId());
		book1.setbStock(book1.getbStock() - number);
		bookMapper.updateByPrimaryKeySelective(book1);

		// 获取用户信息
		ReaderExample readerExample = new ReaderExample();
		ReaderExample.Criteria readerCriteria = readerExample.createCriteria();
		readerCriteria.andRNameEqualTo(reader.getrName());
		List<Reader> readerList = readerMapper.selectByExample(readerExample);

		// 获取日期
		Date date1 = new Date();
		Date date2 = new Date();
		Calendar calendar = new GregorianCalendar();
		calendar.setTime(date2);
		calendar.add(Calendar.DATE, 7);
		date2 = calendar.getTime();

		// 如果是新用户
		if (readerList.size() == 0) {
			// 插入用户后查出带id的用户
			readerMapper.insertSelective(reader);
			List<Reader> readerList1 = readerMapper.selectByExample(readerExample);
			Reader reader1 = readerList1.get(0);

			Borrow borrow = new Borrow();
			borrow.setBrOuttime(date1);
			borrow.setBrEndtime(date2);
			borrow.setBrIfreturn(0);
			borrow.setBrBookid(book.getbId());
			borrow.setBrReaderid(reader1.getrId());
			borrowMapper.insertSelective(borrow);
			// 老用户
		} else {
			// 更新邮箱
			updateReader(reader);
			// 查出带id的用户
			List<Reader> readerList1 = readerMapper.selectByExample(readerExample);
			Reader reader1 = readerList1.get(0);

			Borrow borrow = new Borrow();
			borrow.setBrOuttime(date1);
			borrow.setBrEndtime(date2);
			borrow.setBrIfreturn(0);
			borrow.setBrBookid(book.getbId());
			borrow.setBrReaderid(reader1.getrId());
			borrowMapper.insertSelective(borrow);
		}

	}

	public BorrowDto selectById(Integer id) {
		return borrowMapperExtra.selectById(id);
	}

	public void updateBorrow(Borrow borrow1) {
		// 拿到借书记录
		Borrow borrow = borrowMapper.selectByPrimaryKey(borrow1.getBrId());
		borrow.setBrIfreturn(1);// 0未归还，1已归还
		borrow.setBrRecord(borrow1.getBrRecord());
		borrow.setBrBacktime(new Date());
		borrowMapper.updateByPrimaryKey(borrow);
		// 增加图书库存
		Book book = bookMapper.selectByPrimaryKey(borrow.getBrBookid());
		book.setbStock(book.getbStock() + 1);
		bookMapper.updateByPrimaryKey(book);

	}

	public void updateReader(Reader reader) {
		readerMapper.updateByPrimaryKeySelective(reader);
	}
}
