/**
 * LLM Gateway - Logs Page
 * Session/Cookie authentication mode
 */
(function() {
    'use strict';

    let currentPage = 0;
    let currentPageSize = 20;
    let currentUserRole = '';
    let isAdmin = false;

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

        currentUserRole = user.role || '';
        isAdmin = currentUserRole === 'ADMIN';
        initSidebarUserInfo(user);
        initFilters(user);
        bindEvents();
        await loadApiKeyDropdown();
        await loadLogs(0);
    });

    function initSidebarUserInfo(user) {
        const usernameEl = document.getElementById('sidebarUsername');
        const avatarEl = document.getElementById('sidebarUserAvatar');

        if (usernameEl) {
            usernameEl.textContent = user.username || '-';
        }
        if (avatarEl) {
            avatarEl.textContent = (user.username || 'U').substring(0, 1).toUpperCase();
        }
    }

    function initFilters(user) {
        const userIdInput = document.getElementById('filterUserId');
        if (!isAdmin && userIdInput && user && user.id) {
            userIdInput.value = String(user.id);
        }
    }

    function bindEvents() {
        document.getElementById('searchLogsBtn')?.addEventListener('click', function() {
            loadLogs(0);
        });
        document.getElementById('refreshLogsBtn')?.addEventListener('click', function() {
            loadLogs(currentPage);
        });
        document.getElementById('resetLogsBtn')?.addEventListener('click', resetFilters);
        document.getElementById('closeLogDetailBtn')?.addEventListener('click', closeModal);
        document.getElementById('confirmCloseLogDetailBtn')?.addEventListener('click', closeModal);

        ['filterApiKey', 'filterStatus', 'filterPageSize', 'filterStartDate', 'filterEndDate'].forEach(function(id) {
            document.getElementById(id)?.addEventListener('change', function() {
                loadLogs(0);
            });
        });

        document.getElementById('filterUserId')?.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                loadLogs(0);
            }
        });

        const modal = document.getElementById('logDetailModal');
        if (modal) {
            modal.addEventListener('click', function(event) {
                if (event.target === modal) {
                    closeModal();
                }
            });
        }
    }

    async function loadApiKeyDropdown() {
        const select = document.getElementById('filterApiKey');
        if (!select) return;

        try {
            const endpoint = '/apikeys';
            const keys = await API.get(endpoint) || [];

            let options = '<option value="">全部 API Keys</option>';
            keys.forEach(function(key) {
                options += '<option value="' + key.id + '">' + escapeHtml(key.name || ('Key #' + key.id)) + '</option>';
            });
            select.innerHTML = options;
        } catch (error) {
            console.error('加载 API Key 列表失败:', error);
            UI.showErrorMessage('加载 API Key 列表失败: ' + error.message);
        }
    }

    async function loadLogs(page) {
        currentPage = page || 0;
        currentPageSize = Number(document.getElementById('filterPageSize')?.value || 20);

        const loading = document.getElementById('logsLoading');
        const container = document.getElementById('logsContainer');
        if (loading) loading.classList.remove('d-none');
        if (container) container.classList.add('d-none');

        try {
            const endpoint = isAdmin ? '/admin/logs' : '/user/logs';
            const data = await API.get(endpoint + '?' + buildQueryParams(currentPage).toString());
            const logs = data?.content || [];

            renderLogsTable(logs);
            renderMeta(data, logs);
            renderSummary(data, logs);
            renderPagination(data?.number || 0, data?.totalPages || 0, data?.totalElements || 0);

            if (container) container.classList.remove('d-none');
        } catch (error) {
            console.error('加载日志失败:', error);
            UI.showErrorMessage('加载日志失败: ' + error.message);
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function buildQueryParams(page) {
        const params = new URLSearchParams();
        const apiKeyId = document.getElementById('filterApiKey')?.value || '';
        const status = document.getElementById('filterStatus')?.value || '';
        const startDate = document.getElementById('filterStartDate')?.value || '';
        const endDate = document.getElementById('filterEndDate')?.value || '';
        const userId = document.getElementById('filterUserId')?.value || '';

        params.set('page', String(page));
        params.set('size', String(currentPageSize));
        if (isAdmin && userId) params.set('userId', userId);
        if (apiKeyId) params.set('apiKeyId', apiKeyId);
        if (status) params.set('status', status);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        return params;
    }

    function renderLogsTable(logs) {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="' + getColumnCount() + '" class="table-empty">当前条件下没有日志</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(function(log) {
            const inputTokens = numberOrZero(log.inputTokens);
            const outputTokens = numberOrZero(log.outputTokens);
            const totalTokens = inputTokens + outputTokens;
            const cells = [];

            cells.push('<td>' + formatDateTime(log.createdAt) + '</td>');
            cells.push('<td><span class="request-id" title="' + escapeHtml(log.requestId || '-') + '">' + escapeHtml(shortRequestId(log.requestId)) + '</span></td>');
            if (isAdmin) {
                cells.push('<td>' + escapeHtml(stringValue(log.userId)) + '</td>');
            }
            cells.push('<td>' + escapeHtml(log.apiKeyName || '-') + '</td>');
            cells.push('<td>' + escapeHtml(log.modelName || '-') + '</td>');
            cells.push('<td class="text-right">' + UI.formatNumber(inputTokens) + '</td>');
            cells.push('<td class="text-right">' + UI.formatNumber(outputTokens) + '</td>');
            cells.push('<td class="text-right">' + UI.formatNumber(totalTokens) + '</td>');
            cells.push('<td class="text-right">' + formatLatency(log.latencyMs) + '</td>');
            cells.push('<td class="text-center">' + renderStatusBadge(log.status) + '</td>');
            cells.push('<td><button class="btn btn-sm btn-primary" onclick="viewLogDetails(' + log.id + ')">详情</button></td>');

            return '<tr>' + cells.join('') + '</tr>';
        }).join('');
    }

    function renderMeta(pageData, logs) {
        const meta = document.getElementById('logsMeta');
        if (!meta) return;

        const current = pageData?.numberOfElements ?? logs.length;
        const total = pageData?.totalElements ?? logs.length;
        meta.textContent = '当前显示 ' + current + ' 条，共匹配 ' + total + ' 条';
    }

    function renderSummary(pageData, logs) {
        const totals = logs.reduce(function(accumulator, log) {
            accumulator.success += log.status === 'SUCCESS' ? 1 : 0;
            accumulator.tokens += numberOrZero(log.inputTokens) + numberOrZero(log.outputTokens);
            accumulator.latency += numberOrZero(log.latencyMs);
            return accumulator;
        }, { success: 0, tokens: 0, latency: 0 });

        const avgLatency = logs.length ? Math.round(totals.latency / logs.length) : 0;

        setText('statTotalRequests', UI.formatNumber(pageData?.totalElements || 0));
        setText('statSuccessRequests', UI.formatNumber(totals.success));
        setText('statTotalTokens', UI.formatNumber(totals.tokens));
        setText('statAvgLatency', formatLatency(avgLatency));
    }

    function renderPagination(page, totalPages, totalElements) {
        const container = document.getElementById('logsPagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '<span class="page-info">共 ' + totalElements + ' 条</span>';
            return;
        }

        const startPage = Math.max(0, page - 2);
        const endPage = Math.min(totalPages, startPage + 5);
        let html = '';

        html += '<button class="btn btn-sm btn-secondary" ' +
            (page === 0 ? 'disabled' : '') +
            ' onclick="goPage(' + (page - 1) + ')">上一页</button>';

        for (let index = startPage; index < endPage; index += 1) {
            html += '<button class="btn btn-sm ' + (index === page ? 'btn-primary active' : 'btn-secondary') +
                '" onclick="goPage(' + index + ')">' + (index + 1) + '</button>';
        }

        html += '<button class="btn btn-sm btn-secondary" ' +
            (page >= totalPages - 1 ? 'disabled' : '') +
            ' onclick="goPage(' + (page + 1) + ')">下一页</button>';
        html += '<span class="page-info">第 ' + (page + 1) + ' / ' + totalPages + ' 页，共 ' + totalElements + ' 条</span>';

        container.innerHTML = html;
    }

    async function viewLogDetails(id) {
        try {
            const endpoint = isAdmin ? '/admin/logs/' + id : '/user/logs/' + id;
            const log = await API.get(endpoint);
            fillLogDetails(log);
            document.getElementById('logDetailModal')?.classList.add('show');
        } catch (error) {
            console.error('加载日志详情失败:', error);
            UI.showErrorMessage('加载日志详情失败: ' + error.message);
        }
    }

    function fillLogDetails(log) {
        const inputTokens = numberOrZero(log.inputTokens);
        const outputTokens = numberOrZero(log.outputTokens);

        setText('detailTime', formatDateTime(log.createdAt));
        setText('detailRequestId', stringValue(log.requestId));
        if (isAdmin) {
            setText('detailUserId', stringValue(log.userId));
        }
        setText('detailApiKey', stringValue(log.apiKeyName));
        setText('detailModel', stringValue(log.modelName));
        setText('detailInput', UI.formatNumber(inputTokens));
        setText('detailOutput', UI.formatNumber(outputTokens));
        setText('detailTotal', UI.formatNumber(inputTokens + outputTokens));
        setText('detailLatency', formatLatency(log.latencyMs));
        setText('detailCost', formatCost(log.costAmount));

        const statusEl = document.getElementById('detailStatus');
        if (statusEl) {
            statusEl.innerHTML = renderStatusBadge(log.status);
        }
    }

    function closeModal() {
        document.getElementById('logDetailModal')?.classList.remove('show');
    }

    function resetFilters() {
        setValue('filterApiKey', '');
        setValue('filterStatus', '');
        setValue('filterStartDate', '');
        setValue('filterEndDate', '');
        setValue('filterPageSize', '20');
        if (isAdmin) {
            setValue('filterUserId', '');
        }
        currentPageSize = 20;
        loadLogs(0);
    }

    function getColumnCount() {
        return isAdmin ? 11 : 10;
    }

    function formatDateTime(timestamp) {
        if (!timestamp) return '-';

        const normalized = String(timestamp).includes('T')
            ? String(timestamp)
            : String(timestamp).replace(' ', 'T');
        const date = new Date(normalized);

        if (Number.isNaN(date.getTime())) {
            return String(timestamp).replace('T', ' ');
        }

        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    function formatLatency(latencyMs) {
        return numberOrZero(latencyMs) + ' ms';
    }

    function formatCost(costAmount) {
        if (costAmount === null || costAmount === undefined || costAmount === '') {
            return '-';
        }
        return String(costAmount);
    }

    function renderStatusBadge(status) {
        if (status === 'SUCCESS') {
            return '<span class="badge badge-success">成功</span>';
        }
        if (status === 'FAIL') {
            return '<span class="badge badge-danger">失败</span>';
        }
        return '<span class="badge badge-default">' + escapeHtml(stringValue(status)) + '</span>';
    }

    function shortRequestId(requestId) {
        if (!requestId) return '-';
        return requestId.length > 12 ? requestId.substring(0, 12) + '...' : requestId;
    }

    function numberOrZero(value) {
        return Number(value || 0);
    }

    function stringValue(value) {
        if (value === null || value === undefined || value === '') {
            return '-';
        }
        return String(value);
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    window.goPage = function(page) {
        loadLogs(page);
    };

    window.viewLogDetails = viewLogDetails;

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(function() {
                window.location.href = '/login';
            })
            .catch(function() {
                window.location.href = '/login';
            });
    };
})();
