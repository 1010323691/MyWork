/**
 * LLM Gateway - Admin Providers Page
 * Session/Cookie authentication mode
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

    function renderProviders() {
        const tbody = document.getElementById('providersTableBody');
        if (!tbody) return;

        if (providers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#999;padding:40px;">暂无提供商</td></tr>';
            return;
        }

        tbody.innerHTML = providers.map(function(provider) {
            const failureCount = provider.failureCount || 0;

            return '<tr>' +
                '<td>' + provider.id + '</td>' +
                '<td>' + escapeHtml(provider.name) + '</td>' +
                '<td>' + escapeHtml(provider.baseUrl) + '</td>' +
                '<td title="' + escapeHtml(provider.supportedModels || '') + '">' + formatSupportedModels(provider.supportedModels) + '</td>' +
                '<td>' + escapeHtml(provider.serviceType || '-') + '</td>' +
                '<td>' + formatNumber(provider.sellPriceInput) + '</td>' +
                '<td>' + formatNumber(provider.sellPriceOutput) + '</td>' +
                '<td>' + failureCount + '</td>' +
                '<td>' + renderEnabledBadge(provider.enabled) + '</td>' +
                '<td>' + renderCircuitBadge(failureCount) + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm" onclick="editProvider(' + provider.id + ')">编辑</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="deleteProvider(' + provider.id + ')">删除</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    function showCreateModal() {
        document.getElementById('modalTitle').textContent = '新增提供商';
        document.getElementById('providerForm').reset();
        document.getElementById('providerId').value = '';
        document.getElementById('timeoutSeconds').value = 300;
        document.getElementById('enabled').checked = true;

        const serviceTypeDropdown = window.getDropdownInstance ? window.getDropdownInstance(document.getElementById('serviceType')) : null;
        if (serviceTypeDropdown && typeof serviceTypeDropdown.setValue === 'function') {
            serviceTypeDropdown.setValue('OLLAMA');
        }

        setToolsResult('');
        const modal = document.getElementById('providerModal');
        modal.classList.remove('d-none');
        modal.classList.add('show');
    }

    function editProvider(id) {
        const provider = providers.find(function(item) { return item.id === id; });
        if (!provider) return;

        document.getElementById('modalTitle').textContent = '编辑提供商';
        document.getElementById('providerId').value = provider.id;
        document.getElementById('name').value = provider.name || '';
        document.getElementById('baseUrl').value = provider.baseUrl || '';
        document.getElementById('supportedModels').value = normalizeSupportedModelsForEditor(provider.supportedModels);

        const serviceTypeDropdown = window.getDropdownInstance ? window.getDropdownInstance(document.getElementById('serviceType')) : null;
        if (serviceTypeDropdown && typeof serviceTypeDropdown.setValue === 'function') {
            serviceTypeDropdown.setValue(provider.serviceType || 'OLLAMA');
        }

        document.getElementById('upstreamKey').value = '';
        document.getElementById('timeoutSeconds').value = provider.timeoutSeconds || 300;
        document.getElementById('buyPriceInput').value = provider.buyPriceInput ?? '';
        document.getElementById('sellPriceInput').value = provider.sellPriceInput ?? '';
        document.getElementById('buyPriceOutput').value = provider.buyPriceOutput ?? '';
        document.getElementById('sellPriceOutput').value = provider.sellPriceOutput ?? '';
        document.getElementById('enabled').checked = provider.enabled !== false;
        setToolsResult('');
        const modal = document.getElementById('providerModal');
        modal.classList.remove('d-none');
        modal.classList.add('show');
    }

    function closeModal() {
        const modal = document.getElementById('providerModal');
        modal.classList.remove('show');
        modal.classList.add('d-none');
    }

    async function saveProvider() {
        const id = document.getElementById('providerId').value;
        const supportedModels = normalizeSupportedModelsForSubmit(document.getElementById('supportedModels').value);

        if (!document.getElementById('name').value.trim()) {
            UI.showAlert('请填写提供商名称', 'error');
            return;
        }
        if (!document.getElementById('baseUrl').value.trim()) {
            UI.showAlert('请填写基础 URL', 'error');
            return;
        }
        if (!supportedModels) {
            UI.showAlert('请至少填写一个模型名', 'error');
            return;
        }

        const data = buildProviderPayload();

        try {
            const url = id ? '/api/admin/providers/' + id : '/api/admin/providers';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            closeModal();
            await loadProviders();
            UI.showAlert('保存成功', 'success');
        } catch (error) {
            console.error('保存失败:', error);
            UI.showAlert('保存失败：' + error.message, 'error');
        }
    }

    async function testConnectivity() {
        const data = buildProviderPayload();
        if (!data.baseUrl) {
            UI.showAlert('请先填写基础 URL', 'error');
            return;
        }

        setToolsResult('正在测试连通性...');
        try {
            const response = await fetch('/api/admin/providers/test-connectivity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const result = await response.json();
            setToolsResult(formatTestResult(result), result.success ? 'success' : 'error');
        } catch (error) {
            console.error('测试连通性失败:', error);
            setToolsResult('测试连通性失败：' + error.message, 'error');
        }
    }

    async function discoverModels() {
        const data = buildProviderPayload();
        if (!data.baseUrl) {
            UI.showAlert('请先填写基础 URL', 'error');
            return;
        }

        setToolsResult('正在拉取上游模型列表...');
        try {
            const response = await fetch('/api/admin/providers/discover-models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const result = await response.json();
            if (result.success && Array.isArray(result.models) && result.models.length > 0) {
                document.getElementById('supportedModels').value = result.models.join('\n');
            }
            setToolsResult(formatDiscoveryResult(result), result.success ? 'success' : 'error');
        } catch (error) {
            console.error('拉取模型列表失败:', error);
            setToolsResult('拉取模型列表失败：' + error.message, 'error');
        }
    }

    async function deleteProvider(id) {
        if (!confirm('确定要删除这个提供商吗？')) return;

        try {
            const response = await fetch('/api/admin/providers/' + id, {
                method: 'DELETE',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            await loadProviders();
            UI.showAlert('删除成功', 'success');
        } catch (error) {
            console.error('删除失败:', error);
            UI.showAlert('删除失败：' + error.message, 'error');
        }
    }

    function buildProviderPayload() {
        return {
            name: document.getElementById('name').value.trim(),
            baseUrl: document.getElementById('baseUrl').value.trim(),
            supportedModels: normalizeSupportedModelsForSubmit(document.getElementById('supportedModels').value),
            serviceType: getDropdownValue('serviceType'),
            upstreamKey: document.getElementById('upstreamKey').value.trim(),
            timeoutSeconds: parseInt(document.getElementById('timeoutSeconds').value, 10) || 300,
            buyPriceInput: parseNullableNumber('buyPriceInput'),
            sellPriceInput: parseNullableNumber('sellPriceInput'),
            buyPriceOutput: parseNullableNumber('buyPriceOutput'),
            sellPriceOutput: parseNullableNumber('sellPriceOutput'),
            enabled: document.getElementById('enabled').checked
        };
    }

    function parseNullableNumber(id) {
        const raw = document.getElementById(id).value;
        if (raw === null || raw === undefined || raw === '') {
            return null;
        }
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
    }

    function normalizeSupportedModelsForSubmit(value) {
        return (value || '')
            .split(/[\n,]+/)
            .map(function(item) { return item.trim(); })
            .filter(function(item) { return item.length > 0; })
            .join(',');
    }

    function normalizeSupportedModelsForEditor(value) {
        return (value || '')
            .split(/[,\n]+/)
            .map(function(item) { return item.trim(); })
            .filter(function(item) { return item.length > 0; })
            .join('\n');
    }

    function renderEnabledBadge(enabled) {
        return enabled
            ? '<span class="badge badge-success">启用</span>'
            : '<span class="badge badge-danger">禁用</span>';
    }

    function renderCircuitBadge(failureCount) {
        if (failureCount >= 5) {
            return '<span class="badge badge-danger">熔断</span>';
        }
        if (failureCount >= 3) {
            return '<span class="badge badge-warning">警告</span>';
        }
        return '<span class="badge badge-success">正常</span>';
    }

    function formatSupportedModels(value) {
        const models = (value || '')
            .split(/[,\n]+/)
            .map(function(item) { return item.trim(); })
            .filter(function(item) { return item.length > 0; });

        if (models.length === 0) {
            return '-';
        }

        const display = models.slice(0, 3).map(escapeHtml).join('<br>');
        return models.length > 3 ? display + '<br>...' : display;
    }

    function formatNumber(value) {
        return value === null || value === undefined || value === '' ? '0' : String(value);
    }

    function formatTestResult(result) {
        const lines = [];
        lines.push(result.message || '测试完成');
        if (typeof result.statusCode === 'number') {
            lines.push('状态码：' + result.statusCode);
        }
        if (Array.isArray(result.traces) && result.traces.length > 0) {
            lines.push('探测记录：' + result.traces.join(' | '));
        }
        return lines.join('\n');
    }

    function formatDiscoveryResult(result) {
        const lines = [];
        lines.push(result.message || '拉取完成');
        if (Array.isArray(result.models) && result.models.length > 0) {
            lines.push('模型：' + result.models.join(', '));
        }
        if (Array.isArray(result.traces) && result.traces.length > 0) {
            lines.push('探测记录：' + result.traces.join(' | '));
        }
        return lines.join('\n');
    }

    function setToolsResult(message, status) {
        const el = document.getElementById('providerToolsResult');
        if (!el) return;
        el.textContent = message || '';
        el.style.whiteSpace = 'pre-wrap';
        if (status === 'success') {
            el.style.color = '#86efac';
        } else if (status === 'error') {
            el.style.color = '#fca5a5';
        } else {
            el.style.color = '#cbd5e1';
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(function() { window.location.href = '/login'; })
            .catch(function() { window.location.href = '/login'; });
    };

    window.showCreateModal = showCreateModal;
    window.editProvider = editProvider;
    window.saveProvider = saveProvider;
    window.deleteProvider = deleteProvider;
    window.closeModal = closeModal;
    window.testConnectivity = testConnectivity;
    window.discoverModels = discoverModels;
})();
