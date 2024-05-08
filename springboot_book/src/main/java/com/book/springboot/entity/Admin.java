package com.book.springboot.entity;

public class Admin {
    private Integer aId;
    private String aUsername;
    private String aPassword;

    public Integer getaId() {
        return aId;
    }

    public void setaId(Integer aId) {
        this.aId = aId;
    }

    public String getaUsername() {
        return aUsername;
    }

    public void setaUsername(String aUsername) {
        this.aUsername = aUsername;
    }

    public String getaPassword() {
        return aPassword;
    }

    public void setaPassword(String aPassword) {
        this.aPassword = aPassword;
    }

    @Override
    public String toString() {
        return "Admin{" +
                "aId=" + aId +
                ", aUsername='" + aUsername + '\'' +
                ", aPassword='" + aPassword + '\'' +
                '}';
    }
}
