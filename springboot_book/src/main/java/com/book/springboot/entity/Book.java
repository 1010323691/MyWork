package com.book.springboot.entity;

public class Book {
    private Integer bId;//编号
    private String bName;//书名
    private String bAuthor;//作者
    private String bPress;//出版社
    private Integer bStock;//库存
    private Category bCategory;//分类

    public Book() {
    }

    public Book(Integer bId, String bName, String bAuthor, String bPress, Integer bStock, Category bCategory) {
        this.bId = bId;
        this.bName = bName;
        this.bAuthor = bAuthor;
        this.bPress = bPress;
        this.bStock = bStock;
        this.bCategory = bCategory;
    }

    public Integer getbId() {
        return bId;
    }

    public void setbId(Integer bId) {
        this.bId = bId;
    }

    public String getbName() {
        return bName;
    }

    public void setbName(String bName) {
        this.bName = bName;
    }

    public String getbAuthor() {
        return bAuthor;
    }

    public void setbAuthor(String bAuthor) {
        this.bAuthor = bAuthor;
    }

    public String getbPress() {
        return bPress;
    }

    public void setbPress(String bPress) {
        this.bPress = bPress;
    }

    public Integer getbStock() {
        return bStock;
    }

    public void setbStock(Integer bStock) {
        this.bStock = bStock;
    }

    public Category getbCategory() {
        return bCategory;
    }

    public void setbCategory(Category bCategory) {
        this.bCategory = bCategory;
    }

    @Override
    public String toString() {
        return "Book{" +
                "bId=" + bId +
                ", bName='" + bName + '\'' +
                ", bAuthor='" + bAuthor + '\'' +
                ", bPress='" + bPress + '\'' +
                ", bStock=" + bStock +
                ", bCategory=" + bCategory +
                '}';
    }
}
