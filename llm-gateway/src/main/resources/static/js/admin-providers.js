/**
 * LLM Gateway - Admin Providers Page
 * Session/Cookie 认证模式
 */
(function() {
    'use strict';

    let providers = [];

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
        loadProviders();
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
     * 加载提供商列表
     */
    async function loadProviders() {
        try {
            const response = await fetch('/api/admin/providers', {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            providers = await response.json();
            renderProviders();
            document.getElementById('providersLoading').classList.add('d-none');
            document.getElementById('providersContainer').classList.remove('d-none');
        } catch (error) {
            console.error('加载提供商失败:', error);
            UI.showAlert('加载提供商失败：' + error.message, 'error');
        }
    }

    /**
     * 渲染提供商列表
     */
    function renderProviders() {
        const tbody = document.getElementById('providersTableBody');
        if (!tbody) return;

        if (providers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#999;padding:40px;">暂无提供商</td></tr>';
            return;
        }

        tbody.innerHTML = providers.map(function(p) {
            const failureCount = p.failureCount || 0;
            const circuitClass = failureCount >= 5 ? 'circuit-open' :
                failureCount >= 3 ? 'circuit-warning' : 'circuit-normal';
            const circuitText = failureCount >= 5 ? '熔断' :
                failureCount >= 3 ? '警告' : '正常';

            return '<tr>' +
                '<td>' + p.id + '</td>' +
                '<td>' + escapeHtml(p.name) + '</td>' +
                '<td>' + escapeHtml(p.baseUrl) + '</td>' +
                '<td>' + escapeHtml(p.serviceType || '-') + '</td>' +
                '<td>' + (p.sellPriceInput || 0) + '</td>' +
                '<td>' + (p.sellPriceOutput || 0) + '</td>' +
                '<td>' + failureCount + '</td>' +
                '<td>' + (p.enabled ? '启用' : '禁用') + '</td>' +
                '<td><span class="circuit-badge ' + circuitClass + '">' + circuitText + '</span></td>' +
                '<td>' +
                    '<button class="btn btn-sm" onclick="editProvider(' + p.id + ')">编辑</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="deleteProvider(' + p.id + ')">删除</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    /**
     * 显示创建模态框
     */
    function showCreateModal() {
        document.getElementById('modalTitle').textContent = '新增提供商';
        document.getElementById('providerForm').reset();
        document.getElementById('providerId').value = '';
        document.getElementById('providerModal').classList.remove('d-none');
    }

    /**
     * 编辑提供商
     */
    function editProvider(id) {
        const provider = providers.find(function(p) { return p.id === id; });
        if (!provider) return;

        document.getElementById('modalTitle').textContent = '编辑提供商';
        document.getElementById('providerId').value = provider.id;
        document.getElementById('name').value = provider.name || '';
        document.getElementById('baseUrl').value = provider.baseUrl || '';
        document.getElementById('serviceType').value = provider.serviceType || 'OLLAMA';
        document.getElementById('timeoutSeconds').value = provider.timeoutSeconds || 300;
        document.getElementById('buyPriceInput').value = provider.buyPriceInput || '';
        document.getElementById('sellPriceInput').value = provider.sellPriceInput || '';
        document.getElementById('buyPriceOutput').value = provider.buyPriceOutput || '';
        document.getElementById('sellPriceOutput').value = provider.sellPriceOutput || '';
        document.getElementById('enabled').checked = provider.enabled !== false;

        document.getElementById('providerModal').classList.remove('d-none');
    }

    /**
     * 关闭模态框
     */
    function closeModal() {
        document.getElementById('providerModal').classList.add('d-none');
    }

    /**
     * 保存提供商
     */
    async function saveProvider() {
        const id = document.getElementById('providerId').value;
        const data = {
            name: document.getElementById('name').value,
            baseUrl: document.getElementById('baseUrl').value,
            serviceType: document.getElementById('serviceType').value,
            upstreamKey: document.getElementById('upstreamKey').value,
            timeoutSeconds: parseInt(document.getElementById('timeoutSeconds').value),
            buyPriceInput: parseFloat(document.getElementById('buyPriceInput').value) || null,
            sellPriceInput: parseFloat(document.getElementById('sellPriceInput').value) || null,
            buyPriceOutput: parseFloat(document.getElementById('buyPriceOutput').value) || null,
            sellPriceOutput: parseFloat(document.getElementById('sellPriceOutput').value) || null,
            enabled: document.getElementById('enabled').checked
        };

        try {
            const url = id ? '/api/admin/providers/' + id : '/api/admin/providers';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                closeModal();
                loadProviders();
                UI.showAlert('保存成功', 'success');
            } else {
                UI.showAlert('保存失败', 'error');
            }
        } catch (error) {
            console.error('保存失败:', error);
            UI.showAlert('保存失败：' + error.message, 'error');
        }
    }

    /**
     * 删除提供商
     */
    async function deleteProvider(id) {
        if (!confirm('确定要删除这个提供商吗？')) return;

        try {
            const response = await fetch('/api/admin/providers/' + id, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (response.ok) {
                loadProviders();
                UI.showAlert('删除成功', 'success');
            } else {
                UI.showAlert('删除失败', 'error');
            }
        } catch (error) {
            console.error('删除失败:', error);
            UI.showAlert('删除失败：' + error.message, 'error');
        }
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
     * 退出登录
     */
    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(function() { window.location.href = '/login'; })
            .catch(function() { window.location.href = '/login'; });
    };

    /**
     * 暴露全局函数
     */
    window.showCreateModal = showCreateModal;
    window.editProvider = editProvider;
    window.saveProvider = saveProvider;
    window.deleteProvider = deleteProvider;
    window.closeModal = closeModal;

    /**
     * 模态框点击遮罩关闭
     */
    const modal = document.getElementById('providerModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }
})();
