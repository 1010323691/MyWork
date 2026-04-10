(function() {
    'use strict';

    const PAGE_SIZE = 10;

    let currentUser = null;
    let allKeys = [];
    let filteredKeys = [];
    let allUsers = [];
    let currentPage = 1;
    let currentView = 'overview';
    let topUsersChartInstance = null;
    let statusChartInstance = null;

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        currentUser = await API.getCurrentUser();
        if (!currentUser || currentUser.role !== 'ADMIN') {
            window.location.href = '/dashboard';
            return;
        }

        initSidebarUserInfo(currentUser);
        bindEvents();
        await initializePage();
        switchKeysPage(currentView);
    });

    async function initializePage() {
        showLoading(true);
        try {
            await Promise.all([loadUsers(), loadKeys()]);
            applyCurrentFilters();
        } catch (error) {
            console.error('Failed to initialize key management page', error);
            UI.showErrorMessage('页面初始化失败：' + error.message);
        } finally {
            showLoading(false);
        }
    }

    function bindEvents() {
        const keywordInput = document.getElementById('keywordInput');
        const userFilter = document.getElementById('userFilter');
        const statusFilter = document.getElementById('statusFilter');
        const createName = document.getElementById('createName');

        if (keywordInput) {
            keywordInput.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    applyCurrentFilters();
                }
            });
        }

        if (userFilter) {
            userFilter.addEventListener('change', applyCurrentFilters);
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', applyCurrentFilters);
        }

        if (createName) {
            createName.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    createKey();
                }
            });
        }
    }

    function initSidebarUserInfo(user) {
        const usernameEl = document.getElementById('sidebarUsername');
        const avatarEl = document.getElementById('sidebarUserAvatar');
        if (usernameEl) usernameEl.textContent = user.username;
        if (avatarEl) avatarEl.textContent = user.username.substring(0, 1).toUpperCase();
    }

    async function loadUsers() {
        const loadedUsers = [];
        let page = 0;
        let totalPages = 1;

        while (page < totalPages) {
            const data = await API.get('/admin/users?page=' + page + '&size=200');
            const pageContent = Array.isArray(data.content) ? data.content : [];
            loadedUsers.push.apply(loadedUsers, pageContent);
            totalPages = data.totalPages || 1;
            page += 1;
        }

        allUsers = loadedUsers.sort(function(a, b) {
            return String(a.username || '').localeCompare(String(b.username || ''), 'zh-CN');
        });

        populateUserOptions();
    }

    async function loadKeys() {
        const keys = await API.get('/admin/apikeys');
        allKeys = Array.isArray(keys) ? keys : [];
    }

    function populateUserOptions() {
        const filterSelect = document.getElementById('userFilter');
        const createSelect = document.getElementById('createUserId');
        const userOptions = allUsers.map(function(user) {
            return '<option value="' + user.id + '">' + escapeHtml(user.username) + ' (#' + user.id + ')</option>';
        }).join('');

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">全部用户</option>' + userOptions;
        }

        if (createSelect) {
            createSelect.innerHTML = userOptions || '<option value="">暂无可选用户</option>';
        }
    }

    function applyCurrentFilters() {
        const keyword = (document.getElementById('keywordInput')?.value || '').trim().toLowerCase();
        const userId = document.getElementById('userFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';

        filteredKeys = allKeys.filter(function(key) {
            const matchesKeyword = !keyword || [
                key.username,
                key.name,
                key.targetUrl,
                key.key
            ].some(function(value) {
                return String(value || '').toLowerCase().includes(keyword);
            });

            const matchesUser = !userId || String(key.userId) === String(userId);
            const matchesStatus = !status ||
                (status === 'enabled' && key.enabled) ||
                (status === 'disabled' && !key.enabled);

            return matchesKeyword && matchesUser && matchesStatus;
        });

        currentPage = 1;
        renderStats();
        renderCharts();
        renderTable();
        renderPagination();
    }

    function renderStats() {
        const activeCount = filteredKeys.filter(function(key) { return key.enabled; }).length;
        const userCount = new Set(filteredKeys.map(function(key) { return key.userId; }).filter(Boolean)).size;
        const usedTokens = filteredKeys.reduce(function(sum, key) {
            return sum + Number(key.usedTokens || 0);
        }, 0);

        setText('totalKeysStat', UI.formatNumber(filteredKeys.length));
        setText('activeKeysStat', UI.formatNumber(activeCount));
        setText('coveredUsersStat', UI.formatNumber(userCount));
        setText('usedTokensStat', UI.formatNumber(usedTokens));
        setText('totalKeysSubtext', '筛选结果 / 总计 ' + UI.formatNumber(allKeys.length));
    }

    function renderCharts() {
        renderTopUsersChart();
        renderStatusChart();
    }

    function switchKeysPage(view) {
        currentView = view === 'list' ? 'list' : 'overview';

        const overviewBtn = document.getElementById('overviewTabBtn');
        const listBtn = document.getElementById('listTabBtn');
        const overviewPage = document.getElementById('keysOverviewPage');
        const listPage = document.getElementById('keysListPage');

        if (overviewBtn) overviewBtn.classList.toggle('active', currentView === 'overview');
        if (listBtn) listBtn.classList.toggle('active', currentView === 'list');
        if (overviewPage) overviewPage.classList.toggle('active', currentView === 'overview');
        if (listPage) listPage.classList.toggle('active', currentView === 'list');

        if (currentView === 'overview') {
            setTimeout(function() {
                if (topUsersChartInstance) topUsersChartInstance.resize();
                if (statusChartInstance) statusChartInstance.resize();
            }, 0);
        }
    }

    function renderTopUsersChart() {
        const chartDom = document.getElementById('topUsersChart');
        if (!chartDom) return;

        const userMap = new Map();
        filteredKeys.forEach(function(key) {
            const username = key.username || '未知用户';
            userMap.set(username, (userMap.get(username) || 0) + 1);
        });

        const topUsers = Array.from(userMap.entries())
            .map(function(entry) {
                return { name: entry[0], value: entry[1] };
            })
            .sort(function(a, b) { return b.value - a.value; })
            .slice(0, 6);

        if (!topUsersChartInstance) {
            topUsersChartInstance = echarts.init(chartDom, 'tech');
        }

        topUsersChartInstance.setOption({
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: {
                type: 'value',
                minInterval: 1
            },
            yAxis: {
                type: 'category',
                data: topUsers.map(function(item) { return item.name; }).reverse(),
                axisLabel: { color: '#a0aec0' }
            },
            series: [{
                type: 'bar',
                data: topUsers.map(function(item) { return item.value; }).reverse(),
                itemStyle: {
                    borderRadius: [0, 6, 6, 0],
                    color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                        { offset: 0, color: '#00d4ff' },
                        { offset: 1, color: '#a855f7' }
                    ])
                },
                label: {
                    show: true,
                    position: 'right',
                    color: '#e8ecf1'
                }
            }]
        });
    }

    function renderStatusChart() {
        const chartDom = document.getElementById('statusChart');
        if (!chartDom) return;

        const enabledCount = filteredKeys.filter(function(key) { return key.enabled; }).length;
        const disabledCount = filteredKeys.length - enabledCount;

        if (!statusChartInstance) {
            statusChartInstance = echarts.init(chartDom, 'tech');
        }

        statusChartInstance.setOption({
            tooltip: { trigger: 'item' },
            legend: {
                bottom: 0,
                textStyle: { color: '#a0aec0' }
            },
            series: [{
                type: 'pie',
                radius: ['45%', '72%'],
                center: ['50%', '45%'],
                itemStyle: {
                    borderRadius: 8,
                    borderColor: '#151942',
                    borderWidth: 3
                },
                label: {
                    show: true,
                    color: '#e8ecf1',
                    formatter: '{b}\n{c}'
                },
                data: [
                    { value: enabledCount, name: '启用', itemStyle: { color: '#10b981' } },
                    { value: disabledCount, name: '禁用', itemStyle: { color: '#ef4444' } }
                ]
            }]
        });
    }

    function renderTable() {
        const tbody = document.getElementById('keysTableBody');
        const summary = document.getElementById('keysSummaryText');
        if (!tbody) return;

        if (summary) {
            summary.textContent = '共 ' + UI.formatNumber(filteredKeys.length) + ' 条，当前第 ' + currentPage + ' 页';
        }

        if (filteredKeys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:40px;">没有匹配的 API Key</td></tr>';
            return;
        }

        const pageItems = getCurrentPageItems();
        tbody.innerHTML = pageItems.map(function(key) {
            return '' +
                '<tr>' +
                    '<td>' + renderUserCell(key) + '</td>' +
                    '<td>' + escapeHtml(key.name || '-') + '</td>' +
                    '<td>' + renderKeyCell(key) + '</td>' +
                    '<td>' + formatQuota(key.tokenLimit) + '</td>' +
                    '<td>' + formatUsage(key) + '</td>' +
                    '<td>' + escapeHtml(key.targetUrl || '默认') + '</td>' +
                    '<td>' + formatDateTime(key.expiresAt, '不过期') + '</td>' +
                    '<td>' + renderStatusBadge(key.enabled) + '</td>' +
                    '<td>' + renderActions(key) + '</td>' +
                '</tr>';
        }).join('');
    }

    function renderPagination() {
        const pagination = document.getElementById('keysPagination');
        if (!pagination) return;

        const totalPages = Math.max(1, Math.ceil(filteredKeys.length / PAGE_SIZE));
        if (totalPages <= 1) {
            pagination.innerHTML = '<span class="page-info">共 ' + UI.formatNumber(filteredKeys.length) + ' 条</span>';
            return;
        }

        pagination.innerHTML = '' +
            '<button class="btn btn-secondary" type="button" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')">上一页</button>' +
            '<span class="page-info">第 ' + currentPage + ' / ' + totalPages + ' 页</span>' +
            '<button class="btn btn-secondary" type="button" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')">下一页</button>';
    }

    function getCurrentPageItems() {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredKeys.slice(start, start + PAGE_SIZE);
    }

    function renderUserCell(key) {
        const username = escapeHtml(key.username || '-');
        const userId = key.userId ? '<div class="table-subtext">#' + key.userId + '</div>' : '';
        return '<div>' + username + userId + '</div>';
    }

    function renderKeyCell(key) {
        const rawKey = key.key || '';
        const masked = maskKey(rawKey);
        return '' +
            '<div class="api-key-cell">' +
                '<code>' + escapeHtml(masked) + '</code>' +
                '<button class="btn btn-sm btn-primary" type="button" onclick="copyKey(' + key.id + ')">复制</button>' +
            '</div>';
    }

    function renderStatusBadge(enabled) {
        return enabled
            ? '<span class="badge-success">启用</span>'
            : '<span class="badge-danger">禁用</span>';
    }

    function renderActions(key) {
        const toggleLabel = key.enabled ? '停用' : '启用';
        const toggleClass = key.enabled ? 'btn-warning' : 'btn-success';

        return '' +
            '<div class="table-actions">' +
                '<button class="btn btn-sm btn-primary" type="button" onclick="openEditModal(' + key.id + ')">编辑</button>' +
                '<button class="btn btn-sm ' + toggleClass + '" type="button" onclick="toggleKey(' + key.id + ')">' + toggleLabel + '</button>' +
                '<button class="btn btn-sm btn-secondary" type="button" onclick="resetUsage(' + key.id + ')">重置用量</button>' +
                '<button class="btn btn-sm btn-danger" type="button" onclick="deleteKey(' + key.id + ')">删除</button>' +
            '</div>';
    }

    function maskKey(key) {
        if (!key) return '-';
        if (key.length <= 14) return key;
        return key.substring(0, 8) + '...' + key.substring(key.length - 4);
    }

    function formatQuota(tokenLimit) {
        return tokenLimit == null ? '不限额' : UI.formatNumber(tokenLimit);
    }

    function formatUsage(key) {
        const used = UI.formatNumber(key.usedTokens || 0);
        const remaining = key.remainingTokens == null ? '不限' : UI.formatNumber(key.remainingTokens);
        return used + ' / ' + remaining;
    }

    function formatDateTime(value, fallback) {
        if (!value) return fallback || '-';
        return new Date(value).toLocaleString('zh-CN');
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function showLoading(isLoading) {
        const loading = document.getElementById('keysLoading');
        const container = document.getElementById('keysContainer');
        if (loading) loading.classList.toggle('d-none', !isLoading);
        if (container) container.classList.toggle('d-none', isLoading);
    }

    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function findKeyById(id) {
        return allKeys.find(function(key) {
            return String(key.id) === String(id);
        });
    }

    async function refreshKeysAndRepaint() {
        showLoading(true);
        try {
            await loadKeys();
            applyCurrentFilters();
        } finally {
            showLoading(false);
        }
    }

    function validateRoutingConfig(value) {
        if (!value) return null;
        try {
            JSON.parse(value);
            return null;
        } catch (error) {
            return '路由配置必须是合法 JSON';
        }
    }

    window.applyFilters = function() {
        applyCurrentFilters();
        switchKeysPage('list');
    };

    window.resetFilters = function() {
        const keywordInput = document.getElementById('keywordInput');
        const userFilter = document.getElementById('userFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (keywordInput) keywordInput.value = '';
        if (userFilter) userFilter.value = '';
        if (statusFilter) statusFilter.value = '';

        applyCurrentFilters();
        switchKeysPage('list');
    };

    window.goToPage = function(page) {
        const totalPages = Math.max(1, Math.ceil(filteredKeys.length / PAGE_SIZE));
        currentPage = Math.min(Math.max(1, page), totalPages);
        renderTable();
        renderPagination();
    };

    window.copyKey = function(id) {
        const key = findKeyById(id);
        if (!key || !key.key) {
            UI.showErrorMessage('未找到可复制的 Key');
            return;
        }
        UI.copyToClipboard(key.key);
    };

    window.openCreateModal = function() {
        if (!allUsers.length) {
            UI.showErrorMessage('当前没有可选用户，无法创建 Key');
            return;
        }

        document.getElementById('createName').value = '';
        document.getElementById('createTokenLimit').value = '';
        document.getElementById('createExpiresAtDays').value = '';
        document.getElementById('createTargetUrl').value = '';
        document.getElementById('createRoutingConfig').value = '';
        openModal('createModal');
    };

    window.createKey = async function() {
        const userId = document.getElementById('createUserId').value;
        const name = document.getElementById('createName').value.trim();
        const tokenLimit = document.getElementById('createTokenLimit').value.trim();
        const expiresAtDays = document.getElementById('createExpiresAtDays').value.trim();
        const targetUrl = document.getElementById('createTargetUrl').value.trim();
        const routingConfig = document.getElementById('createRoutingConfig').value.trim();

        const requiredError = FormValidation.required(name, 'Key 名称');
        if (requiredError) {
            UI.showErrorMessage(requiredError);
            return;
        }

        const routingError = validateRoutingConfig(routingConfig);
        if (routingError) {
            UI.showErrorMessage(routingError);
            return;
        }

        const payload = {
            name: name,
            tokenLimit: tokenLimit !== '' ? Number(tokenLimit) : null,
            expiresAtDays: expiresAtDays !== '' ? Number(expiresAtDays) : null,
            targetUrl: targetUrl || null,
            routingConfig: routingConfig || null
        };

        try {
            const created = await API.post('/admin/apikeys?userId=' + encodeURIComponent(userId), payload);
            closeModal('createModal');
            UI.showSuccessMessage('创建成功：' + created.key);
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('创建失败：' + error.message);
        }
    };

    window.openEditModal = function(id) {
        const key = findKeyById(id);
        if (!key) {
            UI.showErrorMessage('未找到对应的 Key');
            return;
        }

        document.getElementById('editKeyId').value = key.id;
        document.getElementById('editKeyOwner').value = (key.username || '-') + (key.userId ? ' (#' + key.userId + ')' : '');
        document.getElementById('editTokenLimit').value = key.tokenLimit != null ? key.tokenLimit : '';
        document.getElementById('editTargetUrl').value = key.targetUrl || '';
        document.getElementById('editRoutingConfig').value = key.routingConfig || '';

        openModal('editModal');
    };

    window.saveKeyEdit = async function() {
        const id = document.getElementById('editKeyId').value;
        const tokenLimit = document.getElementById('editTokenLimit').value.trim();
        const targetUrl = document.getElementById('editTargetUrl').value.trim();
        const routingConfig = document.getElementById('editRoutingConfig').value.trim();

        const routingError = validateRoutingConfig(routingConfig);
        if (routingError) {
            UI.showErrorMessage(routingError);
            return;
        }

        try {
            await API.put('/admin/keys/' + id, {
                tokenLimit: tokenLimit !== '' ? Number(tokenLimit) : null,
                clearTokenLimit: tokenLimit === '',
                targetUrl: targetUrl || null,
                clearTargetUrl: targetUrl === '',
                routingConfig: routingConfig || null,
                clearRoutingConfig: routingConfig === ''
            });
            closeModal('editModal');
            UI.showSuccessMessage('保存成功');
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('保存失败：' + error.message);
        }
    };

    window.toggleKey = async function(id) {
        const key = findKeyById(id);
        if (!key) {
            UI.showErrorMessage('未找到对应的 Key');
            return;
        }

        const nextEnabled = !key.enabled;
        try {
            await API.put('/admin/keys/' + id, {
                enabled: nextEnabled
            });
            UI.showSuccessMessage(nextEnabled ? '已启用 Key' : '已停用 Key');
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('更新状态失败：' + error.message);
        }
    };

    window.resetUsage = async function(id) {
        if (!confirm('确认将该 Key 的已用 Token 重置为 0？')) {
            return;
        }

        try {
            await API.post('/admin/keys/' + id + '/reset-usage', {});
            UI.showSuccessMessage('已重置用量');
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('重置失败：' + error.message);
        }
    };

    window.deleteKey = async function(id) {
        if (!confirm('确认删除该 API Key？该操作不可恢复。')) {
            return;
        }

        try {
            await API.delete('/admin/apikeys/' + id);
            UI.showSuccessMessage('删除成功');
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('删除失败：' + error.message);
        }
    };

    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
        }
    }

    window.closeModal = function(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    };

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(function() { window.location.href = '/login'; })
            .catch(function() { window.location.href = '/login'; });
    };

    window.switchKeysPage = switchKeysPage;

    window.addEventListener('resize', function() {
        if (topUsersChartInstance) topUsersChartInstance.resize();
        if (statusChartInstance) statusChartInstance.resize();
    });

    window.addEventListener('beforeunload', function() {
        if (topUsersChartInstance) topUsersChartInstance.dispose();
        if (statusChartInstance) statusChartInstance.dispose();
    });
})();
