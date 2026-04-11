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
            UI.showErrorMessage('\u9875\u9762\u521d\u59cb\u5316\u5931\u8d25\uff1a' + error.message);
        } finally {
            showLoading(false);
        }
    }

    function bindEvents() {
        const keywordInput = document.getElementById('keywordInput');
        const userFilterEl = document.getElementById('userFilter');
        const statusFilterEl = document.getElementById('statusFilter');
        const createName = document.getElementById('createName');

        if (keywordInput) {
            keywordInput.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    applyCurrentFilters();
                }
            });
        }

        // 鑷畾涔変笅鎷夎彍鍗曞凡缁忓唴缃簡 change 浜嬩欢澶勭悊锛岄€氳繃 onChange 鍥炶皟
        // 浣嗕负浜嗙‘淇濆吋瀹规€э紝鎴戜滑鐩戝惉鍏冪礌鐨?change 浜嬩欢
        if (userFilterEl && window.getDropdownInstance) {
            const userFilter = window.getDropdownInstance(userFilterEl);
            if (userFilter) {
                userFilter.options.onChange = applyCurrentFilters;
            }
        }

        if (statusFilterEl && window.getDropdownInstance) {
            const statusFilter = window.getDropdownInstance(statusFilterEl);
            if (statusFilter) {
                statusFilter.options.onChange = applyCurrentFilters;
            }
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
        const userFilterEl = document.getElementById('userFilter');
        if (!userFilterEl) return;

        const userFilter = window.getDropdownInstance ? window.getDropdownInstance(userFilterEl) : null;
        if (!userFilter) {
            console.error('Custom dropdown instance not found for userFilter');
            return;
        }

        const options = [
            { value: '', text: '\u5168\u90e8\u7528\u6237' }
        ];

        allUsers.forEach(function(user) {
            options.push({
                value: String(user.id),
                text: escapeHtml(user.username) + ' (#' + user.id + ')'
            });
        });

        userFilter.setOptions(options);
    }

    function applyCurrentFilters() {
        if (!isAdmin) {
            filteredKeys = allKeys.slice();
        } else {
            const keywordInput = document.getElementById('keywordInput');
            const userFilterEl = document.getElementById('userFilter');
            const statusFilterEl = document.getElementById('statusFilter');

            const keyword = (keywordInput?.value || '').trim().toLowerCase();
            const userId = getDropdownValue(userFilterEl) || '';
            const status = getDropdownValue(statusFilterEl) || '';

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
            summary.textContent = '\u5171 ' + UI.formatNumber(filteredKeys.length) + ' \u6761\uff0c\u5f53\u524d\u7b2c ' + currentPage + ' \u9875';
        }

        if (filteredKeys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="' + getColumnCount() + '" class="text-center text-muted" style="padding:40px;">\u6ca1\u6709\u5339\u914d\u7684 API Key</td></tr>';
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
            cells.push('<td>' + formatDateTime(key.lastUsedAt, '\u5c1a\u672a\u4f7f\u7528') + '</td>');
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
            pagination.innerHTML = '<span class="page-info">\u5171 ' + UI.formatNumber(filteredKeys.length) + ' \u6761</span>';
            return;
        }

        pagination.innerHTML = '' +
            '<button class="btn btn-secondary" type="button" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')">\u4e0a\u4e00\u9875</button>' +
            '<span class="page-info">\u7b2c ' + currentPage + ' / ' + totalPages + ' \u9875</span>' +
            '<button class="btn btn-secondary" type="button" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')">\u4e0b\u4e00\u9875</button>';
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
                '<button class="btn btn-sm btn-primary" type="button" onclick="copyKey(' + key.id + ')">\u590d\u5236</button>' +
            '</div>';
    }

    function renderStatusBadge(enabled) {
        return enabled
            ? '<span class="badge badge-success">启用</span>'
            : '<span class="badge badge-danger">禁用</span>';
    }

    function renderActions(key) {
        const escapedName = escapeJsString(key.name || '');
        return '' +
            '<div class="table-actions">' +
                '<button class="btn btn-sm btn-secondary table-actions-menu-trigger" type="button" onclick="openKeyActionMenu(event, ' + key.id + ', \'' + escapedName + '\', ' + key.enabled + ')">\u64cd\u4f5c</button>' +
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

    /**
     * ??????????????????? select?
     * @param {HTMLElement|null} element
     */
    function getDropdownValue(element) {
        if (!element) return null;

        const dropdown = window.getDropdownInstance ? window.getDropdownInstance(element) : null;
        if (dropdown && typeof dropdown.getValue === 'function') {
            return dropdown.getValue();
        }

        // 鍏煎鍘熺敓 select
        if (element.value !== undefined) {
            return element.value;
        }

        return null;
    }

    function closeActionMenu() {
        const menu = document.getElementById('keyActionMenu');
        if (!menu) return;
        menu.classList.add('d-none');
    }

    function syncActionMenuLabel() {
        const toggleItem = document.getElementById('keyActionToggleItem');
        if (!toggleItem || !activeActionKey) return;
        toggleItem.textContent = activeActionKey.enabled ? '\u7981\u7528 Key' : '\u542f\u7528 Key';
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
        const userFilterEl = document.getElementById('userFilter');
        const statusFilterEl = document.getElementById('statusFilter');

        if (keywordInput) keywordInput.value = '';

        if (userFilterEl && window.getDropdownInstance) {
            const userFilter = window.getDropdownInstance(userFilterEl);
            if (userFilter && typeof userFilter.clear === 'function') {
                userFilter.clear();
            } else if (userFilterEl.value !== undefined) {
                userFilterEl.value = '';
            }
        }

        if (statusFilterEl && window.getDropdownInstance) {
            const statusFilter = window.getDropdownInstance(statusFilterEl);
            if (statusFilter && typeof statusFilter.clear === 'function') {
                statusFilter.clear();
            } else if (statusFilterEl.value !== undefined) {
                statusFilterEl.value = '';
            }
        }

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
            UI.showErrorMessage('\u672a\u627e\u5230\u53ef\u590d\u5236\u7684 Key');
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
            UI.showErrorMessage('\u5f53\u524d\u6ca1\u6709\u53ef\u9009\u7528\u6237\uff0c\u65e0\u6cd5\u521b\u5efa Key');
            return;
        }

        const createName = document.getElementById('createName');
        if (createName) createName.value = '';

        openModal('createModal');
    };

    window.createKey = async function() {
        const userFilterEl = document.getElementById('userFilter');
        const name = document.getElementById('createName')?.value.trim() || '';

        const requiredError = FormValidation.required(name, 'Key \u540d\u79f0');
        if (requiredError) {
            UI.showErrorMessage(requiredError);
            return;
        }

        const payload = {
            name: name
        };

        const userId = getDropdownValue(userFilterEl);
        const endpoint = isAdmin && userId
            ? '/apikeys?userId=' + encodeURIComponent(userId)
            : '/apikeys';

        try {
            const created = await API.post(endpoint, payload);
            closeModal('createModal');
            UI.showSuccessMessage('\u521b\u5efa\u6210\u529f\uff1a' + (created.key || created.name || '\u65b0 Key'));
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('\u521b\u5efa\u5931\u8d25\uff1a' + error.message);
        }
    };

    window.toggleKeyFromMenu = async function() {
        if (!activeActionKey) return;
        const id = activeActionKey.id;
        const nextEnabled = !activeActionKey.enabled;
        closeActionMenu();

        try {
            await API.put('/apikeys/' + id + '/toggle', {});
            UI.showSuccessMessage(nextEnabled ? '\u5df2\u542f\u7528 Key' : '\u5df2\u7981\u7528 Key');
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('\u66f4\u65b0\u72b6\u6001\u5931\u8d25\uff1a' + error.message);
        }
    };

    window.deleteKeyFromMenu = async function() {
        if (!activeActionKey) return;

        const id = activeActionKey.id;
        const name = activeActionKey.name;
        closeActionMenu();

        if (!window.confirm('\u786e\u8ba4\u5220\u9664 API Key "' + name + '" \u5417\uff1f\u8be5\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\u3002')) {
            return;
        }

        try {
            await API.delete('/apikeys/' + id);
            UI.showSuccessMessage('\u5220\u9664\u6210\u529f');
            await refreshKeysAndRepaint();
        } catch (error) {
            UI.showErrorMessage('\u5220\u9664\u5931\u8d25\uff1a' + error.message);
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

