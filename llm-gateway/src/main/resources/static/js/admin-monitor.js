/**
 * LLM Gateway - Admin Monitor Page
 * Session/Cookie 认证模式
 */
(function() {
    'use strict';

    let refreshTimer = null;
    let chartInstance = null;

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
        loadMonitor();
        initChart();
        refreshTimer = setInterval(loadMonitor, 30000);
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

    async function loadMonitor() {
        try {
            const data = await API.get('/admin/monitor');
            setText('jvmMemory', formatMemory(data.jvmMemory));
            setText('heapMemory', formatMemory(data.heapMemory));
            setText('activeThreads', data.activeThreads || '--');
            setText('requestQueue', data.requestQueueSize || 0);
            setText('requestsPerSecond', (data.requestsPerSecond || 0).toFixed(1));
            setText('avgResponseTime', Math.round(data.avgLatencyMs || 0) + 'ms');
            setText('errorRate', (data.errorRate || 0).toFixed(1) + '%');
            setText('activeConnections', data.activeConnections || 0);
        } catch (e) {
            console.error('加载监控数据失败', e);
        }
    }

    function formatMemory(mem) {
        if (!mem) return '--';
        const parts = String(mem).split('/');
        if (parts.length === 2) {
            return parts[0].trim() + ' / ' + parts[1].trim();
        }
        return mem;
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function initChart() {
        const chartDom = document.getElementById('requestTrendChart');
        if (!chartDom) return;
        chartInstance = echarts.init(chartDom);
        const option = {
            title: { text: '请求趋势', left: 'center' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: [] },
            yAxis: { type: 'value', name: '请求数' },
            series: [{ name: '请求数', type: 'line', data: [], smooth: true }]
        };
        chartInstance.setOption(option);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => window.location.href = '/login')
            .catch(() => window.location.href = '/login');
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (refreshTimer) clearInterval(refreshTimer);
        if (chartInstance) chartInstance.dispose();
    });
})();
