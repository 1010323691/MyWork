/**
 * LLM Gateway - 请求日志页面
 * Session/Cookie 认证模式
 */
(function() {
    'use strict';

    let currentPage = 0;
    let totalPages = 0;
    let totalElements = 0;

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        await initSidebarUserInfo();
        loadLogs(0);
    });

    async function initSidebarUserInfo() {
        const user = await API.getCurrentUser();
        const usernameEl = document.getElementById('sidebarUsername');
        const avatarEl = document.getElementById('sidebarUserAvatar');
        if (user && usernameEl) {
            usernameEl.textContent = user.username;
        }
        if (user && avatarEl) {
            avatarEl.textContent = user.username.substring(0, 1).toUpperCase();
        }
    }

    async function loadLogs(page) {
        const loading = document.getElementById('logsLoading');
        const container = document.getElementById('logsContainer');
        if (loading) loading.classList.remove('d-none');
        if (container) container.classList.add('d-none');

        const params = buildParams(page);

        try {
            const data = await API.get('/user/logs?' + params);
            currentPage = data.number || 0;
            totalPages = data.totalPages || 0;
            totalElements = data.totalElements || 0;
            renderTable(data.content || []);
            renderPagination();
            if (container) container.classList.remove('d-none');
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

        const keyword = document.getElementById('filterKeyword');
        const status = document.getElementById('filterStatus');

        if (keyword && keyword.value.trim()) {
            p.set('keyword', keyword.value.trim());
        }
        if (status && status.value) {
            p.set('status', status.value === 'success' ? 'SUCCESS' : 'FAIL');
        }

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
                '<td>' + UI.formatNumber(log.inputTokens + (log.outputTokens || 0)) + '</td>' +
                '<td>' + (log.latencyMs || 0) + 'ms</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td><button class="btn btn-sm btn-primary" onclick="viewLogDetails(' + log.id + ')">详情</button></td>' +
                '</tr>';
        }).join('');
    }

    function renderPagination() {
        const el = document.getElementById('logsPagination');
        if (!el) return;

        if (totalPages <= 1) {
            el.innerHTML = '<span class="page-info">共 ' + totalElements + ' 条</span>';
            return;
        }

        el.innerHTML =
            '<button ' + (currentPage === 0 ? 'disabled' : '') + ' onclick="goPage(' + (currentPage - 1) + ')">上一页</button>' +
            '<span class="page-info">第 ' + (currentPage + 1) + ' / ' + totalPages + ' 页，共 ' + totalElements + ' 条</span>' +
            '<button ' + (currentPage >= totalPages - 1 ? 'disabled' : '') + ' onclick="goPage(' + (currentPage + 1) + ')">下一页</button>';
    }

    function formatDateTime(isoStr) {
        if (!isoStr) return '-';
        const d = new Date(isoStr);
        return d.toLocaleString('zh-CN', { hour12: false });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    window.loadLogs = function() { loadLogs(0); };
    window.goPage = function(page) { loadLogs(page); };
    window.viewLogDetails = async function(id) {
        try {
            const log = await API.get('/user/logs/' + id);
            const modal = document.getElementById('logDetailModal');
            if (!modal) {
                UI.showErrorMessage('未找到详情模态框');
                return;
            }
            document.getElementById('detailTime').textContent = formatDateTime(log.createdAt);
            document.getElementById('detailApiKey').textContent = log.apiKeyName || '-';
            document.getElementById('detailModel').textContent = log.modelName || '-';
            document.getElementById('detailInput').textContent = UI.formatNumber(log.inputTokens || 0);
            document.getElementById('detailOutput').textContent = UI.formatNumber(log.outputTokens || 0);
            document.getElementById('detailTotal').textContent = UI.formatNumber((log.inputTokens || 0) + (log.outputTokens || 0));
            document.getElementById('detailLatency').textContent = (log.latencyMs || 0) + 'ms';
            document.getElementById('detailStatus').textContent = log.status === 'SUCCESS' ? '成功' : '失败';
            modal.style.display = 'flex';
        } catch (e) {
            UI.showErrorMessage('加载详情失败：' + e.message);
        }
    };
    window.closeModal = function() {
        document.getElementById('logDetailModal').style.display = 'none';
    };
    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => window.location.href = '/login')
            .catch(() => window.location.href = '/login');
    };

    // Close modal on overlay click
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('logDetailModal');
        if (modal && e.target === modal) {
            closeModal();
        }
    });
})();
