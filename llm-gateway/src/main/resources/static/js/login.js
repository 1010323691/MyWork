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

        showRedirectToastFromQuery();

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
                    credentials: 'same-origin',
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

    function showRedirectToastFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const toastMessage = params.get('toastMessage');
        const toastType = params.get('toastType') || 'warning';

        if (!toastMessage) {
            return;
        }

        UI.showAlert(toastMessage, toastType);

        params.delete('toastMessage');
        params.delete('toastType');
        const nextQuery = params.toString();
        const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
        window.history.replaceState({}, document.title, nextUrl);
    }
})();
