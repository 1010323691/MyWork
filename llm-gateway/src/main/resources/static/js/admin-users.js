/**
 * LLM Gateway - Admin Users Page
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        if (!API.isAuthenticated()) {
            window.location.href = '/login';
            return;
        }
        var user = API.getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            window.location.href = '/dashboard';
            return;
        }

        initUserInfo(user);
        loadUsers(0, '');
    });

    function initUserInfo(user) {
        var userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.innerHTML =
                '<span class="user-name">' + escapeHtml(user.username) + '</span>' +
                '<a href="#" onclick="logout()" class="logout-btn">退出登录</a>';
        }
    }

    async function loadUsers(page, username) {
        var loading = document.getElementById('usersLoading');
        var content = document.getElementById('usersContent');
        if (loading) loading.classList.remove('d-none');
        if (content) content.classList.add('d-none');

        var params = 'page=' + page + '&size=20';
        if (username) params += '&username=' + encodeURIComponent(username);

        try {
            var data = await API.get('/admin/users?' + params);
            renderTable(data.content || []);
            renderPagination(data.number, data.totalPages, data.totalElements, username);
            if (content) content.classList.remove('d-none');
        } catch (e) {
            console.error('加载用户失败', e);
            UI.showErrorMessage('加载失败：' + e.message);
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function renderTable(users) {
        var tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;padding:40px;">暂无用户</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(function(u) {
            var statusBadge = u.enabled
                ? '<span class="badge-success">正常</span>'
                : '<span class="badge-danger">已禁用</span>';
            var roleBadge = u.userRole === 'ADMIN'
                ? '<span class="badge-secondary">ADMIN</span>'
                : '<span>USER</span>';
            return '<tr>' +
                '<td>' + u.id + '</td>' +
                '<td>' + escapeHtml(u.username) + '</td>' +
                '<td>' + escapeHtml(u.email || '-') + '</td>' +
                '<td>' + roleBadge + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + (u.apiKeyCount || 0) + '</td>' +
                '<td>' + UI.formatNumber(u.totalUsedTokens || 0) + '</td>' +
                '<td>' + formatDate(u.createdAt) + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm btn-success" style="margin-right:6px;" onclick="toggleUser(' + u.id + ')">' +
                        (u.enabled ? '禁用' : '启用') +
                    '</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="deleteUser(' + u.id + ')">删除</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    function renderPagination(page, total, totalElements, username) {
        var el = document.getElementById('usersPagination');
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

    function formatDate(isoStr) {
        if (!isoStr) return '-';
        return new Date(isoStr).toLocaleDateString('zh-CN');
    }

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    var currentSearch = '';

    window.searchUsers = function() {
        currentSearch = document.getElementById('usernameSearch').value.trim();
        loadUsers(0, currentSearch);
    };

    window.resetSearch = function() {
        document.getElementById('usernameSearch').value = '';
        currentSearch = '';
        loadUsers(0, '');
    };

    window.goPage = function(page) {
        loadUsers(page, currentSearch);
    };

    window.toggleUser = async function(id) {
        try {
            await API.put('/admin/users/' + id + '/toggle');
            UI.showSuccessMessage('操作成功');
            loadUsers(0, currentSearch);
        } catch (e) {
            UI.showErrorMessage('操作失败：' + e.message);
        }
    };

    window.deleteUser = async function(id) {
        if (!confirm('确定要删除该用户吗？此操作将同时删除其所有 API Key，不可恢复。')) return;
        try {
            await API.delete('/admin/users/' + id);
            UI.showSuccessMessage('删除成功');
            loadUsers(0, currentSearch);
        } catch (e) {
            UI.showErrorMessage('删除失败：' + e.message);
        }
    };

    window.logout = function() {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };
})();
