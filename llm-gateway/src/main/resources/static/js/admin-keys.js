/**
 * LLM Gateway - Admin Keys Page
 * Session/Cookie 认证模式
 */
(function() {
    'use strict';

    let currentPage = 0;

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
        loadKeys(0);
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

    async function loadKeys(page) {
        currentPage = page;
        const loading = document.getElementById('keysLoading');
        const container = document.getElementById('keysContainer');
        if (loading) loading.classList.remove('d-none');
        if (container) container.classList.add('d-none');

        try {
            const data = await API.get('/admin/apikeys?page=' + page + '&size=20');
            const keys = Array.isArray(data) ? data : (data.content || []);
            renderTable(keys);
            if (container) container.classList.remove('d-none');
        } catch (e) {
            console.error('加载 Key 失败', e);
            UI.showErrorMessage('加载失败：' + e.message);
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function renderTable(keys) {
        const tbody = document.getElementById('keysTableBody');
        if (!tbody) return;

        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:40px;">暂无 API Key</td></tr>';
            return;
        }

        tbody.innerHTML = keys.map(function(k) {
            const statusBadge = k.enabled
                ? '<span class="badge-success">启用</span>'
                : '<span class="badge-danger">禁用</span>';
            const maskedKey = k.key ? (k.key.substring(0, 8) + '...' + k.key.substring(k.key.length - 4)) : '-';
            return '<tr>' +
                '<td>' + escapeHtml(k.name) + '</td>' +
                '<td title="' + escapeHtml(k.key || '') + '">' + maskedKey + '</td>' +
                '<td>-</td>' +
                '<td>' + (k.tokenLimit != null ? UI.formatNumber(k.tokenLimit) : '无限') + '</td>' +
                '<td>' + UI.formatNumber(k.usedTokens || 0) + '</td>' +
                '<td>' + escapeHtml(k.targetUrl || '默认') + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm btn-primary" style="margin-right:6px;" onclick="openEdit(' +
                        k.id + ',' +
                        (k.tokenLimit != null ? k.tokenLimit : 'null') + ',' +
                        '\'' + escapeAttr(k.targetUrl || '') + '\',' +
                        '\'' + escapeAttr(k.routingConfig || '') + '\'' +
                    ')">编辑</button>' +
                    '<button class="btn btn-sm btn-success" onclick="resetUsage(' + k.id + ')">重置用量</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    function escapeAttr(str) {
        return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    window.openEdit = function(id, tokenLimit, targetUrl, routingConfig) {
        document.getElementById('editKeyId').value = id;
        document.getElementById('editTokenLimit').value = tokenLimit != null ? tokenLimit : '';
        document.getElementById('editTargetUrl').value = targetUrl || '';
        document.getElementById('editRoutingConfig').value = routingConfig || '';
        document.getElementById('editModal').style.display = 'flex';
    };

    window.closeModal = function() {
        document.getElementById('editModal').style.display = 'none';
    };

    window.saveKeyEdit = async function() {
        const id = document.getElementById('editKeyId').value;
        const tokenLimit = document.getElementById('editTokenLimit').value;
        const targetUrl = document.getElementById('editTargetUrl').value.trim();
        const routingConfig = document.getElementById('editRoutingConfig').value.trim();

        try {
            await API.put('/admin/keys/' + id, {
                tokenLimit: tokenLimit !== '' ? parseInt(tokenLimit) : null,
                targetUrl: targetUrl || null,
                routingConfig: routingConfig || null
            });
            UI.showSuccessMessage('保存成功');
            closeModal();
            loadKeys(currentPage);
        } catch (e) {
            UI.showErrorMessage('保存失败：' + e.message);
        }
    };

    window.resetUsage = async function(id) {
        if (!confirm('确定要将该 Key 的用量重置为 0 吗？')) return;
        try {
            await API.post('/admin/keys/' + id + '/reset-usage', {});
            UI.showSuccessMessage('重置成功');
            loadKeys(currentPage);
        } catch (e) {
            UI.showErrorMessage('重置失败：' + e.message);
        }
    };

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => window.location.href = '/login')
            .catch(() => window.location.href = '/login');
    };

    // Close modal on overlay click
    const overlay = document.getElementById('editModal');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });
    }
})();
