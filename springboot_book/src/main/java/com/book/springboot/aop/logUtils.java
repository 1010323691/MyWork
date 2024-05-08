package com.book.springboot.aop;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Aspect
@Component
public class logUtils {
    /****************抽取表达式****************/
    @Pointcut("execution(* com.book.springboot.controller.*.*(..))")
    public void myPoint(){}

    /*****************环绕通知****************/
    @Around("myPoint()")
    public Object myAround(ProceedingJoinPoint pjp) throws Throwable {

        Object[] args = pjp.getArgs();
        String name = pjp.getSignature().getName();
        Object proceed = null;
        try {
            //1.前置通知
            System.out.println("+=========["+name+"方法开始]==========");
            System.out.println("|参数列表：" + Arrays.asList(args));
            //利用反射推进目标方法进行,等于method.invoke(obj,args)
            proceed = pjp.proceed(args);
            //2.返回通知
            System.out.println("|"+name+"->执行成功");
        } catch (Exception e) {
            //3.异常通知
            System.out.println("|"+name+"->执行异常：【"+e.getMessage()+"】");
            throw new Exception(e);
        } finally {
            //4.后置通知
            System.out.println("+=========["+name+"方法结束]==========");
        }
        //反射后的返回值一定返回出去
        return proceed;
    }
}
