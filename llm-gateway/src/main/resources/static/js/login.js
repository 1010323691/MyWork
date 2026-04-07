/**
 * LLM Gateway - Login Page JavaScript (纯 Token 认证)
 */

(function() {
    'use strict';

    // ============================================
    // DOM 元素
    // ============================================
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const successBox = document.getElementById('successBox');

    // ============================================
    // 初始化
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        initEventListeners();
        checkExistingSession();
    });

    // ============================================
    // 事件监听器
    // ============================================
    function initEventListeners() {
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }

    // ============================================
    // 检查已有 Token（纯 Token 检查，无 session）
    // ============================================
    function checkExistingSession() {
        if (API.isAuthenticated()) {
            // Token 有效，跳转到 dashboard
            window.location.href = '/dashboard';
        }
    }

    // ============================================
    // 处理登录（纯 Token 响应）
    // ============================================
    async function handleLogin(e) {
        e.preventDefault();

        const username = usernameInput?.value.trim();
        const password = passwordInput?.value;

        // 表单验证
        const usernameError = FormValidation.required(username, '用户名');
        if (usernameError) {
            UI.showErrorMessage(usernameError);
            return;
        }

        const passwordError = FormValidation.required(password, '密码');
        if (passwordError) {
            UI.showErrorMessage(passwordError);
            return;
        }

        // 禁用提交按钮防止重复提交
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '登录中...';
        }

        try {
            // 发送登录请求，只返回 token
            const response = await API.post('/auth/login', { username, password });

            if (response.token) {
                // 只保存 token，所有用户信息从 token 解码
                localStorage.setItem('token', response.token);

                // 显示成功消息
                if (successBox) {
                    successBox.style.display = 'block';
                }

                // 延迟跳转到管理后台
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 500);
            } else {
                throw new Error(response.error || '登录失败');
            }

        } catch (error) {
            console.error('登录失败:', error);
            UI.showErrorMessage(error.message || '登录失败，请检查用户名和密码');

        } finally {
            // 恢复提交按钮
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '登录';
            }
        }
    }
})();
