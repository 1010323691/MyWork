/**
 * LLM Gateway - Dashboard Page JavaScript (纯 Token 认证)
 */

(function() {
    'use strict';

    // ===============================
    // 全局状态
    // ===============================
    let apiKeys = [];
    let currentUser = null;
    let currentUserRole = 'USER';

    // ===============================
    // DOM 元素
    // ===============================
    const elements = {};

    // ===============================
    // 初始化
    // ===============================
    document.addEventListener('DOMContentLoaded', function() {
        // 检查认证状态（纯 Token 检查）
        if (!checkAuthentication()) {
            window.location.href = '/login';
            return;
        }

        // 初始化用户信息（从 token 解码）
        initUserInfo();

        cacheElements();
        initUIBasedOnRole();
        initEventListeners();
        loadApiKeys();
    });

    // ===============================
    // 检查认证状态（纯 Token 验证）
    // ===============================
    function checkAuthentication() {
        if (!API.isAuthenticated()) {
            console.log('无有效 Token');
            return false;
        }

        // 获取用户信息
        currentUser = API.getCurrentUser();
        if (!currentUser) {
            console.log('无法获取用户信息');
            localStorage.removeItem('token');
            return false;
        }

        return true;
    }

    // ===============================
    // 初始化用户信息（从 Token 解码）
    // ===============================
    function initUserInfo() {
        currentUserRole = currentUser.role || 'USER';

        // 显示用户信息到 header
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.innerHTML = `
                <span class="user-name">${escapeHtml(currentUser.username)}</span>
                <a href="#" onclick="logout()" class="logout-btn">退出登录</a>
            `;
        }

        // 显示角色提示
        const userInfoAlert = document.getElementById('userInfoAlert');
        const userRoleEl = document.getElementById('userRole');
        const userRoleDesc = document.getElementById('userRoleDesc');

        if (userInfoAlert && userRoleEl) {
            userInfoAlert.style.display = 'block';
            userRoleEl.textContent = currentUserRole;

            if (currentUserRole === 'USER') {
                userRoleDesc.textContent = ' - 您只能查看和管理自己的 API Key';
            } else if (currentUserRole === 'ADMIN') {
                userRoleDesc.textContent = ' - 管理员权限，可以管理所有用户的 API Key';
            }
        }
    }

    // ===============================
    // 缓存 DOM 元素
    // ===============================
    function cacheElements() {
        elements.apiKeyName = document.getElementById('apiKeyName');
        elements.tokenLimit = document.getElementById('tokenLimit');
        elements.expiresAtDays = document.getElementById('expiresAtDays');
        elements.loading = document.getElementById('loading');
        elements.apiKeyList = document.getElementById('apiKeyList');
        elements.apiKeyTableBody = document.getElementById('apiKeyTableBody');
        elements.clientApiKey = document.getElementById('clientApiKey');
        elements.tokenUsageResult = document.getElementById('tokenUsageResult');
        elements.apiKeyListSubtext = document.getElementById('apiKeyListSubtext');
        elements.usageKeyName = document.getElementById('usageKeyName');
        elements.usageTotal = document.getElementById('usageTotal');
        elements.usageUsed = document.getElementById('usageUsed');
        elements.usageRemaining = document.getElementById('usageRemaining');
    }

    // ===============================
    // 根据用户角色初始化 UI
    // ===============================
    function initUIBasedOnRole() {
        if (currentUserRole === 'USER') {
            const createApiKeyCard = document.getElementById('createApiKeyCard');
            if (createApiKeyCard) {
                const cardTitle = createApiKeyCard.querySelector('.card-title');
                if (cardTitle) {
                    cardTitle.textContent = '创建我的 API Key';
                }
            }

            if (elements.apiKeyListSubtext) {
                elements.apiKeyListSubtext.textContent = '(仅显示您的 API Key)';
            }
        }
    }

    // ===============================
    // 事件监听器
    // ===============================
    function initEventListeners() {
        // 退出登录按钮（已在 initUserInfo 中通过 onclick 绑定）
    }

    // ===============================
    // 加载 API Keys
    // ===============================
    async function loadApiKeys() {
        try {
            elements.loading?.classList.remove('d-none');
            elements.apiKeyList?.classList.add('d-none');

            const data = await API.get('/admin/apikeys');
            apiKeys = Array.isArray(data) ? data : [];

            renderApiKeyTable();
            elements.apiKeyList?.classList.remove('d-none');

        } catch (error) {
            console.error('加载 API Keys 失败:', error);
            if (error.status === 401 || error.status === 403) {
                UI.showErrorMessage('请先登录');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }
            UI.showErrorMessage('加载失败：' + error.message);
        } finally {
            elements.loading?.classList.add('d-none');
        }
    }

    // ===============================
    // 渲染 API Key 表格
    // ===============================
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

        const renderActions = (key) => {
            if (currentUserRole === 'USER') {
                return `
                    <button class="btn btn-sm btn-info" onclick="copyApiKey('${escapeHtml(key.key)}')">
                        复制 Key
                    </button>
                `;
            } else {
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

    // ===============================
    // 创建 API Key
    // ===============================
    async function createApiKey() {
        const name = elements.apiKeyName?.value.trim();
        const tokenLimit = elements.tokenLimit?.value;
        const expiresAtDays = elements.expiresAtDays?.value;

        const nameError = FormValidation.required(name, '名称');
        if (nameError) {
            UI.showErrorMessage(nameError);
            return;
        }

        try {
            await API.post('/admin/apikeys', {
                name,
                tokenLimit: tokenLimit ? parseInt(tokenLimit) : null,
                expiresAtDays: expiresAtDays ? parseInt(expiresAtDays) : null
            });

            UI.showSuccessMessage('创建成功！');

            if (elements.apiKeyName) elements.apiKeyName.value = '';
            if (elements.tokenLimit) elements.tokenLimit.value = '';
            if (elements.expiresAtDays) elements.expiresAtDays.value = '';

            await loadApiKeys();

        } catch (error) {
            console.error('创建 API Key 失败:', error);
            if (error.status === 401 || error.status === 403) {
                UI.showErrorMessage('请先登录');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }
            UI.showErrorMessage('创建失败：' + error.message);
        }
    }

    // ===============================
    // 删除 API Key
    // ===============================
    async function deleteApiKey(id) {
        if (!confirm('确定要删除这个 API Key 吗？此操作不可恢复。')) {
            return;
        }

        try {
            await API.delete(`/admin/apikeys/${id}`);
            UI.showSuccessMessage('删除成功');
            await loadApiKeys();

        } catch (error) {
            console.error('删除 API Key 失败:', error);
            UI.showErrorMessage('删除失败：' + error.message);
        }
    }

    // ===============================
    // 启用/禁用 API Key
    // ===============================
    async function toggleApiKey(id) {
        try {
            const data = await API.put(`/admin/apikeys/${id}/toggle`);

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

    // ===============================
    // 复制 API Key
    // ===============================
    function copyApiKey(key) {
        UI.copyToClipboard(key);
    }

    // ===============================
    // 切换标签页
    // ===============================
    function switchTab(tabId) {
        UI.switchTab(tabId);

        if (tabId === 'usage') {
            loadStats();
        }
    }

    // ===============================
    // 加载统计
    // ===============================
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

    // ===============================
    // 查询 Token 余量
    // ===============================
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

            if (elements.usageKeyName) elements.usageKeyName.textContent = data.apiKeyName || '-';
            if (elements.usageTotal) elements.usageTotal.textContent = UI.formatNumber(data.totalTokens);
            if (elements.usageUsed) elements.usageUsed.textContent = UI.formatNumber(data.usedTokens || 0);
            if (elements.usageRemaining) elements.usageRemaining.textContent = UI.formatNumber(data.remainingTokens);

            if (elements.tokenUsageResult) {
                elements.tokenUsageResult.classList.remove('d-none');
                elements.tokenUsageResult.style.display = 'block';
            }

        } catch (error) {
            console.error('查询 Token 余量失败:', error);
            UI.showErrorMessage('查询失败：' + error.message);
        }
    }

    // ===============================
    // 退出登录
    // ===============================
    function logout() {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    // ===============================
    // HTML 转义
    // ===============================
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===============================
    // 导出全局函数
    // ===============================
    window.createApiKey = createApiKey;
    window.deleteApiKey = deleteApiKey;
    window.toggleApiKey = toggleApiKey;
    window.copyApiKey = copyApiKey;
    window.switchTab = switchTab;
    window.checkTokenUsage = checkTokenUsage;
    window.logout = logout;
})();
