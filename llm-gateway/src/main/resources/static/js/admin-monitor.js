/**
 * LLM Gateway - Admin Monitor Page
 */
(function() {
    'use strict';

    var refreshTimer = null;

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

        var userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.innerHTML =
                '<span class="user-name">' + escapeHtml(user.username) + '</span>' +
                '<a href="#" onclick="logout()" class="logout-btn">退出登录</a>';
        }

        loadMonitor();
        refreshTimer = setInterval(loadMonitor, 30000);
    });

    async function loadMonitor() {
        try {
            var data = await API.get('/admin/monitor');
            setText('totalRequests', UI.formatNumber(data.totalRequests || 0));
            setText('totalTokens', UI.formatNumber(data.totalTokens || 0));
            setText('errorRate', (data.errorRate || 0).toFixed(1) + '%');
            setText('avgLatency', Math.round(data.avgLatencyMs || 0));
            setText('totalUsers', data.totalUsers || 0);
            setText('totalApiKeys', data.totalApiKeys || 0);
            setText('successRequests', UI.formatNumber(data.successRequests || 0));
            setText('failRequests', UI.formatNumber(data.failRequests || 0));
        } catch (e) {
            console.error('加载监控数据失败', e);
        }
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    window.logout = function() {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };
})();
