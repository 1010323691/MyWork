package com.book.springboot.entity;

import java.util.Date;

public class Borrow {
    private Integer brId;

    private Date brOuttime;

    private Date brEndtime;

    private Date brBacktime;

    private Integer brIfreturn;

    private String brRecord;

    private Integer brBookid;

    private Integer brReaderid;

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

    public Integer getBrIfreturn() {
        return brIfreturn;
    }

    public void setBrIfreturn(Integer brIfreturn) {
        this.brIfreturn = brIfreturn;
    }

    public String getBrRecord() {
        return brRecord;
    }

    public void setBrRecord(String brRecord) {
        this.brRecord = brRecord;
    }

    public Integer getBrBookid() {
        return brBookid;
    }

    public void setBrBookid(Integer brBookid) {
        this.brBookid = brBookid;
    }

    public Integer getBrReaderid() {
        return brReaderid;
    }

    public void setBrReaderid(Integer brReaderid) {
        this.brReaderid = brReaderid;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(getClass().getSimpleName());
        sb.append(" [");
        sb.append("Hash = ").append(hashCode());
        sb.append(", brId=").append(brId);
        sb.append(", brOuttime=").append(brOuttime);
        sb.append(", brEndtime=").append(brEndtime);
        sb.append(", brBacktime=").append(brBacktime);
        sb.append(", brIfreturn=").append(brIfreturn);
        sb.append(", brRecord=").append(brRecord);
        sb.append(", brBookid=").append(brBookid);
        sb.append(", brReaderid=").append(brReaderid);
        sb.append("]");
        return sb.toString();
    }
}