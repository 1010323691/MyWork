/**
 * LLM Gateway - Admin Users Page
 * Session/Cookie 认证模式
 */
(function() {
    'use strict';

    let currentSearch = '';
    let currentPage = 0;
    let roleChartInstance = null;
    let registerTrendInstance = null;

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
        loadUsers(0, '');
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

    async function loadUsers(page, username) {
        currentPage = page;
        const loading = document.getElementById('usersLoading');
        const container = document.getElementById('usersContainer');
        if (loading) loading.classList.remove('d-none');
        if (container) container.classList.add('d-none');

        const params = 'page=' + page + '&size=20';
        if (username) params += '&username=' + encodeURIComponent(username);

        try {
            const data = await API.get('/admin/users?' + params);
            renderTable(data.content || []);
            renderPagination(data.number || 0, data.totalPages || 0, data.totalElements || 0, username);
            if (container) container.classList.remove('d-none');
        } catch (e) {
            console.error('加载用户失败', e);
            UI.showErrorMessage('加载失败：' + e.message);
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

        tbody.innerHTML = users.map(function(u) {
            const statusBadge = u.enabled
                ? '<span class="badge-success">正常</span>'
                : '<span class="badge-danger">已禁用</span>';
            const roleBadge = u.userRole === 'ADMIN'
                ? '<span class="badge-secondary">ADMIN</span>'
                : '<span class="badge-default">USER</span>';
            const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleString('zh-CN') : '-';
            return '<tr>' +
                '<td>' + u.id + '</td>' +
                '<td>' + escapeHtml(u.username) + '</td>' +
                '<td>' + escapeHtml(u.email || '-') + '</td>' +
                '<td>' + roleBadge + '</td>' +
                '<td>' + createdAt + '</td>' +
                '<td>' + (u.apiKeyCount || 0) + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm btn-success" style="margin-right:6px;" onclick="toggleUser(' + u.id + ', ' + u.enabled + ')">' +
                        (u.enabled ? '禁用' : '启用') +
                    '</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="deleteUser(' + u.id + ')">删除</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    function renderPagination(page, total, totalElements, username) {
        const el = document.getElementById('usersPagination');
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

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

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

    window.toggleUser = async function(id, currentEnabled) {
        try {
            await API.put('/admin/users/' + id + '/toggle');
            UI.showSuccessMessage('操作成功');
            loadUsers(currentPage, currentSearch);
        } catch (e) {
            UI.showErrorMessage('操作失败：' + e.message);
        }
    };

    window.deleteUser = async function(id) {
        if (!confirm('确定要删除该用户吗？此操作将同时删除其所有 API Key，不可恢复。')) return;
        try {
            await API.delete('/admin/users/' + id);
            UI.showSuccessMessage('删除成功');
            loadUsers(currentPage, currentSearch);
        } catch (e) {
            UI.showErrorMessage('删除失败：' + e.message);
        }
    };

    // ===============================
    // 初始化图表 - 用户角色分布 + 注册趋势
    // ===============================
    function initCharts() {
        initRoleDistributionChart();
        initRegisterTrendChart();
    }

    function initRoleDistributionChart() {
        const chartDom = document.getElementById('roleDistributionChart');
        if (!chartDom) return;

        roleChartInstance = echarts.init(chartDom, 'tech');

        // 模拟数据 - 后端需返回真实统计
        const roleData = [
            { value: 85, name: 'USER', itemStyle: { color: '#00d4ff' } },
            { value: 15, name: 'ADMIN', itemStyle: { color: '#a855f7' } }
        ];

        const option = {
            title: { text: '用户角色分布', left: 'center', textStyle: { color: '#e8ecf1' } },
            tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
            legend: { top: 'bottom', textStyle: { color: '#a0aec0' } },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '55%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: '#151942',
                    borderWidth: 3
                },
                label: { show: false },
                emphasis: {
                    label: { show: true, fontSize: '16', fontWeight: 'bold' }
                },
                data: roleData
            }]
        };

        roleChartInstance.setOption(option);

        window.addEventListener('resize', function() {
            roleChartInstance.resize();
        });
    }

    function initRegisterTrendChart() {
        const chartDom = document.getElementById('registerTrendChart');
        if (!chartDom) return;

        registerTrendInstance = echarts.init(chartDom, 'tech');

        // 模拟数据 - 后端需返回近 7 日注册趋势
        const days = ['前 7 天', '前 6 天', '前 5 天', '前 4 天', '前 3 天', '前 2 天', '今天'];
        const values = [3, 5, 2, 8, 4, 6, 9];

        const baseOption = {
            title: { text: '近 7 日用户注册趋势', left: 'center' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: days },
            yAxis: { type: 'value', name: '用户数' },
            series: [{
                name: '新用户',
                type: 'line',
                data: values,
                smooth: true
            }]
        };

        const option = window.TechChartTheme?.createLineChart ?
            window.TechChartTheme.createLineChart(baseOption) : baseOption;

        registerTrendInstance.setOption(option);

        window.addEventListener('resize', function() {
            registerTrendInstance.resize();
        });
    }

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => window.location.href = '/login')
            .catch(() => window.location.href = '/login');
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (roleChartInstance) roleChartInstance.dispose();
        if (registerTrendInstance) registerTrendInstance.dispose();
    });
})();
