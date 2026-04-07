/**
 * LLM Gateway - Dashboard Page JavaScript
 */

(function() {
    'use strict';

    // ============================================
    // 全局状态
    // ============================================
    let apiKeys = [];
    const apiClient = new API();
    let currentUserRole = 'USER'; // 默认 USER，从后端传递

    // ============================================
    // DOM 元素
    // ============================================
    const elements = {};

    // ============================================
    // 初始化
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        // 从后端获取用户角色
        if (window.currentUser && window.currentUser.role) {
            currentUserRole = window.currentUser.role;
        }
        cacheElements();
        checkAuth();
        initUIBasedOnRole();
        initEventListeners();
        loadApiKeys();
    });

    // ============================================
    // 缓存 DOM 元素
    // ============================================
    function cacheElements() {
        elements.apiKeyName = document.getElementById('apiKeyName');
        elements.tokenLimit = document.getElementById('tokenLimit');
        elements.expiresAtDays = document.getElementById('expiresAtDays');
        elements.loading = document.getElementById('loading');
        elements.apiKeyList = document.getElementById('apiKeyList');
        elements.apiKeyTableBody = document.getElementById('apiKeyTableBody');
        elements.clientApiKey = document.getElementById('clientApiKey');
        elements.tokenUsageResult = document.getElementById('tokenUsageResult');
    }

    // ============================================
    // 检查认证
    // ============================================
    function checkAuth() {
        if (!API.isAuthenticated()) {
            window.location.href = '/login';
        }

        // 更新用户信息显示
        const user = API.getCurrentUser();
        if (user) {
            const userInfoElement = document.querySelector('.user-info span');
            if (userInfoElement) {
                userInfoElement.textContent = `${user.username} (${user.email})`;
            }
        }
    }

    // ============================================
    // 根据用户角色初始化 UI
    // ============================================
    function initUIBasedOnRole() {
        console.log('Current user role:', currentUserRole);

        const createApiKeyCard = document.getElementById('createApiKeyCard');

        if (currentUserRole === 'USER') {
            // 普通用户：可以创建自己的 API Key，但不能删除/禁用
            // 创建功能保持可见
            if (createApiKeyCard) {
                const cardTitle = createApiKeyCard.querySelector('.card-title');
                if (cardTitle) {
                    cardTitle.textContent = '创建我的 API Key';
                }
            }
        } else if (currentUserRole === 'ADMIN') {
            // 管理员：可以管理所有 API Key
            // 所有功能保持默认
        }
    }

    // ============================================
    // 事件监听器
    // ============================================
    function initEventListeners() {
        // 创建 API Key 按钮
        const createBtn = document.querySelector('button[onclick="createApiKey()"]');
        if (createBtn) {
            createBtn.addEventListener('click', createApiKey);
        }

        // 查询 Token 余量按钮
        const checkBtn = document.querySelector('button[onclick="checkTokenUsage()"]');
        if (checkBtn) {
            checkBtn.addEventListener('click', checkTokenUsage);
        }

        // 退出登录按钮
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    }

    // ============================================
    // 加载 API Keys
    // ============================================
    async function loadApiKeys() {
        try {
            elements.loading?.classList.remove('d-none');
            elements.apiKeyList?.classList.add('d-none');

            const data = await apiClient.get('/admin/apikeys');
            apiKeys = Array.isArray(data) ? data : [];

            renderApiKeyTable();
            elements.apiKeyList?.classList.remove('d-none');

        } catch (error) {
            console.error('加载 API Keys 失败:', error);
            UI.showErrorMessage('加载失败：' + error.message);
        } finally {
            elements.loading?.classList.add('d-none');
        }
    }

    // ============================================
    // 渲染 API Key 表格
    // ============================================
    function renderApiKeyTable() {
        if (!elements.apiKeyTableBody) return;

        if (apiKeys.length === 0) {
            const isUser = currentUserRole === 'USER';
            elements.apiKeyTableBody.innerHTML = `
                <tr>
                    <td colspan="${isUser ? '6' : '7'}">
                        <div class="empty-state">
                            <div class="empty-state-icon">📋</div>
                            <div class="empty-state-text">暂无 API Key</div>
                            <div class="empty-state-text">${isUser ? '请在上方创建您的 API Key' : '请在上方创建新的 API Key'}</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // 根据用户角色生成操作列
        const renderActions = (key) => {
            if (currentUserRole === 'USER') {
                // 普通用户：只显示复制 Key 按钮（只读模式，但可创建自己的 Key）
                return `
                    <button class="btn btn-sm btn-info" onclick="copyApiKey('${escapeHtml(key.key)}')">
                        复制 Key
                    </button>
                `;
            } else {
                // 管理员：显示全部操作按钮
                return `
                    <button class="btn btn-sm btn-success" style="margin-right: 8px"
                            onclick="toggleApiKey(${key.id})">
                        ${key.enabled ? '禁用' : '启用'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteApiKey(${key.id})">
                        删除
                    </button>
                `;
            }
        };

        elements.apiKeyTableBody.innerHTML = apiKeys.map(key => `
            <tr>
                <td>${escapeHtml(key.name)}</td>
                <td>
                    <div class="api-key-field">
                        <input type="text" value="${escapeHtml(key.key)}" readonly
                               onclick="copyApiKey('${escapeHtml(key.key)}')"
                               title="点击复制">
                    </div>
                </td>
                <td>${UI.formatNumber(key.tokenLimit)}</td>
                <td>${UI.formatNumber(key.usedTokens || 0)}</td>
                <td>
                    <span class="badge ${key.enabled ? 'badge-success' : 'badge-danger'}">
                        ${key.enabled ? '启用' : '禁用'}
                    </span>
                </td>
                <td>${UI.formatDate(key.expiresAt)}</td>
                <td>${renderActions(key)}</td>
            </tr>
        `).join('');
    }

    // ============================================
    // 创建 API Key
    // ============================================
    async function createApiKey() {
        const name = elements.apiKeyName?.value.trim();
        const tokenLimit = elements.tokenLimit?.value;
        const expiresAtDays = elements.expiresAtDays?.value;

        // 验证
        const nameError = FormValidation.required(name, '名称');
        if (nameError) {
            UI.showErrorMessage(nameError);
            return;
        }

        try {
            const response = await apiClient.post('/admin/apikeys', {
                name,
                tokenLimit: tokenLimit ? parseInt(tokenLimit) : null,
                expiresAtDays: expiresAtDays ? parseInt(expiresAtDays) : null
            });

            UI.showSuccessMessage('创建成功！');

            // 清空表单
            if (elements.apiKeyName) elements.apiKeyName.value = '';
            if (elements.tokenLimit) elements.tokenLimit.value = '';
            if (elements.expiresAtDays) elements.expiresAtDays.value = '';

            // 重新加载列表
            await loadApiKeys();

        } catch (error) {
            console.error('创建 API Key 失败:', error);
            UI.showErrorMessage('创建失败：' + error.message);
        }
    }

    // ============================================
    // 删除 API Key
    // ============================================
    async function deleteApiKey(id) {
        if (!confirm('确定要删除这个 API Key 吗？此操作不可恢复。')) {
            return;
        }

        try {
            await apiClient.delete(`/admin/apikeys/${id}`);
            UI.showSuccessMessage('删除成功');
            await loadApiKeys();

        } catch (error) {
            console.error('删除 API Key 失败:', error);
            UI.showErrorMessage('删除失败：' + error.message);
        }
    }

    // ============================================
    // 启用/禁用 API Key
    // ============================================
    async function toggleApiKey(id) {
        try {
            const data = await apiClient.put(`/admin/apikeys/${id}/toggle`);

            // 更新本地状态
            const index = apiKeys.findIndex(k => k.id === id);
            if (index !== -1) {
                apiKeys[index] = data;
                renderApiKeyTable();
            }

        } catch (error) {
            console.error('切换 API Key 状态失败:', error);
            UI.showErrorMessage('操作失败：' + error.message);
        }
    }

    // ============================================
    // 复制 API Key
    // ============================================
    function copyApiKey(key) {
        UI.copyToClipboard(key);
    }

    // ============================================
    // 切换标签页
    // ============================================
    function switchTab(tabId) {
        UI.switchTab(tabId);

        // 切换到使用统计时加载统计数据
        if (tabId === 'usage') {
            loadStats();
        }
    }

    // ============================================
    // 加载统计
    // ============================================
    function loadStats() {
        const totalApiKeys = apiKeys.length;
        const activeApiKeys = apiKeys.filter(k => k.enabled).length;
        const totalTokens = apiKeys.reduce((sum, k) => sum + (k.tokenLimit || 0), 0);
        const usedTokens = apiKeys.reduce((sum, k) => sum + (k.usedTokens || 0), 0);

        document.getElementById('totalApiKeys').textContent = totalApiKeys;
        document.getElementById('activeApiKeys').textContent = activeApiKeys;
        document.getElementById('totalTokens').textContent = UI.formatNumber(totalTokens);
        document.getElementById('usedTokens').textContent = UI.formatNumber(usedTokens);
    }

    // ============================================
    // 查询 Token 余量
    // ============================================
    async function checkTokenUsage() {
        const apiKey = elements.clientApiKey?.value.trim();

        if (!apiKey) {
            UI.showErrorMessage('请输入 API Key');
            return;
        }

        if (!apiKey.startsWith('nkey_')) {
            UI.showErrorMessage('请输入有效的 API Key (以 nkey_ 开头)');
            return;
        }

        try {
            // 使用 X-API-Key header 进行认证
            const response = await fetch('/api/clients/token-usage', {
                method: 'GET',
                headers: {
                    'X-API-Key': apiKey
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || '查询失败');
            }

            const data = await response.json();

            // 显示结果
            document.getElementById('usageKeyName').textContent = data.apiKeyName;
            document.getElementById('usageTotal').textContent = UI.formatNumber(data.totalTokens);
            document.getElementById('usageUsed').textContent = UI.formatNumber(data.usedTokens || 0);
            document.getElementById('usageRemaining').textContent = UI.formatNumber(data.remainingTokens);

            elements.tokenUsageResult?.classList.remove('d-none');

        } catch (error) {
            console.error('查询 Token 余量失败:', error);
            UI.showErrorMessage('查询失败：' + error.message);
        }
    }

    // ============================================
    // 退出登录
    // ============================================
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }

    // ============================================
    // HTML 转义（防止 XSS）
    // ============================================
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // 导出全局函数（用于内联 onclick）
    // ============================================
    window.createApiKey = createApiKey;
    window.deleteApiKey = deleteApiKey;
    window.toggleApiKey = toggleApiKey;
    window.copyApiKey = copyApiKey;
    window.switchTab = switchTab;
    window.checkTokenUsage = checkTokenUsage;
    window.logout = logout;
})();
