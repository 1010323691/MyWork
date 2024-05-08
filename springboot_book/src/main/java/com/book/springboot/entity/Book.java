package com.book.springboot.entity;

public class Book {
    private Integer bId;

    private String bName;

    private String bAuthor;

    private String bPress;

    private Integer bStock;

    private Integer bCategoryid;

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

    public Integer getbCategoryid() {
        return bCategoryid;
    }

    public void setbCategoryid(Integer bCategoryid) {
        this.bCategoryid = bCategoryid;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(getClass().getSimpleName());
        sb.append(" [");
        sb.append("Hash = ").append(hashCode());
        sb.append(", bId=").append(bId);
        sb.append(", bName=").append(bName);
        sb.append(", bAuthor=").append(bAuthor);
        sb.append(", bPress=").append(bPress);
        sb.append(", bStock=").append(bStock);
        sb.append(", bCategoryid=").append(bCategoryid);
        sb.append("]");
        return sb.toString();
    }
}