/**
 * LLM Gateway - 请求日志页面
 */
(function() {
    'use strict';

    let currentPage = 0;
    let totalPages = 0;

    document.addEventListener('DOMContentLoaded', function() {
        if (!API.isAuthenticated()) {
            window.location.href = '/login';
            return;
        }

        const user = API.getCurrentUser();
        const userInfo = document.getElementById('userInfo');
        if (userInfo && user) {
            userInfo.innerHTML = `
                <span class="user-name">${escapeHtml(user.username)}</span>
                <a href="#" onclick="logout()" class="logout-btn">退出登录</a>
            `;
        }

        loadApiKeyOptions();
        loadLogs(0);
    });

    async function loadApiKeyOptions() {
        try {
            const keys = await API.get('/admin/apikeys');
            const select = document.getElementById('apiKeyFilter');
            if (select && Array.isArray(keys)) {
                keys.forEach(function(k) {
                    const opt = document.createElement('option');
                    opt.value = k.id;
                    opt.textContent = k.name + ' (' + maskKey(k.key) + ')';
                    select.appendChild(opt);
                });
            }
        } catch (e) {
            console.warn('加载 API Key 列表失败', e);
        }
    }

    async function loadLogs(page) {
        const loading = document.getElementById('logsLoading');
        const content = document.getElementById('logsContent');
        if (loading) loading.classList.remove('d-none');
        if (content) content.classList.add('d-none');

        const params = buildParams(page);

        try {
            const data = await API.get('/user/logs?' + params);
            currentPage = data.number;
            totalPages = data.totalPages;
            renderTable(data.content || []);
            renderPagination(data.number, data.totalPages, data.totalElements);
            if (content) content.classList.remove('d-none');
        } catch (e) {
            console.error('加载日志失败', e);
            UI.showErrorMessage('加载日志失败：' + e.message);
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function buildParams(page) {
        const p = new URLSearchParams();
        p.set('page', page);
        p.set('size', 20);

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const apiKeyId = document.getElementById('apiKeyFilter').value;
        const status = document.getElementById('statusFilter').value;

        if (startDate) p.set('startDate', startDate);
        if (endDate) p.set('endDate', endDate);
        if (apiKeyId) p.set('apiKeyId', apiKeyId);
        if (status) p.set('status', status);

        return p.toString();
    }

    function renderTable(logs) {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;padding:40px;">暂无日志数据</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(function(log) {
            const statusBadge = log.status === 'SUCCESS'
                ? '<span class="badge-success">成功</span>'
                : '<span class="badge-danger">失败</span>';
            return '<tr>' +
                '<td>' + formatDateTime(log.createdAt) + '</td>' +
                '<td>' + escapeHtml(log.apiKeyName || '-') + '</td>' +
                '<td>' + escapeHtml(log.modelName || '-') + '</td>' +
                '<td>' + UI.formatNumber(log.inputTokens || 0) + '</td>' +
                '<td>' + UI.formatNumber(log.outputTokens || 0) + '</td>' +
                '<td>' + (log.latencyMs || 0) + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '</tr>';
        }).join('');
    }

    function renderPagination(page, total, totalElements) {
        const el = document.getElementById('pagination');
        if (!el) return;

        if (total <= 1) {
            el.innerHTML = '<span class="page-info">共 ' + totalElements + ' 条</span>';
            return;
        }

        el.innerHTML =
            '<button ' + (page === 0 ? 'disabled' : '') + ' onclick="goPage(' + (page - 1) + ')">上一页</button>' +
            '<span class="page-info">第 ' + (page + 1) + ' / ' + total + ' 页，共 ' + totalElements + ' 条</span>' +
            '<button ' + (page >= total - 1 ? 'disabled' : '') + ' onclick="goPage(' + (page + 1) + ')">下一页</button>';
    }

    function formatDateTime(isoStr) {
        if (!isoStr) return '-';
        const d = new Date(isoStr);
        return d.toLocaleString('zh-CN', { hour12: false });
    }

    function maskKey(key) {
        if (!key || key.length < 10) return key;
        return key.substring(0, 8) + '...' + key.substring(key.length - 4);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    window.queryLogs = function() { loadLogs(0); };
    window.resetFilters = function() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document.getElementById('apiKeyFilter').value = '';
        document.getElementById('statusFilter').value = '';
        loadLogs(0);
    };
    window.goPage = function(page) { loadLogs(page); };
    window.logout = function() {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };
})();
