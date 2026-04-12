/**
 * LLM Gateway - Logs Page
 * Session/Cookie authentication mode
 */
(function() {
    'use strict';

    let currentPage = 0;
    let currentPageSize = 10;
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

        ['filterApiKey', 'filterStatus', 'filterPageSize'].forEach(function(id) {
            document.getElementById(id)?.addEventListener('change', function() {
                loadLogs(0);
            });
        });

        ['filterStartDate', 'filterEndDate'].forEach(function(id) {
            document.getElementById(id)?.addEventListener('datechange', function() {
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
            const options = [{ value: '', text: '全部 API Keys' }];

            keys.forEach(function(key) {
                options.push({
                    value: String(key.id),
                    text: escapeHtml(key.name || ('Key #' + key.id))
                });
            });

            const dropdown = window.getDropdownInstance ? window.getDropdownInstance(select) : null;
            if (dropdown && typeof dropdown.setOptions === 'function') {
                dropdown.setOptions(options);
            }
        } catch (error) {
            console.error('加载 API Key 列表失败:', error);
            UI.showErrorMessage('加载 API Key 列表失败: ' + error.message);
        }
    }

    async function loadLogs(page) {
        currentPage = page || 0;
        currentPageSize = Number(getDropdownValue('filterPageSize') || 10);

        const loading = document.getElementById('logsLoading');
        const container = document.getElementById('logsContainer');
        if (loading) loading.classList.remove('d-none');
        if (container) container.classList.add('d-none');

        try {
            const endpoint = isAdmin ? '/admin/logs' : '/user/logs';
            const data = await API.get(endpoint + '?' + buildQueryParams(currentPage).toString());
            const logs = data?.content || [];
            const page = data?.page || {};

            renderLogsTable(logs);
            renderMeta(data, logs);
            const totalPages = (page.totalPages || 0) > 0 ? page.totalPages : 1;
            const totalElements = (page.totalElements || 0) > 0 ? page.totalElements : logs.length;
            renderPagination(page.number || 0, totalPages, totalElements);

            if (container) container.classList.remove('d-none');
        } catch (error) {
            console.error('加载日志失败:', error);
            UI.showErrorMessage('加载日志失败: ' + error.message);
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function getDropdownValue(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return null;

        const dropdown = window.getDropdownInstance ? window.getDropdownInstance(element) : null;
        if (dropdown && typeof dropdown.getValue === 'function') {
            return dropdown.getValue();
        }

        if (element.value !== undefined) {
            return element.value;
        }

        return null;
    }

    function setDropdownValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const dropdown = window.getDropdownInstance ? window.getDropdownInstance(element) : null;
        if (dropdown && typeof dropdown.setValue === 'function') {
            dropdown.setValue(value);
            return;
        }

        if (element.value !== undefined) {
            element.value = value;
        }
    }

    function buildQueryParams(page) {
        const params = new URLSearchParams();
        const apiKeyId = getDropdownValue('filterApiKey') || '';
        const status = getDropdownValue('filterStatus') || '';
        const startDate = normalizeDateValue(document.getElementById('filterStartDate')?.value || '');
        const endDate = normalizeDateValue(document.getElementById('filterEndDate')?.value || '');
        const userId = document.getElementById('filterUserId')?.value || '';

        validateDateRange(startDate, endDate);

        params.set('page', String(page));
        params.set('size', String(currentPageSize));
        if (isAdmin && userId) params.set('userId', userId);
        if (apiKeyId) params.set('apiKeyId', apiKeyId);
        if (status) params.set('status', status);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        return params;
    }

    function normalizeDateValue(value) {
        if (!value) return '';
        return String(value).trim().replace(/\//g, '-');
    }

    function validateDateRange(startDate, endDate) {
        if (!startDate || !endDate) {
            return;
        }

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
            throw new Error('开始日期不能晚于结束日期');
        }
    }

    function renderLogsTable(logs) {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="' + getColumnCount() + '" class="table-empty">当前条件下没有日志</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(function(log) {
            const cells = [];

            cells.push('<td class="time-cell">' + formatDateTime(log.createdAt) + '</td>');
            cells.push('<td class="request-id-cell"><span class="request-id" title="' + escapeHtml(log.requestId || '-') + '">' + escapeHtml(shortRequestId(log.requestId)) + '</span></td>');
            if (isAdmin) {
                cells.push('<td class="user-id-cell">' + escapeHtml(stringValue(log.userId)) + '</td>');
            }
            cells.push('<td class="api-key-cell" title="' + escapeHtml(log.apiKeyName || '-') + '">' + escapeHtml(log.apiKeyName || '-') + '</td>');
            cells.push('<td class="model-cell" title="' + escapeHtml(log.modelName || '-') + '">' + escapeHtml(log.modelName || '-') + '</td>');
            cells.push('<td class="text-right cost-column">' + escapeHtml(formatCost(log.costAmount)) + '</td>');
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

    function renderPagination(page, totalPages, totalElements) {
        const container = document.getElementById('logsPagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '<span class="page-info">共 ' + totalElements + ' 条</span>' +
                '<div style="display:flex;justify-content:center;gap:8px;">' +
                '<button class="btn btn-sm btn-secondary" disabled="disabled">上一页</button>' +
                '<button class="btn btn-sm btn-primary active">1</button>' +
                '<button class="btn btn-sm btn-secondary" disabled="disabled">下一页</button>' +
                '</div>';
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
            const modal = document.getElementById('logDetailModal');
            if (modal) {
                modal.classList.add('show');
            }
        } catch (error) {
            console.error('加载日志详情失败:', error);
            UI.showErrorMessage('加载日志详情失败: ' + error.message);
        }
    }

    function fillLogDetails(log) {
        const inputTokens = numberOrZero(log.inputTokens);
        const cachedInputTokens = numberOrZero(log.cachedInputTokens);
        const totalInputTokens = numberOrZero(log.totalInputTokens || log.inputTokens);
        const outputTokens = numberOrZero(log.outputTokens);
        const cacheHitRate = totalInputTokens > 0 ? (cachedInputTokens * 100 / totalInputTokens) : 0;

        setText('detailTime', formatDateTime(log.createdAt));
        setText('detailRequestId', stringValue(log.requestId));
        if (isAdmin) {
            setText('detailUserId', stringValue(log.userId));
        }
        setText('detailApiKey', stringValue(log.apiKeyName));
        setText('detailModel', stringValue(log.modelName));
        setText('detailInput', UI.formatNumber(inputTokens));
        setText('detailCachedInput', UI.formatNumber(cachedInputTokens));
        setText('detailCacheHitRate', formatPercent(cacheHitRate));
        setCacheHitRateColor(cacheHitRate);
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
        const modal = document.getElementById('logDetailModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    function resetFilters() {
        setDropdownValue('filterApiKey', '');
        setDropdownValue('filterStatus', '');
        setValue('filterStartDate', '');
        setValue('filterEndDate', '');
        setDropdownValue('filterPageSize', '10');
        if (isAdmin) {
            setValue('filterUserId', '');
        }
        currentPageSize = 10;
        loadLogs(0);
    }

    function getColumnCount() {
        return isAdmin ? 9 : 8;
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

    function formatPercent(value) {
        return Number(value || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }) + '%';
    }

    function formatCost(costAmount) {
        if (costAmount === null || costAmount === undefined || costAmount === '') {
            return '-';
        }
        return String(costAmount);
    }

    function setCacheHitRateColor(cacheHitRate) {
        const element = document.getElementById('detailCacheHitRate');
        if (!element) return;

        const normalizedRate = Math.max(0, Math.min(100, Number(cacheHitRate) || 0));
        const hue = Math.round(normalizedRate * 1.2);
        element.style.color = 'hsl(' + hue + ', 68%, 42%)';
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
        if (!element) return;

        if (element.dataset.neonDatepicker) {
            if (element._neonDatePicker && typeof element._neonDatePicker.setDate === 'function') {
                if (value === '') {
                    element._neonDatePicker.clear();
                } else {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        element._neonDatePicker.setDate(date);
                    }
                }
                return;
            }
        }

        element.value = value;
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
