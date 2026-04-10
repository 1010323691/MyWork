/**
 * LLM Gateway - Login Page JavaScript
 * Session/Cookie authentication mode
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        if (await API.isAuthenticated()) {
            window.location.href = '/dashboard';
            return;
        }

        const loginForm = document.getElementById('loginForm');
        if (!loginForm) {
            return;
        }

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('username')?.value.trim();
            const password = document.getElementById('password')?.value;

            if (!username) {
                UI.showErrorMessage('请输入用户名');
                return;
            }

            if (!password) {
                UI.showErrorMessage('请输入密码');
                return;
            }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    window.location.href = '/dashboard';
                    return;
                }

                const data = await response.json().catch(function() {
                    return {};
                });
                UI.showErrorMessage(data.error || '用户名或密码错误');
            } catch (err) {
                console.error('Login error:', err);
                UI.showErrorMessage('登录失败，请稍后重试');
            }
        });
    });
})();
