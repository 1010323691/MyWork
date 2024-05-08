package com.book.springboot.service;

import com.book.springboot.entity.Book;
import com.book.springboot.entity.Borrow;
import com.book.springboot.entity.Reader;
import com.book.springboot.mapper.BookMapper;
import com.book.springboot.mapper.BorrowMapper;
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
    ReaderMapper readerMapper;

    @Autowired
    BookMapper bookMapper;
    public List<Borrow> selectAllBorrow(){
        return borrowMapper.selectAllBorrow();
    }

    public List<Borrow> selectBorrowing(){
        return borrowMapper.selectBorrowing();
    }

    public List<Borrow> selectBorrowed(){
        return borrowMapper.selectBorrowed();
    }

    public void insertBorrow(Book book,Reader reader,Integer number) {

        //设置读者借书状态
        reader.setrIfborrow(1);
        //查出图书修改库存
        Book book1 = bookMapper.selectById(book.getbId());
        book1.setbStock(book1.getbStock()-number);
        bookMapper.updateStock(book1);
        //如果是新用户
        if (readerMapper.selectByName(reader.getrName()) == null) {
            //插入用户后查出带id的用户
            readerMapper.insertReader(reader);
            Reader reader1 = readerMapper.selectByName(reader.getrName());
            //获取日期
            Date date1 = new Date();
            Date date2 = new Date();
            Calendar calendar = new GregorianCalendar();
            calendar.setTime(date2);
            calendar.add(Calendar.DATE, 7);
            date2 = calendar.getTime();
            Borrow borrow = new Borrow(null, date1, date2, null, 0, null, book, reader1);
            borrowMapper.insertBorrow(borrow);
            //老用户
        }else{
            //更新邮箱
            updateReader(reader);
            //查出带id的用户
            Reader reader1 = readerMapper.selectByName(reader.getrName());
            //获取日期
            Date date1 = new Date();
            Date date2 = new Date();
            Calendar calendar = new GregorianCalendar();
            calendar.setTime(date2);
            calendar.add(Calendar.DATE, 7);
            date2 = calendar.getTime();
            Borrow borrow = new Borrow(null, date1, date2, null, 0, null, book, reader1);
            borrowMapper.insertBorrow(borrow);
        }

    }

    public Borrow selectById(Integer id) {
        return borrowMapper.selectById(id);
    }

    public void updateBorrow(Borrow borrow1) {
        //拿到借书记录
        Borrow borrow = borrowMapper.selectById(borrow1.getBrId());
        borrow.setBrIfreturn(1);//0未归还，1已归还
        borrow.setBrRecord(borrow1.getBrRecord());
        borrow.setBrBacktime(new Date());
        borrowMapper.updateBorrow(borrow);
        //增加图书库存
        Book book = bookMapper.selectById(borrow.getBrBook().getbId());
        book.setbStock(book.getbStock()+1);
        bookMapper.updateStock(book);

    }

    public void updateReader(Reader reader){
        readerMapper.updateReader(reader);
    }
}
