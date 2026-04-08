/**
 * LLM Gateway - Register Page JavaScript
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // 已登录则直接跳转
        if (API.isAuthenticated()) {
            window.location.href = '/dashboard';
            return;
        }

        const form = document.getElementById('registerForm');
        if (form) {
            form.addEventListener('submit', handleRegister);
        }
    });

    async function handleRegister(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 表单验证
        const usernameErr = FormValidation.required(username, '用户名') ||
                            FormValidation.minLength(username, 3, '用户名');
        if (usernameErr) { UI.showErrorMessage(usernameErr); return; }

        const emailErr = FormValidation.required(email, '邮箱') || FormValidation.email(email);
        if (emailErr) { UI.showErrorMessage(emailErr); return; }

        const pwdErr = FormValidation.required(password, '密码') ||
                       FormValidation.minLength(password, 6, '密码');
        if (pwdErr) { UI.showErrorMessage(pwdErr); return; }

        if (password !== confirmPassword) {
            UI.showErrorMessage('两次输入的密码不一致');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '注册中...'; }

        try {
            const resp = await API.post('/auth/register', { username, email, password });
            if (resp.message) {
                UI.showSuccessMessage('注册成功！即将跳转到登录页...');
                setTimeout(function() {
                    window.location.href = '/login';
                }, 1500);
            } else {
                throw new Error(resp.error || '注册失败');
            }
        } catch (err) {
            UI.showErrorMessage(err.message || '注册失败，请稍后重试');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '注册'; }
        }
    }
})();
