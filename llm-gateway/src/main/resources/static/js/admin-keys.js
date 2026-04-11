(function() {
    'use strict';

    const PAGE_SIZE = 10;

    let currentUser = null;
    let isAdmin = false;
    let allKeys = [];
    let filteredKeys = [];
    let allUsers = [];
    let currentPage = 1;
    let activeActionKey = null;

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        currentUser = await API.getCurrentUser();
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }

        isAdmin = currentUser.role === 'ADMIN';
        initSidebarUserInfo(currentUser);
        bindEvents();
        await initializePage();
    });

    async function initializePage() {
        showLoading(true);
        try {
            const tasks = [loadKeys()];
            if (isAdmin) {
                tasks.push(loadUsers());
            }
            await Promise.all(tasks);
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

        document.addEventListener('click', function(event) {
            const menu = document.getElementById('keyActionMenu');
            if (menu && !menu.classList.contains('d-none') && !menu.contains(event.target)) {
                closeActionMenu();
            }
        });

        window.addEventListener('resize', closeActionMenu);
        window.addEventListener('scroll', closeActionMenu, true);
    }

    function initSidebarUserInfo(user) {
        const usernameEl = document.getElementById('sidebarUsername');
        const avatarEl = document.getElementById('sidebarUserAvatar');
        if (usernameEl) usernameEl.textContent = user.username || '-';
        if (avatarEl) avatarEl.textContent = (user.username || 'U').substring(0, 1).toUpperCase();
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
        const keys = await API.get('/apikeys');
        allKeys = Array.isArray(keys) ? keys : [];
    }

    function populateUserOptions() {
        const filterSelect = document.getElementById('userFilter');
        const userOptions = allUsers.map(function(user) {
            return '<option value="' + user.id + '">' + escapeHtml(user.username) + ' (#' + user.id + ')</option>';
        }).join('');

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">全部用户</option>' + userOptions;
        }
    }

    function applyCurrentFilters() {
        if (!isAdmin) {
            filteredKeys = allKeys.slice();
        } else {
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
        }

        currentPage = 1;
        renderTable();
        renderPagination();
    }

    function renderTable() {
        const tbody = document.getElementById('keysTableBody');
        const summary = document.getElementById('keysSummaryText');
        if (!tbody) return;

        if (summary) {
            summary.textContent = '共 ' + UI.formatNumber(filteredKeys.length) + ' 条，当前第 ' + currentPage + ' 页';
        }

        if (filteredKeys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="' + getColumnCount() + '" class="text-center text-muted" style="padding:40px;">没有匹配的 API Key</td></tr>';
            return;
        }

        const pageItems = getCurrentPageItems();
        tbody.innerHTML = pageItems.map(function(key) {
            const cells = [];
            if (isAdmin) {
                cells.push('<td>' + renderUserCell(key) + '</td>');
            }

            cells.push('<td>' + escapeHtml(key.name || '-') + '</td>');
            cells.push('<td>' + renderKeyCell(key) + '</td>');
            cells.push('<td>' + UI.formatNumber(key.usedTokens || 0) + '</td>');
            cells.push('<td>' + formatDateTime(key.lastUsedAt, '尚未使用') + '</td>');
            cells.push('<td>' + renderStatusBadge(key.enabled) + '</td>');
            cells.push('<td>' + renderActions(key) + '</td>');

            return '<tr>' + cells.join('') + '</tr>';
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

    function getColumnCount() {
        return isAdmin ? 7 : 6;
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
        const escapedName = escapeJsString(key.name || '');
        return '' +
            '<div class="table-actions">' +
                '<button class="btn btn-sm btn-secondary table-actions-menu-trigger" type="button" onclick="openKeyActionMenu(event, ' + key.id + ', \'' + escapedName + '\', ' + key.enabled + ')">操作</button>' +
            '</div>';
    }

    function maskKey(key) {
        if (!key) return '-';
        if (key.length <= 14) return key;
        return key.substring(0, 8) + '...' + key.substring(key.length - 4);
    }

    function formatDateTime(value, fallback) {
        if (!value) return fallback || '-';
        return new Date(value).toLocaleString('zh-CN');
    }

    function showLoading(isLoading) {
        const loading = document.getElementById('keysLoading');
        const container = document.getElementById('keysContainer');
        if (loading) loading.classList.toggle('d-none', !isLoading);
        if (container) container.classList.toggle('d-none', isLoading);
    }

    function closeActionMenu() {
        const menu = document.getElementById('keyActionMenu');
        if (!menu) return;
        menu.classList.add('d-none');
    }

    function syncActionMenuLabel() {
        const toggleItem = document.getElementById('keyActionToggleItem');
        if (!toggleItem || !activeActionKey) return;
        toggleItem.textContent = activeActionKey.enabled ? '禁用 Key' : '启用 Key';
    }

    function findKeyById(id) {
        return allKeys.find(function(key) {
            return String(key.id) === String(id);
        });
    }

    async function refreshKeysAndRepaint() {
        showLoading(true);
        closeActionMenu();
        try {
            await loadKeys();
            applyCurrentFilters();
        } finally {
            showLoading(false);
        }
    }

    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function escapeJsString(text) {
        return String(text || '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, '\\\'')
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');
    }

    window.applyFilters = function() {
        applyCurrentFilters();
    };

    window.resetFilters = function() {
        const keywordInput = document.getElementById('keywordInput');
        const userFilter = document.getElementById('userFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (keywordInput) keywordInput.value = '';
        if (userFilter) userFilter.value = '';
        if (statusFilter) statusFilter.value = '';

        applyCurrentFilters();
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

    window.openKeyActionMenu = function(event, id, name, enabled) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const menu = document.getElementById('keyActionMenu');
        if (!menu) return;

        const sameKey = activeActionKey && activeActionKey.id === id && !menu.classList.contains('d-none');
        if (sameKey) {
            closeActionMenu();
            return;
        }

        activeActionKey = {
            id: id,
            name: name,
            enabled: Boolean(enabled)
        };
        syncActionMenuLabel();

        const rect = event.currentTarget.getBoundingClientRect();
        menu.style.top = (rect.bottom + 8) + 'px';
        menu.style.left = Math.max(12, rect.right - 168) + 'px';
        menu.classList.remove('d-none');
    };

    window.openCreateModal = function() {
        if (isAdmin && !allUsers.length) {
            UI.showErrorMessage('当前没有可选用户，无法创建 Key');
            return;
        }

        const createName = document.getElementById('createName');
        if (createName) createName.value = '';

        openModal('createModal');
    };

    window.createKey = async function() {
        const userFilter = document.getElementById('userFilter');
        const name = document.getElementById('createName')?.value.trim() || '';

        const requiredError = FormValidation.required(name, 'Key 名称');
        if (requiredError) {
            UI.showErrorMessage(requiredError);
            return;
        }

        const payload = {
            name: name
        };

        const endpoint = isAdmin && userFilter && userFilter.value
            ? '/apikeys?userId=' + encodeURIComponent(userFilter.value)
            : '/apikeys';

        try {
            const created = await API.post(endpoint, payload);
            closeModal('createModal');
            UI.showSuccessMessage('创建成功：' + (created.key || created.name || '新 Key'));
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('创建失败：' + error.message);
        }
    };

    window.toggleKeyFromMenu = async function() {
        if (!activeActionKey) return;
        const id = activeActionKey.id;
        const nextEnabled = !activeActionKey.enabled;
        closeActionMenu();

        try {
            await API.put('/apikeys/' + id + '/toggle', {});
            UI.showSuccessMessage(nextEnabled ? '已启用 Key' : '已禁用 Key');
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('更新状态失败：' + error.message);
        }
    };

    window.deleteKeyFromMenu = async function() {
        if (!activeActionKey) return;

        const id = activeActionKey.id;
        const name = activeActionKey.name;
        closeActionMenu();

        if (!window.confirm('确认删除 API Key "' + name + '" 吗？该操作不可恢复。')) {
            return;
        }

        try {
            await API.delete('/apikeys/' + id);
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
})();
