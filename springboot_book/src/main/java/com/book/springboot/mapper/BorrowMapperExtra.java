package com.book.springboot.mapper;

import com.book.springboot.dto.BorrowDto;
import com.book.springboot.entity.Borrow;

import java.util.List;

public interface BorrowMapperExtra {

    public List<BorrowDto> selectAllBorrow();
    public List<BorrowDto> selectBorrowing();
    public List<BorrowDto> selectBorrowed();
    public BorrowDto selectById(Integer brId);
    public void insertBorrow(BorrowDto borrow);
    public void updateBorrow(BorrowDto borrow);

}
