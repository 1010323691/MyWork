/**
 * LLM Gateway - Login Page JavaScript
 * Session/Cookie 认证模式
 * 表单通过 AJAX 提交到 API，避免 Spring Security 默认登录页干扰
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        // 检查是否已登录，如果已登录则跳转到 dashboard
        if (await API.isAuthenticated()) {
            window.location.href = '/dashboard';
        }

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                const username = document.getElementById('username')?.value.trim();
                const password = document.getElementById('password')?.value;

                // 基本验证
                if (!username || username.length === 0) {
                    showError('请输入用户名');
                    return;
                }

                if (!password || password.length === 0) {
                    showError('请输入密码');
                    return;
                }

                hideError();

                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });

                    if (response.ok) {
                        // 登录成功，跳转到 dashboard
                        window.location.href = '/dashboard';
                    } else {
                        const data = await response.json();
                        showError(data.error || '用户名或密码错误');
                    }
                } catch (err) {
                    console.error('Login error:', err);
                    showError('登录失败，请稍后重试');
                }
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
