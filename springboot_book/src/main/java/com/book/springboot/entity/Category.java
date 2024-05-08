package com.book.springboot.entity;

public class Category {
    private Integer cId;//分类编号
    private String cName;//分类名称

    public Category(Integer cId, String cName) {
        this.cId = cId;
        this.cName = cName;
    }

    public Category() {
    }

    public Integer getcId() {
        return cId;
    }

    public void setcId(Integer cId) {
        this.cId = cId;
    }

    public String getcName() {
        return cName;
    }

    public void setcName(String cName) {
        this.cName = cName;
    }

    @Override
    public String toString() {
        return "Category{" +
                "cId=" + cId +
                ", cName='" + cName + '\'' +
                '}';
    }
}
