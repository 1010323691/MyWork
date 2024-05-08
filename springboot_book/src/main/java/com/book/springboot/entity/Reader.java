package com.book.springboot.entity;

public class Reader {
    private Integer rId;//读者编号
    private String rName;//读者姓名
    private String rEmail;//读者邮箱
    private Integer rIfborrow;

    public Reader() {
    }

    public Reader(Integer rId, String rName, String rEmail, Integer rIfborrow) {
        this.rId = rId;
        this.rName = rName;
        this.rEmail = rEmail;
        this.rIfborrow = rIfborrow;
    }

    public Integer getrId() {
        return rId;
    }

    public void setrId(Integer rId) {
        this.rId = rId;
    }

    public String getrName() {
        return rName;
    }

    public void setrName(String rName) {
        this.rName = rName;
    }

    public String getrEmail() {
        return rEmail;
    }

    public void setrEmail(String rEmail) {
        this.rEmail = rEmail;
    }

    public Integer getrIfborrow() {
        return rIfborrow;
    }

    public void setrIfborrow(Integer rIfborrow) {
        this.rIfborrow = rIfborrow;
    }

    @Override
    public String toString() {
        return "Reader{" +
                "rId=" + rId +
                ", rName='" + rName + '\'' +
                ", rEmail='" + rEmail + '\'' +
                ", rIfborrow=" + rIfborrow +
                '}';
    }
}
