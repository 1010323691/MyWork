package com.book.springboot.entity;

import java.util.ArrayList;
import java.util.List;

public class BookExample {
    protected String orderByClause;

    protected boolean distinct;

    protected List<Criteria> oredCriteria;

    public BookExample() {
        oredCriteria = new ArrayList<>();
    }

    public void setOrderByClause(String orderByClause) {
        this.orderByClause = orderByClause;
    }

    public String getOrderByClause() {
        return orderByClause;
    }

    public void setDistinct(boolean distinct) {
        this.distinct = distinct;
    }

    public boolean isDistinct() {
        return distinct;
    }

    public List<Criteria> getOredCriteria() {
        return oredCriteria;
    }

    public void or(Criteria criteria) {
        oredCriteria.add(criteria);
    }

    public Criteria or() {
        Criteria criteria = createCriteriaInternal();
        oredCriteria.add(criteria);
        return criteria;
    }

    public Criteria createCriteria() {
        Criteria criteria = createCriteriaInternal();
        if (oredCriteria.size() == 0) {
            oredCriteria.add(criteria);
        }
        return criteria;
    }

    protected Criteria createCriteriaInternal() {
        Criteria criteria = new Criteria();
        return criteria;
    }

    public void clear() {
        oredCriteria.clear();
        orderByClause = null;
        distinct = false;
    }

    protected abstract static class GeneratedCriteria {
        protected List<Criterion> criteria;

        protected GeneratedCriteria() {
            super();
            criteria = new ArrayList<>();
        }

        public boolean isValid() {
            return criteria.size() > 0;
        }

        public List<Criterion> getAllCriteria() {
            return criteria;
        }

        public List<Criterion> getCriteria() {
            return criteria;
        }

        protected void addCriterion(String condition) {
            if (condition == null) {
                throw new RuntimeException("Value for condition cannot be null");
            }
            criteria.add(new Criterion(condition));
        }

        protected void addCriterion(String condition, Object value, String property) {
            if (value == null) {
                throw new RuntimeException("Value for " + property + " cannot be null");
            }
            criteria.add(new Criterion(condition, value));
        }

        protected void addCriterion(String condition, Object value1, Object value2, String property) {
            if (value1 == null || value2 == null) {
                throw new RuntimeException("Between values for " + property + " cannot be null");
            }
            criteria.add(new Criterion(condition, value1, value2));
        }

        public Criteria andBIdIsNull() {
            addCriterion("b_id is null");
            return (Criteria) this;
        }

        public Criteria andBIdIsNotNull() {
            addCriterion("b_id is not null");
            return (Criteria) this;
        }

        public Criteria andBIdEqualTo(Integer value) {
            addCriterion("b_id =", value, "bId");
            return (Criteria) this;
        }

        public Criteria andBIdNotEqualTo(Integer value) {
            addCriterion("b_id <>", value, "bId");
            return (Criteria) this;
        }

        public Criteria andBIdGreaterThan(Integer value) {
            addCriterion("b_id >", value, "bId");
            return (Criteria) this;
        }

        public Criteria andBIdGreaterThanOrEqualTo(Integer value) {
            addCriterion("b_id >=", value, "bId");
            return (Criteria) this;
        }

        public Criteria andBIdLessThan(Integer value) {
            addCriterion("b_id <", value, "bId");
            return (Criteria) this;
        }

        public Criteria andBIdLessThanOrEqualTo(Integer value) {
            addCriterion("b_id <=", value, "bId");
            return (Criteria) this;
        }

        public Criteria andBIdIn(List<Integer> values) {
            addCriterion("b_id in", values, "bId");
            return (Criteria) this;
        }

        public Criteria andBIdNotIn(List<Integer> values) {
            addCriterion("b_id not in", values, "bId");
            return (Criteria) this;
        }

        public Criteria andBIdBetween(Integer value1, Integer value2) {
            addCriterion("b_id between", value1, value2, "bId");
            return (Criteria) this;
        }

        public Criteria andBIdNotBetween(Integer value1, Integer value2) {
            addCriterion("b_id not between", value1, value2, "bId");
            return (Criteria) this;
        }

        public Criteria andBNameIsNull() {
            addCriterion("b_name is null");
            return (Criteria) this;
        }

        public Criteria andBNameIsNotNull() {
            addCriterion("b_name is not null");
            return (Criteria) this;
        }

