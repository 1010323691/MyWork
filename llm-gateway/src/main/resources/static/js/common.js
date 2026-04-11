/**
 * LLM Gateway - Common JavaScript Utilities
 * Session/Cookie 认证模式
 */

// ============================================
// API 配置
// ============================================
const API_CONFIG = {
    BASE_URL: '/api',
    TIMEOUT: 30000
};

// ============================================
// HTTP 工具类（Session/Cookie 认证）
// ============================================
class API {
    /**
     * 检查用户是否已登录（调用后端 /api/auth/me 检查 Session）
     */
    static async isAuthenticated() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'same-origin'  // 自动携带 Cookie
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * 获取当前用户信息（从后端 /api/auth/me 获取）
     */
    static async getCurrentUser() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'same-origin'
            });
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * 统一的 HTTP 请求方法（Session 认证）
     */
    static async request(endpoint, options = {}) {
        const url = API_CONFIG.BASE_URL + endpoint;

        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        const config = {
            ...options,
            credentials: 'same-origin',  // 自动携带 Session Cookie
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

        try {
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.message || `HTTP ${response.status}`);
                error.status = response.status;

                // 401 未认证或 403 无权限：跳转到登录页
                if (response.status === 401 || response.status === 403) {
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                throw error;
            }

            if (response.status === 204) {
                return null;
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                return null;
            }

            const text = await response.text();
            return text ? JSON.parse(text) : null;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请重试');
            }
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// ============================================
// UI 工具类
// ============================================
class UI {
    static TOAST_HOST_ID = 'uiToastHost';
    static TOAST_DURATION = 5000;

    static ensureToastHost() {
        let host = document.getElementById(this.TOAST_HOST_ID);
        if (!host) {
            host = document.createElement('div');
            host.id = this.TOAST_HOST_ID;
            host.className = 'toast-host';
            host.setAttribute('data-managed', 'true');
            host.setAttribute('aria-live', 'polite');
            host.setAttribute('aria-atomic', 'false');
            document.body.appendChild(host);
        }
        return host;
    }

    /**
     * Show a floating toast without shifting page layout.
     */
    static showAlert(message, type = 'error') {
        const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
        const host = this.ensureToastHost();
        const toast = document.createElement('div');
        const body = document.createElement('div');
        const closeBtn = document.createElement('button');

        toast.className = `toast toast-${safeType}`;
        toast.setAttribute('role', safeType === 'error' ? 'alert' : 'status');

        body.className = 'toast-message';
        body.textContent = message;

        closeBtn.type = 'button';
        closeBtn.className = 'toast-close';
        closeBtn.setAttribute('aria-label', '\u5173\u95ed\u63d0\u793a');
        closeBtn.textContent = '\u00D7';

        toast.appendChild(body);
        toast.appendChild(closeBtn);
        host.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        const removeToast = () => {
            if (!toast.isConnected || toast.dataset.closing === 'true') {
                return;
            }
            toast.dataset.closing = 'true';
            toast.classList.remove('show');
            toast.classList.add('hide');
            window.setTimeout(() => {
                if (toast.isConnected) {
                    toast.remove();
                }
                if (host.isConnected && host.childElementCount === 0 && host.dataset.managed === 'true') {
                    host.remove();
                }
            }, 260);
        };

        closeBtn.addEventListener('click', removeToast);
        window.setTimeout(removeToast, this.TOAST_DURATION);
    }

    static showErrorMessage(message) {
        this.showAlert(message, 'error');
    }

    static showSuccessMessage(message) {
        this.showAlert(message, 'success');
    }

    /**
     * 复制到剪贴板
     */
    static copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => this.showSuccessMessage('已复制到剪贴板'))
            .catch(err => this.showErrorMessage('复制失败：' + err.message));
    }

    /**
     * 格式化数字（千分位）
     */
    static formatNumber(num) {
        if (num === null || num === undefined || num === '∞') {
            return '∞';
        }
        return Number(num).toLocaleString();
    }

    /**
     * 格式化金额，保留足够的小额精度，避免扣费后看起来没有变化。
     */
    static formatMoney(value, minFractionDigits = 2, maxFractionDigits = 8) {
        const amount = Number(value);
        const normalized = Number.isFinite(amount) ? amount : 0;
        return normalized.toLocaleString('zh-CN', {
            minimumFractionDigits: minFractionDigits,
            maximumFractionDigits: maxFractionDigits
        });
    }

    /**
     * 格式化日期
     */
    static formatDate(dateString) {
        if (!dateString) return '永不过期';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * 切换标签页
     */
    static switchTab(tabId) {
        // 查找所有 tab 按钮
        const tabs = document.querySelectorAll('.tab');
        // 查找所有 tab-content 区域
        const contents = document.querySelectorAll('.tab-content');

        // 移除所有激活状态
        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));

        // 激活选中的 tab 按钮
        const activeTab = Array.from(tabs).find(tab => tab.getAttribute('onclick')?.includes(tabId));
        // 激活选中的内容区域
        const activeContent = document.getElementById(tabId);

        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    /**
     * 显示确认对话框
     */
    static confirm(message, callback) {
        if (!message || !confirm(message)) {
            return;
        }
        callback();
    }

    /**
     * 防抖函数
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// ============================================
// 表单验证工具
// ============================================
class FormValidation {
    /**
     * 验证是否为空
     */
    static required(value, fieldName = '此字段') {
        if (!value || value.trim() === '') {
            return `${fieldName}不能为空`;
        }
        return null;
    }

    /**
     * 验证邮箱格式
     */
    static email(value) {
        if (!value) return null;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return '邮箱格式不正确';
        }
        return null;
    }

    /**
     * 验证最小长度
     */
    static minLength(value, min, fieldName = '此字段') {
        if (!value) return null;
        if (value.length < min) {
            return `${fieldName}长度不能少于${min}个字符`;
        }
        return null;
    }

    /**
     * 验证数字
     */
    static number(value, fieldName = '此字段') {
        if (!value) return null;
        if (isNaN(Number(value))) {
            return `${fieldName}必须是数字`;
        }
        return null;
    }

    /**
     * 验证最小值
     */
    static minValue(value, min, fieldName = '此字段') {
        if (!value) return null;
        if (Number(value) < min) {
            return `${fieldName}不能小于${min}`;
        }
        return null;
    }
}

// ============================================
// 全局错误处理
// ============================================
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    UI.showErrorMessage('系统错误，请稍后重试');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的 Promise 拒绝:', event.reason);
    UI.showErrorMessage('请求失败，请稍后重试');
});

// ============================================
// 导出（兼容浏览器环境）
// ============================================
window.API = API;
window.UI = UI;
window.FormValidation = FormValidation;
window.API_CONFIG = API_CONFIG;
