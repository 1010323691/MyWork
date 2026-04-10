/**
 * LLM Gateway - Logs Page
 * Session/Cookie 认证模式
 */
(function() {
    'use strict';

    let currentPage = 0;
    let currentUserRole = '';
    let selectedApiKey = '';

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        const user = await API.getCurrentUser();
        if (!user) {
            window.location.href = '/login';
            return;
        }

        currentUserRole = user.role; // 'USER' 或 'ADMIN'
        initSidebarUserInfo(user);
        await loadApiKeyDropdown();
        loadLogs(0);
    });

    function initSidebarUserInfo(user) {
        const usernameEl = document.getElementById('sidebarUsername');
        const avatarEl = document.getElementById('sidebarUserAvatar');
        if (user && usernameEl) {
            usernameEl.textContent = user.username;
        }
        if (user && avatarEl) {
            avatarEl.textContent = user.username.substring(0, 1).toUpperCase();
        }
    }

    /**
     * 加载 API Keys 到筛选下拉框
     * - 用户：只能看到自己的 keys
     * - 管理员：可以看到所有 keys
     */
    async function loadApiKeyDropdown() {
        const select = document.getElementById('filterApiKey');
        if (!select) return;

        try {
            let keys = [];

            // 根据角色选择端点
            const endpoint = currentUserRole === 'ADMIN' ? '/api/admin/apikeys' : '/api/user/apikeys';

            try {
                const response = await fetch(endpoint, {
                    credentials: 'same-origin'
                });
                if (response.ok) {
                    keys = await response.json();
                }
            } catch (e) {
                console.error('加载 API Keys 失败:', e);
            }

            // 构建选项
            let options = '<option value="">全部 API Keys</option>';
            keys.forEach(function(key) {
                options += '<option value="' + key.id + '">' + escapeHtml(key.name) + '</option>';
            });
            select.innerHTML = options;

            // 如果有多个 key，显示下拉框；否则隐藏
            select.style.display = keys.length > 1 ? 'inline-block' : 'none';
        } catch (e) {
            console.error('加载 API Keys 失败:', e);
            select.style.display = 'none';
        }
    }

    /**
     * 加载日志列表（支持分页 + 筛选）
     */
    async function loadLogs(page) {
        currentPage = page || 0;
        selectedApiKey = document.getElementById('filterApiKey').value || '';
        const status = document.getElementById('filterStatus').value || '';

        const loading = document.getElementById('logsLoading');
        const container = document.getElementById('logsContainer');
        if (loading) loading.classList.remove('d-none');
        if (container) container.classList.add('d-none');

        // 构建查询参数
        let params = 'page=' + page + '&size=20';
        if (selectedApiKey) params += '&apiKeyId=' + selectedApiKey;
        if (status) params += '&status=' + status;

        // 根据角色选择端点
        const endpoint = currentUserRole === 'ADMIN'
            ? '/api/admin/logs'
            : '/api/user/logs';

        try {
            const response = await fetch(endpoint + '?' + params, {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();
            renderLogsTable(data.content || []);
            renderPagination(data.number || 0, data.totalPages || 0, data.totalElements || 0);

            if (container) container.classList.remove('d-none');
        } catch (e) {
            console.error('加载日志失败:', e);
            UI.showErrorMessage('加载日志失败：' + e.message);
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    /**
     * 渲染日志表格
     */
    function renderLogsTable(logs) {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;padding:40px;">暂无日志</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(function(log) {
            const statusBadge = log.status === 'SUCCESS'
                ? '<span class="badge-success">成功</span>'
                : '<span class="badge-danger">失败</span>';

            const totalTokens = (log.inputTokens || 0) + (log.outputTokens || 0);
            const tokenDisplay = (log.inputTokens || 0) + ' / ' + (log.outputTokens || 0) + ' (' + UI.formatNumber(totalTokens) + ')';

            return '<tr>' +
                '<td>' + formatDate(log.createdAt) + '</td>' +
                '<td>' + escapeHtml(log.apiKeyName || '-') + '</td>' +
                '<td>' + escapeHtml(log.modelName || '-') + '</td>' +
                '<td>' + tokenDisplay + '</td>' +
                '<td>' + (log.latencyMs || 0) + 'ms</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm btn-primary" onclick="viewLogDetails(' + log.id + ')">详情</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    /**
     * 渲染分页
     */
    function renderPagination(page, total, totalElements) {
        const el = document.getElementById('logsPagination');
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

    /**
     * 查看详情
     */
    async function viewLogDetails(id) {
        const endpoint = currentUserRole === 'ADMIN'
            ? '/api/admin/logs/' + id
            : '/api/user/logs/' + id;

        try {
            const response = await fetch(endpoint, {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const log = await response.json();
            fillLogDetails(log);
            document.getElementById('logDetailModal').style.display = 'flex';
        } catch (e) {
            console.error('加载详情失败:', e);
            UI.showErrorMessage('加载详情失败：' + e.message);
        }
    }

    /**
     * 填充详情模态框
     */
    function fillLogDetails(log) {
        document.getElementById('detailTime').textContent = formatDate(log.createdAt);
        document.getElementById('detailApiKey').textContent = log.apiKeyName || '-';
        document.getElementById('detailModel').textContent = log.modelName || '-';
        document.getElementById('detailInput').textContent = UI.formatNumber(log.inputTokens || 0);
        document.getElementById('detailOutput').textContent = UI.formatNumber(log.outputTokens || 0);

        const totalTokens = (log.inputTokens || 0) + (log.outputTokens || 0);
        document.getElementById('detailTotal').textContent = UI.formatNumber(totalTokens);
        document.getElementById('detailLatency').textContent = (log.latencyMs || 0) + 'ms';

        const statusEl = document.getElementById('detailStatus');
        if (log.status === 'SUCCESS') {
            statusEl.innerHTML = '<span class="badge-success">成功</span>';
        } else {
            statusEl.innerHTML = '<span class="badge-danger">失败</span>';
        }
    }

    /**
     * 格式化日期
     */
    function formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
    }

    /**
     * HTML 转义
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * 关闭模态框
     */
    window.closeModal = function() {
        document.getElementById('logDetailModal').style.display = 'none';
    };

    /**
     * 分页跳转
     */
    window.goPage = function(page) {
        loadLogs(page);
    };

    /**
     * 搜索（触发重新加载）
     */
    window.loadLogs = function() {
        loadLogs(0);
    };

    /**
     * 退出登录
     */
    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(function() { window.location.href = '/login'; })
            .catch(function() { window.location.href = '/login'; });
    };

    // 关闭模态框（点击遮罩层）
    const modal = document.getElementById('logDetailModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }
})();
