package com.nexusai.llm.gateway.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.boot.web.servlet.error.ErrorAttributes;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;

@Controller
public class AppErrorController implements ErrorController {

    private static final String NOT_FOUND_TOAST =
            "\u8bbf\u95ee\u7684\u9875\u9762\u4e0d\u5b58\u5728\uff0c\u5df2\u8fd4\u56de\u767b\u5f55\u9875";

    private final ErrorAttributes errorAttributes;

    public AppErrorController(ErrorAttributes errorAttributes) {
        this.errorAttributes = errorAttributes;
    }

    @RequestMapping("/error")
    public Object handleError(HttpServletRequest request) {
        HttpStatus status = resolveStatus(request);
        boolean htmlPageRequest = isHtmlPageRequest(request);

        if (status == HttpStatus.NOT_FOUND && htmlPageRequest) {
            return "redirect:/login?toastType=warning&toastMessage=" + encode(NOT_FOUND_TOAST);
        }

        WebRequest webRequest = new ServletWebRequest(request);
        Map<String, Object> errorDetails = new LinkedHashMap<>(
                errorAttributes.getErrorAttributes(webRequest, ErrorAttributeOptions.of(ErrorAttributeOptions.Include.MESSAGE)));

        errorDetails.putIfAbsent("status", status.value());
        errorDetails.putIfAbsent("error", status.getReasonPhrase());
        errorDetails.putIfAbsent("message", defaultMessage(status));

        MediaType contentType = htmlPageRequest ? MediaType.TEXT_PLAIN : MediaType.APPLICATION_JSON;
        Object body = htmlPageRequest ? defaultMessage(status) : errorDetails;

        return ResponseEntity.status(status)
                .header(HttpHeaders.CONTENT_TYPE, contentType.toString())
                .body(body);
    }

    private HttpStatus resolveStatus(HttpServletRequest request) {
        Object statusCode = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        if (statusCode instanceof Integer value) {
            HttpStatus resolved = HttpStatus.resolve(value);
            return resolved != null ? resolved : HttpStatus.INTERNAL_SERVER_ERROR;
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private boolean isHtmlPageRequest(HttpServletRequest request) {
        String accept = request.getHeader(HttpHeaders.ACCEPT);
        return "GET".equalsIgnoreCase(request.getMethod())
                && accept != null
                && accept.contains(MediaType.TEXT_HTML_VALUE);
    }

    private String defaultMessage(HttpStatus status) {
        if (status == HttpStatus.NOT_FOUND) {
            return "Page not found";
        }
        return "Request failed";
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
