/**
 * LLM Gateway - Admin Keys Page
 * Session/Cookie 认证模式
 */
(function() {
    'use strict';

    let currentPage = 0;
    let topKeysChartInstance = null;
    let tokenTrendInstance = null;

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
        initCharts();
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
            const maskedKey = k.apiKeyValue ? (k.apiKeyValue.substring(0, 8) + '...' + k.apiKeyValue.substring(k.apiKeyValue.length - 4)) : '-';
            return '<tr>' +
                '<td>' + escapeHtml(k.name) + '</td>' +
                '<td title="' + escapeHtml(k.apiKeyValue || '') + '">' + maskedKey + '</td>' +
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

    // ===============================
    // 初始化图表 - Key 使用量排行榜 + Token 趋势图
    // ===============================
    function initCharts() {
        initTopKeysChart();
        initTokenTrendChart();
    }

    function initTopKeysChart() {
        const chartDom = document.getElementById('topKeysChart');
        if (!chartDom) return;

        topKeysChartInstance = echarts.init(chartDom, 'tech');

        // 模拟数据 - Top API Keys Token 消耗排名
        const topKeysData = [
            { name: 'Production Key', value: 234567 },
            { name: 'Dev Environment', value: 189012 },
            { name: 'Mobile App', value: 156789 },
            { name: 'Test Suite', value: 123456 },
            { name: 'Staging Key', value: 89012 }
        ];

        const option = {
            title: { text: 'Top 5 API Keys Token 消耗榜', left: 'center' },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            xAxis: {
                type: 'category',
                data: topKeysData.map(item => item.name),
                axisLabel: { color: '#a0aec0', interval: 0, rotate: 30 },
                axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } }
            },
            yAxis: {
                type: 'value',
                name: 'Token',
                axisLabel: { color: '#a0aec0' },
                splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.08)' } }
            },
            series: [{
                data: topKeysData.map(item => item.value),
                type: 'bar',
                barWidth: '60%',
                borderRadius: [4, 4, 0, 0],
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#00d4ff' },
                        { offset: 1, color: '#a855f7' }
                    ])
                }
            }]
        };

        topKeysChartInstance.setOption(option);

        window.addEventListener('resize', function() {
            topKeysChartInstance.resize();
        });
    }

    function initTokenTrendChart() {
        const chartDom = document.getElementById('tokenTrendChart');
        if (!chartDom) return;

        tokenTrendInstance = echarts.init(chartDom, 'tech');

        // 模拟数据 - 近 7 日 Token 消耗趋势 (所有 Keys 总和)
        const days = ['前 7 天', '前 6 天', '前 5 天', '前 4 天', '前 3 天', '前 2 天', '今天'];
        const values = [1200000, 1500000, 980000, 1800000, 2100000, 1650000, 2300000];

        const baseOption = {
            title: { text: '近 7 日 Token 消耗趋势 (总计)', left: 'center' },
            tooltip: { trigger: 'axis', formatter: function(params) {
                return params[0].name + ': ' + params[0].value.toLocaleString() + ' (' + (params[0].value / 1000000).toFixed(2) + 'M)';
            } },
            xAxis: { type: 'category', data: days },
            yAxis: {
                type: 'value',
                name: 'Token',
                axisLabel: {
                    formatter: function(value) { return (value / 1000000).toFixed(1) + 'M'; }
                }
            },
            series: [{
                name: 'Token 消耗',
                type: 'line',
                data: values,
                smooth: true
            }]
        };

        const option = window.TechChartTheme?.createLineChart ?
            window.TechChartTheme.createLineChart(baseOption) : baseOption;

        tokenTrendInstance.setOption(option);

        window.addEventListener('resize', function() {
            tokenTrendInstance.resize();
        });
    }

    // Close modal on overlay click
    const overlay = document.getElementById('editModal');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (topKeysChartInstance) topKeysChartInstance.dispose();
        if (tokenTrendInstance) tokenTrendInstance.dispose();
    });
})();
