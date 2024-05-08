package com.book.springboot.entity;

public class Reader {
    private Integer rId;

    private String rName;

    private String rEmail;

    private Integer rIfborrow;

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
        StringBuilder sb = new StringBuilder();
        sb.append(getClass().getSimpleName());
        sb.append(" [");
        sb.append("Hash = ").append(hashCode());
        sb.append(", rId=").append(rId);
        sb.append(", rName=").append(rName);
        sb.append(", rEmail=").append(rEmail);
        sb.append(", rIfborrow=").append(rIfborrow);
        sb.append("]");
        return sb.toString();
    }
}