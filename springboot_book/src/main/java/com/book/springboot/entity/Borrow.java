package com.book.springboot.entity;

import java.util.Date;

public class Borrow {
    private Integer brId;//记录id
    private Date brOuttime;//出借时间
    private Date brEndtime;//截止时间
    private Date brBacktime;//归还时间
    private int brIfreturn;//是否归还 0未归还，1已归还
    private String brRecord;//附加说明
    private Book brBook;//图书
    private Reader brReader;//读者

    public Borrow() {
    }

    public Borrow(Integer brId, Date brOuttime, Date brEndtime, Date brBacktime, int brIfreturn, String brRecord, Book brBook, Reader brReader) {
        this.brId = brId;
        this.brOuttime = brOuttime;
        this.brEndtime = brEndtime;
        this.brBacktime = brBacktime;
        this.brIfreturn = brIfreturn;
        this.brRecord = brRecord;
        this.brBook = brBook;
        this.brReader = brReader;
    }

    public Integer getBrId() {
        return brId;
    }

    public void setBrId(Integer brId) {
        this.brId = brId;
    }

    public Date getBrOuttime() {
        return brOuttime;
    }

    public void setBrOuttime(Date brOuttime) {
        this.brOuttime = brOuttime;
    }

    public Date getBrEndtime() {
        return brEndtime;
    }

    public void setBrEndtime(Date brEndtime) {
        this.brEndtime = brEndtime;
    }

    public Date getBrBacktime() {
        return brBacktime;
    }

    public void setBrBacktime(Date brBacktime) {
        this.brBacktime = brBacktime;
    }

    public int getBrIfreturn() {
        return brIfreturn;
    }

    public void setBrIfreturn(int brIfreturn) {
        this.brIfreturn = brIfreturn;
    }

    public String getBrRecord() {
        return brRecord;
    }

    public void setBrRecord(String brRecord) {
        this.brRecord = brRecord;
    }

    public Book getBrBook() {
        return brBook;
    }

    public void setBrBook(Book brBook) {
        this.brBook = brBook;
    }

    public Reader getBrReader() {
        return brReader;
    }

    public void setBrReader(Reader brReader) {
        this.brReader = brReader;
    }

    @Override
    public String toString() {
        return "Borrow{" +
                "brId=" + brId +
                ", brOuttime=" + brOuttime +
                ", brEndtime=" + brEndtime +
                ", brBacktime=" + brBacktime +
                ", brIfreturn=" + brIfreturn +
                ", brRecord='" + brRecord + '\'' +
                ", brBook=" + brBook +
                ", brReader=" + brReader +
                '}';
    }
}