        public Criteria andBNameEqualTo(String value) {
            addCriterion("b_name =", value, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameNotEqualTo(String value) {
            addCriterion("b_name <>", value, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameGreaterThan(String value) {
            addCriterion("b_name >", value, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameGreaterThanOrEqualTo(String value) {
            addCriterion("b_name >=", value, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameLessThan(String value) {
            addCriterion("b_name <", value, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameLessThanOrEqualTo(String value) {
            addCriterion("b_name <=", value, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameLike(String value) {
            addCriterion("b_name like", value, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameNotLike(String value) {
            addCriterion("b_name not like", value, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameIn(List<String> values) {
            addCriterion("b_name in", values, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameNotIn(List<String> values) {
            addCriterion("b_name not in", values, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameBetween(String value1, String value2) {
            addCriterion("b_name between", value1, value2, "bName");
            return (Criteria) this;
        }

        public Criteria andBNameNotBetween(String value1, String value2) {
            addCriterion("b_name not between", value1, value2, "bName");
            return (Criteria) this;
        }

        public Criteria andBAuthorIsNull() {
            addCriterion("b_author is null");
            return (Criteria) this;
        }

        public Criteria andBAuthorIsNotNull() {
            addCriterion("b_author is not null");
            return (Criteria) this;
        }

        public Criteria andBAuthorEqualTo(String value) {
            addCriterion("b_author =", value, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorNotEqualTo(String value) {
            addCriterion("b_author <>", value, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorGreaterThan(String value) {
            addCriterion("b_author >", value, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorGreaterThanOrEqualTo(String value) {
            addCriterion("b_author >=", value, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorLessThan(String value) {
            addCriterion("b_author <", value, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorLessThanOrEqualTo(String value) {
            addCriterion("b_author <=", value, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorLike(String value) {
            addCriterion("b_author like", value, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorNotLike(String value) {
            addCriterion("b_author not like", value, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorIn(List<String> values) {
            addCriterion("b_author in", values, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorNotIn(List<String> values) {
            addCriterion("b_author not in", values, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorBetween(String value1, String value2) {
            addCriterion("b_author between", value1, value2, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBAuthorNotBetween(String value1, String value2) {
            addCriterion("b_author not between", value1, value2, "bAuthor");
            return (Criteria) this;
        }

        public Criteria andBPressIsNull() {
            addCriterion("b_press is null");
            return (Criteria) this;
        }

        public Criteria andBPressIsNotNull() {
            addCriterion("b_press is not null");
            return (Criteria) this;
        }

        public Criteria andBPressEqualTo(String value) {
            addCriterion("b_press =", value, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressNotEqualTo(String value) {
            addCriterion("b_press <>", value, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressGreaterThan(String value) {
            addCriterion("b_press >", value, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressGreaterThanOrEqualTo(String value) {
            addCriterion("b_press >=", value, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressLessThan(String value) {
            addCriterion("b_press <", value, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressLessThanOrEqualTo(String value) {
            addCriterion("b_press <=", value, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressLike(String value) {
            addCriterion("b_press like", value, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressNotLike(String value) {
            addCriterion("b_press not like", value, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressIn(List<String> values) {
            addCriterion("b_press in", values, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressNotIn(List<String> values) {
            addCriterion("b_press not in", values, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressBetween(String value1, String value2) {
            addCriterion("b_press between", value1, value2, "bPress");
            return (Criteria) this;
        }

        public Criteria andBPressNotBetween(String value1, String value2) {
            addCriterion("b_press not between", value1, value2, "bPress");
            return (Criteria) this;
        }

        public Criteria andBStockIsNull() {
            addCriterion("b_stock is null");
            return (Criteria) this;
        }

        public Criteria andBStockIsNotNull() {
            addCriterion("b_stock is not null");
            return (Criteria) this;
        }

        public Criteria andBStockEqualTo(Integer value) {
            addCriterion("b_stock =", value, "bStock");
            return (Criteria) this;
        }

        public Criteria andBStockNotEqualTo(Integer value) {
            addCriterion("b_stock <>", value, "bStock");
            return (Criteria) this;
        }

        public Criteria andBStockGreaterThan(Integer value) {
            addCriterion("b_stock >", value, "bStock");
            return (Criteria) this;
        }

        public Criteria andBStockGreaterThanOrEqualTo(Integer value) {
            addCriterion("b_stock >=", value, "bStock");
            return (Criteria) this;
        }

        public Criteria andBStockLessThan(Integer value) {
            addCriterion("b_stock <", value, "bStock");
            return (Criteria) this;
        }

        public Criteria andBStockLessThanOrEqualTo(Integer value) {
            addCriterion("b_stock <=", value, "bStock");
            return (Criteria) this;
        }

        public Criteria andBStockIn(List<Integer> values) {
            addCriterion("b_stock in", values, "bStock");
            return (Criteria) this;
        }

        public Criteria andBStockNotIn(List<Integer> values) {
            addCriterion("b_stock not in", values, "bStock");
            return (Criteria) this;
        }

        public Criteria andBStockBetween(Integer value1, Integer value2) {
            addCriterion("b_stock between", value1, value2, "bStock");
            return (Criteria) this;
        }

        public Criteria andBStockNotBetween(Integer value1, Integer value2) {
            addCriterion("b_stock not between", value1, value2, "bStock");
            return (Criteria) this;
        }

        public Criteria andBCategoryidIsNull() {
            addCriterion("b_categoryid is null");
            return (Criteria) this;
        }

        public Criteria andBCategoryidIsNotNull() {
            addCriterion("b_categoryid is not null");
            return (Criteria) this;
        }

        public Criteria andBCategoryidEqualTo(Integer value) {
            addCriterion("b_categoryid =", value, "bCategoryid");
            return (Criteria) this;
        }

        public Criteria andBCategoryidNotEqualTo(Integer value) {
            addCriterion("b_categoryid <>", value, "bCategoryid");
            return (Criteria) this;
        }

        public Criteria andBCategoryidGreaterThan(Integer value) {
            addCriterion("b_categoryid >", value, "bCategoryid");
            return (Criteria) this;
        }

        public Criteria andBCategoryidGreaterThanOrEqualTo(Integer value) {
            addCriterion("b_categoryid >=", value, "bCategoryid");
            return (Criteria) this;
        }

        public Criteria andBCategoryidLessThan(Integer value) {
            addCriterion("b_categoryid <", value, "bCategoryid");
            return (Criteria) this;
        }

        public Criteria andBCategoryidLessThanOrEqualTo(Integer value) {
            addCriterion("b_categoryid <=", value, "bCategoryid");
            return (Criteria) this;
        }

        public Criteria andBCategoryidIn(List<Integer> values) {
            addCriterion("b_categoryid in", values, "bCategoryid");
            return (Criteria) this;
        }

        public Criteria andBCategoryidNotIn(List<Integer> values) {
            addCriterion("b_categoryid not in", values, "bCategoryid");
            return (Criteria) this;
        }

        public Criteria andBCategoryidBetween(Integer value1, Integer value2) {
            addCriterion("b_categoryid between", value1, value2, "bCategoryid");
            return (Criteria) this;
        }

        public Criteria andBCategoryidNotBetween(Integer value1, Integer value2) {
            addCriterion("b_categoryid not between", value1, value2, "bCategoryid");
            return (Criteria) this;
        }
    }

    public static class Criteria extends GeneratedCriteria {
        protected Criteria() {
            super();
        }
    }

    public static class Criterion {
        private String condition;

        private Object value;

        private Object secondValue;

        private boolean noValue;

        private boolean singleValue;

        private boolean betweenValue;

        private boolean listValue;

        private String typeHandler;

        public String getCondition() {
            return condition;
        }

        public Object getValue() {
            return value;
        }

        public Object getSecondValue() {
            return secondValue;
        }

        public boolean isNoValue() {
            return noValue;
        }

        public boolean isSingleValue() {
            return singleValue;
        }

        public boolean isBetweenValue() {
            return betweenValue;
        }

        public boolean isListValue() {
            return listValue;
        }

        public String getTypeHandler() {
            return typeHandler;
        }

        protected Criterion(String condition) {
            super();
            this.condition = condition;
            this.typeHandler = null;
            this.noValue = true;
        }

        protected Criterion(String condition, Object value, String typeHandler) {
            super();
            this.condition = condition;
            this.value = value;
            this.typeHandler = typeHandler;
            if (value instanceof List<?>) {
                this.listValue = true;
            } else {
                this.singleValue = true;
            }
        }

        protected Criterion(String condition, Object value) {
            this(condition, value, null);
        }

        protected Criterion(String condition, Object value, Object secondValue, String typeHandler) {
            super();
            this.condition = condition;
            this.value = value;
            this.secondValue = secondValue;
            this.typeHandler = typeHandler;
            this.betweenValue = true;
        }

        protected Criterion(String condition, Object value, Object secondValue) {
            this(condition, value, secondValue, null);
        }
    }
}