package com.book.springboot.entity;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class BorrowExample {
    protected String orderByClause;

    protected boolean distinct;

    protected List<Criteria> oredCriteria;

    public BorrowExample() {
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

        public Criteria andBrIdIsNull() {
            addCriterion("br_id is null");
            return (Criteria) this;
        }

        public Criteria andBrIdIsNotNull() {
            addCriterion("br_id is not null");
            return (Criteria) this;
        }

        public Criteria andBrIdEqualTo(Integer value) {
            addCriterion("br_id =", value, "brId");
            return (Criteria) this;
        }

        public Criteria andBrIdNotEqualTo(Integer value) {
            addCriterion("br_id <>", value, "brId");
            return (Criteria) this;
        }

        public Criteria andBrIdGreaterThan(Integer value) {
            addCriterion("br_id >", value, "brId");
            return (Criteria) this;
        }

        public Criteria andBrIdGreaterThanOrEqualTo(Integer value) {
            addCriterion("br_id >=", value, "brId");
            return (Criteria) this;
        }

        public Criteria andBrIdLessThan(Integer value) {
            addCriterion("br_id <", value, "brId");
            return (Criteria) this;
        }

        public Criteria andBrIdLessThanOrEqualTo(Integer value) {
            addCriterion("br_id <=", value, "brId");
            return (Criteria) this;
        }

        public Criteria andBrIdIn(List<Integer> values) {
            addCriterion("br_id in", values, "brId");
            return (Criteria) this;
        }

        public Criteria andBrIdNotIn(List<Integer> values) {
            addCriterion("br_id not in", values, "brId");
            return (Criteria) this;
        }

        public Criteria andBrIdBetween(Integer value1, Integer value2) {
            addCriterion("br_id between", value1, value2, "brId");
            return (Criteria) this;
        }

        public Criteria andBrIdNotBetween(Integer value1, Integer value2) {
            addCriterion("br_id not between", value1, value2, "brId");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeIsNull() {
            addCriterion("br_outtime is null");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeIsNotNull() {
            addCriterion("br_outtime is not null");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeEqualTo(Date value) {
            addCriterion("br_outtime =", value, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeNotEqualTo(Date value) {
            addCriterion("br_outtime <>", value, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeGreaterThan(Date value) {
            addCriterion("br_outtime >", value, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeGreaterThanOrEqualTo(Date value) {
            addCriterion("br_outtime >=", value, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeLessThan(Date value) {
            addCriterion("br_outtime <", value, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeLessThanOrEqualTo(Date value) {
            addCriterion("br_outtime <=", value, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeIn(List<Date> values) {
            addCriterion("br_outtime in", values, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeNotIn(List<Date> values) {
            addCriterion("br_outtime not in", values, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeBetween(Date value1, Date value2) {
            addCriterion("br_outtime between", value1, value2, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrOuttimeNotBetween(Date value1, Date value2) {
            addCriterion("br_outtime not between", value1, value2, "brOuttime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeIsNull() {
            addCriterion("br_endtime is null");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeIsNotNull() {
            addCriterion("br_endtime is not null");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeEqualTo(Date value) {
            addCriterion("br_endtime =", value, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeNotEqualTo(Date value) {
            addCriterion("br_endtime <>", value, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeGreaterThan(Date value) {
            addCriterion("br_endtime >", value, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeGreaterThanOrEqualTo(Date value) {
            addCriterion("br_endtime >=", value, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeLessThan(Date value) {
            addCriterion("br_endtime <", value, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeLessThanOrEqualTo(Date value) {
            addCriterion("br_endtime <=", value, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeIn(List<Date> values) {
            addCriterion("br_endtime in", values, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeNotIn(List<Date> values) {
            addCriterion("br_endtime not in", values, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeBetween(Date value1, Date value2) {
            addCriterion("br_endtime between", value1, value2, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrEndtimeNotBetween(Date value1, Date value2) {
            addCriterion("br_endtime not between", value1, value2, "brEndtime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeIsNull() {
            addCriterion("br_backtime is null");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeIsNotNull() {
            addCriterion("br_backtime is not null");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeEqualTo(Date value) {
            addCriterion("br_backtime =", value, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeNotEqualTo(Date value) {
            addCriterion("br_backtime <>", value, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeGreaterThan(Date value) {
            addCriterion("br_backtime >", value, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeGreaterThanOrEqualTo(Date value) {
            addCriterion("br_backtime >=", value, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeLessThan(Date value) {
            addCriterion("br_backtime <", value, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeLessThanOrEqualTo(Date value) {
            addCriterion("br_backtime <=", value, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeIn(List<Date> values) {
            addCriterion("br_backtime in", values, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeNotIn(List<Date> values) {
            addCriterion("br_backtime not in", values, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeBetween(Date value1, Date value2) {
            addCriterion("br_backtime between", value1, value2, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrBacktimeNotBetween(Date value1, Date value2) {
            addCriterion("br_backtime not between", value1, value2, "brBacktime");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnIsNull() {
            addCriterion("br_ifreturn is null");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnIsNotNull() {
            addCriterion("br_ifreturn is not null");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnEqualTo(Integer value) {
            addCriterion("br_ifreturn =", value, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnNotEqualTo(Integer value) {
            addCriterion("br_ifreturn <>", value, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnGreaterThan(Integer value) {
            addCriterion("br_ifreturn >", value, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnGreaterThanOrEqualTo(Integer value) {
            addCriterion("br_ifreturn >=", value, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnLessThan(Integer value) {
            addCriterion("br_ifreturn <", value, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnLessThanOrEqualTo(Integer value) {
            addCriterion("br_ifreturn <=", value, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnIn(List<Integer> values) {
            addCriterion("br_ifreturn in", values, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnNotIn(List<Integer> values) {
            addCriterion("br_ifreturn not in", values, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnBetween(Integer value1, Integer value2) {
            addCriterion("br_ifreturn between", value1, value2, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrIfreturnNotBetween(Integer value1, Integer value2) {
            addCriterion("br_ifreturn not between", value1, value2, "brIfreturn");
            return (Criteria) this;
        }

        public Criteria andBrRecordIsNull() {
            addCriterion("br_record is null");
            return (Criteria) this;
        }

        public Criteria andBrRecordIsNotNull() {
            addCriterion("br_record is not null");
            return (Criteria) this;
        }

        public Criteria andBrRecordEqualTo(String value) {
            addCriterion("br_record =", value, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordNotEqualTo(String value) {
            addCriterion("br_record <>", value, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordGreaterThan(String value) {
            addCriterion("br_record >", value, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordGreaterThanOrEqualTo(String value) {
            addCriterion("br_record >=", value, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordLessThan(String value) {
            addCriterion("br_record <", value, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordLessThanOrEqualTo(String value) {
            addCriterion("br_record <=", value, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordLike(String value) {
            addCriterion("br_record like", value, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordNotLike(String value) {
            addCriterion("br_record not like", value, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordIn(List<String> values) {
            addCriterion("br_record in", values, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordNotIn(List<String> values) {
            addCriterion("br_record not in", values, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordBetween(String value1, String value2) {
            addCriterion("br_record between", value1, value2, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrRecordNotBetween(String value1, String value2) {
            addCriterion("br_record not between", value1, value2, "brRecord");
            return (Criteria) this;
        }

        public Criteria andBrBookidIsNull() {
            addCriterion("br_bookid is null");
            return (Criteria) this;
        }

        public Criteria andBrBookidIsNotNull() {
            addCriterion("br_bookid is not null");
            return (Criteria) this;
        }

        public Criteria andBrBookidEqualTo(Integer value) {
            addCriterion("br_bookid =", value, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrBookidNotEqualTo(Integer value) {
            addCriterion("br_bookid <>", value, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrBookidGreaterThan(Integer value) {
            addCriterion("br_bookid >", value, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrBookidGreaterThanOrEqualTo(Integer value) {
            addCriterion("br_bookid >=", value, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrBookidLessThan(Integer value) {
            addCriterion("br_bookid <", value, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrBookidLessThanOrEqualTo(Integer value) {
            addCriterion("br_bookid <=", value, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrBookidIn(List<Integer> values) {
            addCriterion("br_bookid in", values, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrBookidNotIn(List<Integer> values) {
            addCriterion("br_bookid not in", values, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrBookidBetween(Integer value1, Integer value2) {
            addCriterion("br_bookid between", value1, value2, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrBookidNotBetween(Integer value1, Integer value2) {
            addCriterion("br_bookid not between", value1, value2, "brBookid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidIsNull() {
            addCriterion("br_readerid is null");
            return (Criteria) this;
        }

        public Criteria andBrReaderidIsNotNull() {
            addCriterion("br_readerid is not null");
            return (Criteria) this;
        }

        public Criteria andBrReaderidEqualTo(Integer value) {
            addCriterion("br_readerid =", value, "brReaderid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidNotEqualTo(Integer value) {
            addCriterion("br_readerid <>", value, "brReaderid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidGreaterThan(Integer value) {
            addCriterion("br_readerid >", value, "brReaderid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidGreaterThanOrEqualTo(Integer value) {
            addCriterion("br_readerid >=", value, "brReaderid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidLessThan(Integer value) {
            addCriterion("br_readerid <", value, "brReaderid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidLessThanOrEqualTo(Integer value) {
            addCriterion("br_readerid <=", value, "brReaderid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidIn(List<Integer> values) {
            addCriterion("br_readerid in", values, "brReaderid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidNotIn(List<Integer> values) {
            addCriterion("br_readerid not in", values, "brReaderid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidBetween(Integer value1, Integer value2) {
            addCriterion("br_readerid between", value1, value2, "brReaderid");
            return (Criteria) this;
        }

        public Criteria andBrReaderidNotBetween(Integer value1, Integer value2) {
            addCriterion("br_readerid not between", value1, value2, "brReaderid");
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