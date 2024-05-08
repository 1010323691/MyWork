package com.book.springboot.mapper;

import com.book.springboot.entity.Borrow;

import java.util.List;

public interface BorrowMapper {

    public List<Borrow> selectAllBorrow();
    public List<Borrow> selectBorrowing();
    public List<Borrow> selectBorrowed();
    public Borrow selectById(Integer brId);
    public void insertBorrow(Borrow borrow);
    public void updateBorrow(Borrow borrow);

}
