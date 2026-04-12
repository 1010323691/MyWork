/**
 * LLM Gateway - Common JavaScript Utilities
 * Session/Cookie 认证模式
 */

// ============================================
// API 配置
// ============================================
(function() {
if (window.__LLM_GATEWAY_COMMON_JS_LOADED__) {
    console.warn('common.js has already been loaded once; skipping duplicate execution.');
    return;
}
window.__LLM_GATEWAY_COMMON_JS_LOADED__ = true;

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
     * 复制到剪贴板（带降级方案）
     * 优先使用 Clipboard API，失败时降级到 execCommand 或手动复制
     */
    static async copyToClipboard(text) {
        // 方案 1：使用现代 Clipboard API（需要安全上下文）
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                this.showSuccessMessage('已复制到剪贴板');
                return;
            } catch (err) {
                console.warn('Clipboard API 失败，尝试降级方案:', err);
            }
        }

        // 方案 2：使用 execCommand（兼容旧浏览器和非安全上下文）
        if (this._copyWithExecCommand(text)) {
            this.showSuccessMessage('已复制到剪贴板');
            return;
        }

        // 方案 3：提供手动复制界面
        this._showManualCopy(text);
    }

    /**
     * 使用 execCommand 方式复制（降级方案）
     */
    static _copyWithExecCommand(text) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.top = '0';
            textarea.style.left = '0';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);

            textarea.select();
            textarea.setSelectionRange(0, 999999); // 兼容移动端

            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);

            return successful;
        } catch (err) {
            console.warn('execCommand 复制失败:', err);
            return false;
        }
    }

    /**
     * 显示手动复制界面（最终降级方案）
     */
    static _showManualCopy(text) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '9999';
        overlay.onclick = () => this._removeManualCopy(overlay);

        const content = document.createElement('div');
        content.style.background = '#fff';
        content.style.borderRadius = '8px';
        content.style.padding = '24px';
        content.style.maxWidth = '600px';
        content.style.margin = '100px auto';
        content.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';

        const title = document.createElement('h3');
        title.textContent = '手动复制 API Key';
        title.style.marginBottom = '16px';
        title.style.color = '#333';

        const tip = document.createElement('p');
        tip.textContent = '由于浏览器安全限制，无法自动复制。请手动选中下方内容并复制：';
        tip.style.color = '#666';
        tip.style.marginBottom = '12px';
        tip.style.fontSize = '14px';

        const code = document.createElement('code');
        code.textContent = text;
        code.style.display = 'block';
        code.style.padding = '16px';
        code.style.background = '#f5f5f5';
        code.style.borderRadius = '4px';
        code.style.fontFamily = 'monospace';
        code.style.fontSize = '14px';
        code.style.wordBreak = 'break-all';
        code.style.marginBottom = '16px';

        const steps = document.createElement('ul');
        steps.style.marginBottom = '16px';
        steps.style.color = '#666';
        steps.style.fontSize = '14px';
        steps.innerHTML = `
            <li>点击下方代码块</li>
            <li>按 Ctrl+A (Windows) 或 Cmd+A (Mac) 全选</li>
            <li>按 Ctrl+C (Windows) 或 Cmd+C (Mac) 复制</li>
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.className = 'btn btn-primary';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this._removeManualCopy(overlay);
        };

        content.appendChild(title);
        content.appendChild(tip);
        content.appendChild(code);
        content.appendChild(steps);
        content.appendChild(closeBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // 点击代码块自动选中
        code.onclick = () => {
            code.select();
        };
    }

    static _removeManualCopy(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
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
})();
