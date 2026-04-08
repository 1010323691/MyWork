/**
 * LLM Gateway - Dashboard Page JavaScript
 * Session/Cookie 认证模式
 */

(function() {
    'use strict';

    // ===============================
    // 全局状态
    // ===============================
    let apiKeys = [];
    let currentUser = null;
    let currentUserRole = 'USER';
    let chartInstance = null;
    const elements = {};

    // ===============================
    // 初始化
    // ===============================
    document.addEventListener('DOMContentLoaded', async function() {
        // 检查认证状态（Session 验证）
        if (!await checkAuthentication()) {
            window.location.href = '/login';
            return;
        }

        // 初始化用户信息（从 /api/auth/me 获取）
        await initUserInfo();

        cacheElements();
        initUIBasedOnRole();
        initEventListeners();
        loadApiKeys();
        loadUsageStats();
    });

    // ===============================
    // 检查认证状态（Session 验证）
    // ===============================
    async function checkAuthentication() {
        const user = await API.getCurrentUser();
        if (!user) {
            return false;
        }
        currentUser = user;
        currentUserRole = (user.role || 'USER').toUpperCase();
        return true;
    }

    // ===============================
    // 初始化用户信息显示
    // ===============================
    async function initUserInfo() {
        const usernameEl = document.getElementById('sidebarUsername');
        const avatarEl = document.getElementById('sidebarUserAvatar');

        // 用户信息从 /api/auth/me 获取
        if (currentUser && currentUser.username && usernameEl) {
            usernameEl.textContent = currentUser.username;
        }
        if (currentUser && currentUser.username && avatarEl) {
            avatarEl.textContent = currentUser.username.substring(0, 1).toUpperCase();
        }
    }

    // ===============================
    // 缓存 DOM 元素
    // ===============================
    function cacheElements() {
        elements.apiKeyName = document.getElementById('apiKeyName');
        elements.tokenLimit = document.getElementById('tokenLimit');
        elements.expiresAtDays = document.getElementById('expiresAtDays');
        elements.apiKeyTableBody = document.getElementById('apiKeyTableBody');
        elements.apiKeyLoading = document.getElementById('apiKeyLoading');
        elements.apiKeyListContainer = document.getElementById('apiKeyListContainer');
        elements.apiKeyListSubtext = document.getElementById('apiKeyListSubtext');
        elements.createApiKeyCard = document.getElementById('createApiKeyCard');
    }

    // ===============================
    // 初始化 UI（基于角色）
    // ===============================
    function initUIBasedOnRole() {
        if (currentUserRole === 'ADMIN') {
            if (elements.apiKeyListSubtext) {
                elements.apiKeyListSubtext.textContent = '(管理员可见所有 API Key)';
            }
        } else {
            if (elements.createApiKeyCard) {
                elements.createApiKeyCard.style.display = 'none';
            }
            if (elements.apiKeyListSubtext) {
                elements.apiKeyListSubtext.textContent = '(仅显示自己的 API Key)';
            }
        }
    }

    // ===============================
    // 初始化事件监听
    // ===============================
    function initEventListeners() {
        const createBtn = elements.createApiKeyCard?.querySelector('button[type="button"]');
        if (createBtn) {
            createBtn.addEventListener('click', createApiKey);
        }

        // Enter 键提交
        if (elements.apiKeyName) {
            elements.apiKeyName.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') createApiKey();
            });
        }
    }

    // ===============================
    // 加载 API Keys
    // ===============================
    async function loadApiKeys() {
        if (elements.apiKeyLoading) elements.apiKeyLoading.classList.remove('d-none');
        if (elements.apiKeyListContainer) elements.apiKeyListContainer.classList.add('d-none');

        try {
            const endpoint = '/admin/apikeys';
            const keys = await API.get(endpoint);
            apiKeys = Array.isArray(keys) ? keys : (keys.content || []);
            renderApiKeys();
            if (elements.apiKeyListContainer) elements.apiKeyListContainer.classList.remove('d-none');
        } catch (e) {
            console.error('加载 API Keys 失败', e);
            UI.showErrorMessage('加载失败：' + e.message);
        } finally {
            if (elements.apiKeyLoading) elements.apiKeyLoading.classList.add('d-none');
        }
    }

    // ===============================
    // 渲染 API Keys 表格
    // ===============================
    function renderApiKeys() {
        if (!elements.apiKeyTableBody) return;

        if (apiKeys.length === 0) {
            elements.apiKeyTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;padding:40px;">暂无 API Key</td></tr>';
            return;
        }

        elements.apiKeyTableBody.innerHTML = apiKeys.map(function(k) {
            const statusBadge = k.enabled
                ? '<span class="badge-success">启用</span>'
                : '<span class="badge-danger">禁用</span>';
            const expiresText = k.expiresAt ? formatDate(k.expiresAt) : '永不过期';
            const quotaText = k.tokenLimit != null ? UI.formatNumber(k.tokenLimit) : '无限';

            return '<tr>' +
                '<td>' + escapeHtml(k.name) + '</td>' +
                '<td title="' + escapeHtml(k.key || '') + '">' + maskKey(k.key) + '</td>' +
                '<td>' + quotaText + '</td>' +
                '<td>' + UI.formatNumber(k.usedTokens || 0) + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + expiresText + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm btn-primary" onclick="copyApiKey(\'' + escapeAttr(k.key) + '\')">复制</button>' +
                    (currentUserRole === 'USER' ? '<button class="btn btn-sm btn-danger" style="margin-left:6px;" onclick="deleteApiKey(' + k.id + ')">删除</button>' : '') +
                '</td>' +
                '</tr>';
        }).join('');
    }

    // ===============================
    // 创建 API Key
    // ===============================
    async function createApiKey() {
        const name = elements.apiKeyName ? elements.apiKeyName.value.trim() : '';
        const tokenLimit = elements.tokenLimit ? elements.tokenLimit.value : '';
        const expiresAtDays = elements.expiresAtDays ? elements.expiresAtDays.value : '';

        if (!name) {
            UI.showErrorMessage('请输入 API Key 名称');
            if (elements.apiKeyName) elements.apiKeyName.focus();
            return;
        }

        const payload = {
            name: name
        };

        if (tokenLimit !== '' && parseInt(tokenLimit) > 0) {
            payload.tokenLimit = parseInt(tokenLimit);
        }

        if (expiresAtDays !== '' && parseInt(expiresAtDays) > 0) {
            payload.expiresAtDays = parseInt(expiresAtDays);
        }

        try {
            const res = await API.post('/admin/apikeys', payload);
            UI.showSuccessMessage('创建成功！Key: ' + res.key);
            if (elements.apiKeyName) elements.apiKeyName.value = '';
            if (elements.tokenLimit) elements.tokenLimit.value = '';
            if (elements.expiresAtDays) elements.expiresAtDays.value = '';
            loadApiKeys();
        } catch (e) {
            UI.showErrorMessage('创建失败：' + e.message);
        }
    }

    // ===============================
    // 删除 API Key
    // ===============================
    async function deleteApiKey(id) {
        if (!confirm('确定要删除该 API Key 吗？此操作不可恢复。')) return;

        try {
            await API.delete('/admin/apikeys/' + id);
            UI.showSuccessMessage('删除成功');
            loadApiKeys();
        } catch (e) {
            UI.showErrorMessage('删除失败：' + e.message);
        }
    }

    // ===============================
    // 复制 API Key
    // ===============================
    function copyApiKey(key) {
        if (!key) {
            UI.showErrorMessage('Key 为空');
            return;
        }
        navigator.clipboard.writeText(key)
            .then(function() {
                UI.showSuccessMessage('已复制到剪贴板');
            })
            .catch(function() {
                UI.showErrorMessage('复制失败，请手动复制');
            });
    }

    // ===============================
    // 加载使用统计
    // ===============================
    async function loadUsageStats() {
        try {
            const stats = await API.get('/user/stats');
            const today = stats.todayTokens || 0;
            const month = stats.monthTokens || 0;
            const totalRequests = stats.totalRequests || 0;
            const successRate = stats.successRate || 0;
            const totalApiKeys = stats.totalApiKeys || 0;
            const activeApiKeys = stats.activeApiKeys || 0;

            const todayEl = document.getElementById('todayTokens');
            const monthEl = document.getElementById('monthTokens');
            const totalReqEl = document.getElementById('totalRequests');
            const successRateEl = document.getElementById('successRate');
            const totalKeysEl = document.getElementById('totalApiKeys');
            const activeKeysEl = document.getElementById('activeApiKeys');

            if (todayEl) todayEl.textContent = UI.formatNumber(today);
            if (monthEl) monthEl.textContent = UI.formatNumber(month);
            if (totalReqEl) totalReqEl.textContent = UI.formatNumber(totalRequests);
            if (successRateEl) successRateEl.textContent = successRate.toFixed(1) + '%';
            if (totalKeysEl) totalKeysEl.textContent = totalApiKeys;
            if (activeKeysEl) activeKeysEl.textContent = activeApiKeys;

            initChart(stats);
        } catch (e) {
            console.error('加载统计失败', e);
        }
    }

    // ===============================
    // 初始化图表
    // ===============================
    function initChart(stats) {
        const chartDom = document.getElementById('tokenTrendChart');
        if (!chartDom) return;
        chartInstance = echarts.init(chartDom);

        const days = ['前 7 天', '前 6 天', '前 5 天', '前 4 天', '前 3 天', '前 2 天', '今天'];
        const values = stats.tokenTrend || [0, 0, 0, 0, 0, 0, 0];

        const option = {
            title: { text: '近 7 日 Token 趋势', left: 'center' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: days },
            yAxis: { type: 'value', name: 'Token' },
            series: [{
                name: 'Token 消耗',
                type: 'line',
                data: values,
                smooth: true,
                itemStyle: { color: '#1890ff' }
            }]
        };

        chartInstance.setOption(option);
    }

    // ===============================
    // 切换标签页
    // ===============================
    window.switchTab = function(tabId) {
        const tabs = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(function(t) {
            t.classList.remove('active');
        });
        contents.forEach(function(c) {
            c.classList.remove('active');
        });

        const activeTab = document.querySelector('.tab[onclick*="' + tabId + '"]');
        const activeContent = document.getElementById(tabId);

        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    };

    // ===============================
    // 客户端工具：查询 Token 余量
    // ===============================
    window.checkTokenUsage = async function() {
        const apiKey = document.getElementById('clientApiKey')?.value.trim() || '';
        if (!apiKey) {
            UI.showErrorMessage('请输入 API Key');
            return;
        }

        try {
            const data = await API.get('/clients/token-usage', { headers: { 'X-Api-Key': apiKey } });
            const resultDiv = document.getElementById('tokenUsageResult');
            const nameEl = document.getElementById('usageKeyName');
            const totalEl = document.getElementById('usageTotal');
            const usedEl = document.getElementById('usageUsed');
            const remainingEl = document.getElementById('usageRemaining');

            if (resultDiv) resultDiv.style.display = 'block';
            if (nameEl) nameEl.textContent = data.name || '-';
            if (totalEl) totalEl.textContent = data.tokenLimit != null ? UI.formatNumber(data.tokenLimit) : '无限';
            if (usedEl) usedEl.textContent = UI.formatNumber(data.usedTokens || 0);
            if (remainingEl) remainingEl.textContent = data.tokenLimit != null
                ? UI.formatNumber(data.tokenLimit - (data.usedTokens || 0))
                : '无限';
        } catch (e) {
            UI.showErrorMessage('查询失败：' + e.message);
            const resultDiv = document.getElementById('tokenUsageResult');
            if (resultDiv) resultDiv.style.display = 'none';
        }
    };

    // ===============================
    // 工具函数
    // ===============================
    function maskKey(key) {
        if (!key || key.length < 10) return key;
        return key.substring(0, 8) + '...' + key.substring(key.length - 4);
    }

    function formatDate(isoStr) {
        if (!isoStr) return '-';
        const d = new Date(isoStr);
        return d.toLocaleDateString('zh-CN');
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    window.logout = function() {
        // 访问退出端点使 Session 失效
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => window.location.href = '/login')
            .catch(() => window.location.href = '/login');
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (chartInstance) chartInstance.dispose();
    });
})();
