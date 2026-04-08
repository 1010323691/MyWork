/**
 * LLM Gateway - Login Page JavaScript
 * Session/Cookie 认证模式
 * 表单直接提交给 Spring Security 处理
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        // 检查是否已登录，如果已登录则跳转到 dashboard
        if (await API.isAuthenticated()) {
            window.location.href = '/dashboard';
        }

        // 简单的客户端表单验证（不拦截提交，仅验证）
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                const username = document.getElementById('username')?.value.trim();
                const password = document.getElementById('password')?.value;

                // 基本验证
                if (!username || username.length === 0) {
                    e.preventDefault();
                    showError('请输入用户名');
                    return false;
                }

                if (!password || password.length === 0) {
                    e.preventDefault();
                    showError('请输入密码');
                    return false;
                }

                // 验证通过，隐藏之前的错误信息
                hideError();
                return true;
            });
        }
    });

    function showError(message) {
        let errorDiv = document.querySelector('.alert-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-error';
            errorDiv.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;min-width:300px;max-width:90%;border-radius:8px;padding:15px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.1);';
            document.body.insertBefore(errorDiv, document.body.firstChild);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    function hideError() {
        const errorDiv = document.querySelector('.alert-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
})();
