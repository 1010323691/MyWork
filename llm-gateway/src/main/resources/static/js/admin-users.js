/**
 * LLM Gateway - Admin Users Page
 * Session/Cookie authentication mode
 */
(function() {
    'use strict';

    let currentUserId = '';
    let currentUsername = '';
    let currentPage = 0;
    let dangerModalResolver = null;
    let activeActionUser = null;

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        const user = await API.getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            window.location.href = '/dashboard';
            return;
        }

        initSidebarUserInfo(user);
        bindSearchEvents();
        bindDangerModalEvents();
        bindGlobalEvents();
        loadUsers(0, null, '');
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

    async function loadUsers(page, userId, username) {
        currentPage = page;
        const loading = document.getElementById('usersLoading');
        const container = document.getElementById('usersContainer');

        if (loading) loading.classList.remove('d-none');
        if (container) container.classList.add('d-none');
        closeUserActionMenu();

        const params = new URLSearchParams({
            page: String(page),
            size: '20'
        });

        if (userId) params.set('userId', String(userId));
        if (username) params.set('username', username);

        try {
            const data = await API.get('/admin/users?' + params.toString());
            const users = data.content || [];
            const page = data.page || {};
            renderTable(users);
            const totalPages = (page.totalPages || 0) > 0 ? page.totalPages : 1;
            const totalElements = (page.totalElements || 0) > 0 ? page.totalElements : users.length;
            renderPagination(page.number || 0, totalPages, totalElements);
            if (container) container.classList.remove('d-none');
        } catch (error) {
            console.error('Failed to load users', error);
            UI.showErrorMessage('加载用户失败：' + error.message);
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function renderTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:40px;">暂无用户</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(function(user) {
            const statusBadge = user.enabled
                ? '<span class="badge badge-success">正常</span>'
                : '<span class="badge badge-danger">已禁用</span>';
            const roleBadge = user.userRole === 'ADMIN'
                ? '<span class="badge badge-secondary">ADMIN</span>'
                : '<span class="badge badge-default">USER</span>';
            const escapedUsername = escapeJsString(user.username);
            const escapedEmail = escapeJsString(user.email || '');

            return '<tr>' +
                '<td>' + user.id + '</td>' +
                '<td>' + escapeHtml(user.username) + '</td>' +
                '<td>' + roleBadge + '</td>' +
                '<td>' + UI.formatNumber(user.totalUsedTokens || 0) + '</td>' +
                '<td>¥ ' + formatMoney(user.balance) + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' +
                    '<div class="table-actions">' +
                        '<button class="btn btn-sm btn-secondary table-actions-menu-trigger" type="button" onclick="toggleUserActionMenu(event, ' + user.id + ', \'' + escapedUsername + '\', \'' + escapedEmail + '\', ' + user.enabled + ')">操作</button>' +
                    '</div>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    function renderPagination(page, totalPages, totalElements) {
        const container = document.getElementById('usersPagination');
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

    function bindSearchEvents() {
        ['userIdSearch', 'usernameSearch'].forEach(function(id) {
            const input = document.getElementById(id);
            if (!input) return;

            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    window.searchUsers();
                }
            });
        });
    }

    function bindDangerModalEvents() {
        const modal = document.getElementById('dangerActionModal');
        if (!modal) return;

        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeDangerModal(false);
            }
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && modal.classList.contains('show')) {
                closeDangerModal(false);
            }
        });
    }

    function bindGlobalEvents() {
        document.addEventListener('click', function(event) {
            const menu = document.getElementById('userActionMenu');
            if (menu && !menu.classList.contains('d-none') && !menu.contains(event.target)) {
                closeUserActionMenu();
            }
        });

        window.addEventListener('resize', closeUserActionMenu);
        window.addEventListener('scroll', closeUserActionMenu, true);
    }

    function openDangerModal(options) {
        const modal = document.getElementById('dangerActionModal');
        if (!modal) {
            return Promise.resolve(window.confirm(options.message || '确认继续此操作吗？'));
        }

        document.getElementById('dangerActionTitle').textContent = options.title || '高危操作确认';
        document.getElementById('dangerActionMessage').textContent = options.message || '';
        document.getElementById('dangerActionHint').textContent = options.hint || '此操作执行后将立即生效，请再次确认。';

        const confirmButton = document.getElementById('dangerActionConfirmBtn');
        confirmButton.textContent = options.confirmText || '确认';
        confirmButton.className = 'btn btn-danger';

        modal.classList.add('show');
        modal.style.display = 'flex';

        return new Promise(function(resolve) {
            dangerModalResolver = resolve;
        });
    }

    function closeDangerModal(confirmed) {
        const modal = document.getElementById('dangerActionModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }

        if (dangerModalResolver) {
            const resolve = dangerModalResolver;
            dangerModalResolver = null;
            resolve(Boolean(confirmed));
        }
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
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

    function formatMoney(value) {
        return UI.formatMoney(value, 2, 8);
    }

    function setActionMenuToggleText() {
        const menuItem = document.getElementById('userActionToggleItem');
        if (!menuItem || !activeActionUser) return;
        menuItem.textContent = activeActionUser.enabled ? '禁用用户' : '启用用户';
    }

    function closeUserActionMenu() {
        const menu = document.getElementById('userActionMenu');
        if (!menu) return;
        menu.classList.add('d-none');
    }

    async function adjustUserBalance(userId, amount) {
        const response = await fetch('/api/balance/admin/user/' + encodeURIComponent(userId), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ amount: amount })
        });

        if (!response.ok) {
            let message = '调整额度失败';
            try {
                const data = await response.json();
                message = data.message || data.error || message;
            } catch (error) {
                const text = await response.text();
                if (text) {
                    message = text;
                }
            }
            throw new Error(message);
        }

        return response.json();
    }

    window.searchUsers = function() {
        currentUserId = document.getElementById('userIdSearch').value.trim();
        currentUsername = document.getElementById('usernameSearch').value.trim();

        if (currentUserId && !/^\d+$/.test(currentUserId)) {
            UI.showErrorMessage('用户 ID 必须为数字');
            return;
        }

        loadUsers(0, currentUserId || null, currentUsername);
    };

    window.resetSearch = function() {
        document.getElementById('userIdSearch').value = '';
        document.getElementById('usernameSearch').value = '';
        currentUserId = '';
        currentUsername = '';
        loadUsers(0, null, '');
    };

    window.goPage = function(page) {
        loadUsers(page, currentUserId || null, currentUsername);
    };

    window.toggleUserActionMenu = function(event, id, username, email, enabled) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const menu = document.getElementById('userActionMenu');
        if (!menu) return;

        const sameUser = activeActionUser && activeActionUser.id === id && !menu.classList.contains('d-none');
        if (sameUser) {
            closeUserActionMenu();
            return;
        }

        activeActionUser = {
            id: id,
            username: username,
            email: email,
            enabled: Boolean(enabled)
        };

        setActionMenuToggleText();

        const trigger = event.currentTarget;
        const rect = trigger.getBoundingClientRect();
        menu.style.top = (rect.bottom + 8) + 'px';
        menu.style.left = Math.max(12, rect.right - 168) + 'px';
        menu.classList.remove('d-none');
    };

    window.handleUserActionToggle = async function() {
        closeUserActionMenu();
        if (!activeActionUser) return;

        const id = activeActionUser.id;
        const username = activeActionUser.username;
        const currentEnabled = activeActionUser.enabled;
        const actionText = currentEnabled ? '禁用' : '启用';

        if (currentEnabled) {
            const confirmed = await openDangerModal({
                title: '确认禁用用户',
                message: '即将禁用用户 "' + username + '" (ID: ' + id + ')。',
                hint: '禁用后该用户将无法继续调用系统功能，你可以稍后重新启用。',
                confirmText: '确认禁用'
            });
            if (!confirmed) return;
        }

        try {
            await API.put('/admin/users/' + id + '/toggle');
            UI.showSuccessMessage(actionText + '成功');
            loadUsers(currentPage, currentUserId || null, currentUsername);
        } catch (error) {
            UI.showErrorMessage(actionText + '失败：' + error.message);
        }
    };

    window.handleUserActionDelete = async function() {
        closeUserActionMenu();
        if (!activeActionUser) return;

        const id = activeActionUser.id;
        const username = activeActionUser.username;
        const confirmed = await openDangerModal({
            title: '确认删除用户',
            message: '即将删除用户 "' + username + '" (ID: ' + id + ')。',
            hint: '删除后将同时清理该用户关联的 API Key 和请求日志，且无法恢复。',
            confirmText: '确认删除'
        });
        if (!confirmed) return;

        try {
            await API.delete('/admin/users/' + id);
            UI.showSuccessMessage('删除成功');

            const currentRows = document.querySelectorAll('#usersTableBody tr').length;
            const nextPage = currentPage > 0 && currentRows === 1 ? currentPage - 1 : currentPage;
            loadUsers(nextPage, currentUserId || null, currentUsername);
        } catch (error) {
            UI.showErrorMessage('删除失败：' + error.message);
        }
    };

    window.openBalanceModal = async function() {
        closeUserActionMenu();
        if (!activeActionUser) return;

        const modal = document.getElementById('balanceAdjustModal');
        const amountInput = document.getElementById('balanceAdjustAmount');
        const userInfo = document.getElementById('balanceAdjustUserInfo');
        const currentValue = document.getElementById('balanceAdjustCurrentValue');

        if (!modal || !amountInput || !userInfo || !currentValue) return;

        userInfo.textContent = '用户：' + activeActionUser.username + ' (ID: ' + activeActionUser.id + ')';
        amountInput.value = '';
        currentValue.textContent = '加载中...';

        modal.classList.add('show');
        modal.style.display = 'flex';

        try {
            const data = await API.get('/balance/user/' + encodeURIComponent(activeActionUser.id));
            currentValue.textContent = '¥ ' + formatMoney(data.balance);
        } catch (error) {
            currentValue.textContent = '加载失败';
            UI.showErrorMessage('获取当前余额失败：' + error.message);
        }

        amountInput.focus();
    };

    window.closeBalanceModal = function() {
        const modal = document.getElementById('balanceAdjustModal');
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
    };

    window.submitBalanceAdjust = async function() {
        if (!activeActionUser) return;

        const amountInput = document.getElementById('balanceAdjustAmount');
        const confirmBtn = document.getElementById('balanceAdjustConfirmBtn');
        const rawValue = amountInput ? amountInput.value.trim() : '';

        if (!rawValue) {
            UI.showErrorMessage('请输入调整金额');
            return;
        }

        const amount = Number(rawValue);
        if (!Number.isFinite(amount) || amount === 0) {
            UI.showErrorMessage('调整金额必须是非 0 数字');
            return;
        }

        if (confirmBtn) confirmBtn.disabled = true;
        try {
            const result = await adjustUserBalance(activeActionUser.id, amount);
            UI.showSuccessMessage('额度调整成功，当前余额：¥ ' + formatMoney(result.balance));
            closeBalanceModal();
            loadUsers(currentPage, currentUserId || null, currentUsername);
        } catch (error) {
            UI.showErrorMessage(error.message || '额度调整失败');
        } finally {
            if (confirmBtn) confirmBtn.disabled = false;
        }
    };

    window.confirmDangerAction = function() {
        closeDangerModal(true);
    };

    window.cancelDangerAction = function() {
        closeDangerModal(false);
    };

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => window.location.href = '/login')
            .catch(() => window.location.href = '/login');
    };
})();
