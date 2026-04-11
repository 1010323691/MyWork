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

        const params = new URLSearchParams({
            page: String(page),
            size: '20'
        });

        if (userId) params.set('userId', String(userId));
        if (username) params.set('username', username);

        try {
            const data = await API.get('/admin/users?' + params.toString());
            renderTable(data.content || []);
            renderPagination(
                data.number || 0,
                data.totalPages || 0,
                data.totalElements || 0
            );
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
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:40px;">暂无用户</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(function(user) {
            const statusBadge = user.enabled
                ? '<span class="badge-success">正常</span>'
                : '<span class="badge-danger">已禁用</span>';
            const roleBadge = user.userRole === 'ADMIN'
                ? '<span class="badge-secondary">ADMIN</span>'
                : '<span class="badge-default">USER</span>';
            const createdAt = user.createdAt
                ? new Date(user.createdAt).toLocaleString('zh-CN')
                : '-';
            const toggleText = user.enabled ? '禁用' : '启用';
            const toggleClass = user.enabled ? 'btn-warning' : 'btn-success';
            const escapedUsername = escapeJsString(user.username);

            return '<tr>' +
                '<td>' + user.id + '</td>' +
                '<td>' + escapeHtml(user.username) + '</td>' +
                '<td>' + escapeHtml(user.email || '-') + '</td>' +
                '<td>' + roleBadge + '</td>' +
                '<td>' + createdAt + '</td>' +
                '<td>' + (user.apiKeyCount || 0) + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm ' + toggleClass + '" type="button" style="margin-right:6px;" onclick="toggleUser(' + user.id + ', ' + user.enabled + ', \'' + escapedUsername + '\')">' +
                        toggleText +
                    '</button>' +
                    '<button class="btn btn-sm btn-danger" type="button" onclick="deleteUser(' + user.id + ', \'' + escapedUsername + '\')">删除</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    function renderPagination(page, totalPages, totalElements) {
        const el = document.getElementById('usersPagination');
        if (!el) return;

        if (totalPages <= 1) {
            el.innerHTML = '<span class="page-info">共 ' + totalElements + ' 条</span>';
            return;
        }

        el.innerHTML =
            '<button ' + (page === 0 ? 'disabled' : '') + ' onclick="goPage(' + (page - 1) + ')">上一页</button>' +
            '<span class="page-info">第 ' + (page + 1) + ' / ' + totalPages + ' 页，共 ' + totalElements + ' 条</span>' +
            '<button ' + (page >= totalPages - 1 ? 'disabled' : '') + ' onclick="goPage(' + (page + 1) + ')">下一页</button>';
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

    window.toggleUser = async function(id, currentEnabled, username) {
        const actionText = currentEnabled ? '禁用' : '启用';

        if (currentEnabled) {
            const confirmed = await openDangerModal({
                title: '确认禁用用户',
                message: '即将禁用用户 “' + username + '” (ID: ' + id + ')。',
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

    window.deleteUser = async function(id, username) {
        const confirmed = await openDangerModal({
            title: '确认删除用户',
            message: '即将删除用户 “' + username + '” (ID: ' + id + ')。',
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
