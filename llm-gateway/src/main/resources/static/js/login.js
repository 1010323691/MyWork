/**
 * LLM Gateway - Login Page JavaScript
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

        // 回车键提交
        if (usernameInput || passwordInput) {
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.target.matches('button')) {
                    // 让表单自己处理回车
                }
            });
        }
    }

    // ============================================
    // 检查已有会话
    // ============================================
    function checkExistingSession() {
        if (API.isAuthenticated()) {
            // 如果已登录，自动跳转到管理后台
            window.location.href = '/dashboard';
        }
    }

    // ============================================
    // 处理登录
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
            // 发送登录请求
            const response = await API.post('/auth/login', {
                username,
                password
            });

            if (response.token) {
                // 保存认证信息
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify({
                    username: response.username,
                    email: response.email
                }));

                // 显示成功消息
                if (successBox) {
                    successBox.style.display = 'block';
                }

                // 延迟跳转到管理后台
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 500);
            } else {
                throw new Error(response.error || '用户名或密码错误');
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
