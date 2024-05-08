package com.book.springboot;

import com.book.springboot.entity.*;
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
    public void bookSelectByName(){
        List<Book> books = bookMapper.selectByName("程序");
        Iterator<Book> iterator = books.iterator();
        while (iterator.hasNext()){
            System.out.println(iterator.next());
        }
    }
    @Test
    public void bookSelectAll(){
        List<Book> books = bookMapper.selectAllBook();
        Iterator<Book> iterator = books.iterator();
        while (iterator.hasNext()){
            System.out.println(iterator.next());
        }
    }
    @Test
    public void bookInsert(){
        Book book = new Book(null, "朝花夕拾", "鲁迅", "天津人民出版社", 24, new Category(3, null));
        bookMapper.insertBook(book);
    }

    @Test
    public void readerSelect(){
        Reader reader = readerMapper.selectByName("小王");
        System.out.println(reader);
    }
    @Test
    public void readerInsert(){
        readerMapper.insertReader(new Reader(null,"小明","1010323691@qq.com",0));
        List<Reader> readers = readerMapper.selectAllReader();
        Iterator<Reader> iterator = readers.iterator();
        while (iterator.hasNext()){
            System.out.println(iterator.next());
        }
    }

    @Test
    public void borrowInsert(){
        Book book = bookMapper.selectById(3);

        if (readerMapper.selectByName("王亮") == null){
            readerMapper.insertReader(new Reader(null, "王亮", "224456@qq.com", 1));
            Reader reader = readerMapper.selectByName("王亮");
            Date date1 = new Date();
            Date date2 = new Date();
            Calendar calendar = new GregorianCalendar();
            calendar.setTime(date2);
            calendar.add(Calendar.DATE, 7);
            date2 = calendar.getTime();
            borrowMapper.insertBorrow(new Borrow(null,date1,date2,null,1,null,book,reader));
        }else {
            Reader reader = readerMapper.selectByName("王亮");
            Date date1 = new Date();
            Date date2 = new Date();
            Calendar calendar = new GregorianCalendar();
            calendar.setTime(date2);
            calendar.add(Calendar.DATE, 7);
            date2 = calendar.getTime();
            borrowMapper.insertBorrow(new Borrow(null,date1,date2,null,1,null,book,reader));
        }
    }
    @Test
    public void borrowSelect(){
        List<Borrow> borrows = borrowMapper.selectAllBorrow();
        Iterator<Borrow> iterator = borrows.iterator();
        while (iterator.hasNext()){
            System.out.println(iterator.next());
        }


    }

    @Test
    public void category(){
        List<Category> categories = categoryMapper.selectAllCategory();
        Iterator<Category> iterator = categories.iterator();
        while (iterator.hasNext()){
            System.out.println(iterator.next());
        }
    }
    @Test
    public void categoryInsert(){
        categoryMapper.insertCategory(new Category(null, ""));
    }

    @Test
    public void categoryDelete(){
        categoryMapper.deleteCategory(10);
    }

    @Test
    public void admin(){
        Admin root = adminMapper.selectByUsername("root");
        System.out.println(root);
    }

    @Test
    public void dateTest(){
        Date date = new Date(); // 创建一个Date对象，获取当前时间
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy年MM月dd日 E HH:mm:ss");
        String newDate = simpleDateFormat.format(date);
        System.out.println(newDate);
    }

}
