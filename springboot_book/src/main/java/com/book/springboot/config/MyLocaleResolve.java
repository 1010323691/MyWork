package com.book.springboot.config;

import org.apache.commons.lang3.StringUtils;
import org.springframework.web.servlet.LocaleResolver;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Locale;

/**
 * 可以在连接上携带区域信息
 */
public class MyLocaleResolve implements LocaleResolver {
	// 国际化实现
	@Override
	public Locale resolveLocale(HttpServletRequest request) {
		String l = request.getParameter("l");
		// 如果带参数则用设定的，没有带参数用系统默认的
		Locale locale = request.getLocale();
		if (StringUtils.isNoneEmpty(l)) {
			System.out.println("执行国际化方法");
			// 使用split将 en_US 根据_进行分割
			String[] split = l.split("_");
			locale = new Locale(split[0], split[1]);
		}
		return locale;
	}

	@Override
	public void setLocale(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse,
			Locale locale) {

	}
}
