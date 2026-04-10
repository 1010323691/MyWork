(function() {
    'use strict';

    const charts = {};
    let currentUser = null;

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        currentUser = await API.getCurrentUser();
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }

        initSidebarUserInfo(currentUser);
        await loadDashboard();
        bindResize();
    });

    async function loadDashboard() {
        try {
            const summary = await API.get('/dashboard/summary');
            renderSummary(summary || {});
        } catch (error) {
            console.error('Failed to load dashboard summary', error);
            UI.showErrorMessage('主控面板数据加载失败: ' + error.message);
        }
    }

    function renderSummary(summary) {
        const role = (summary.role || currentUser.role || 'USER').toUpperCase();
        const isAdmin = role === 'ADMIN';
        const revenue = summary.revenue || {};
        const usage = summary.usage || {};
        const audience = summary.audience || {};
        const quality = summary.quality || {};
        const resources = summary.resources || {};
        const dailyTrend = Array.isArray(summary.dailyTrend) ? summary.dailyTrend : [];
        const modelMetrics = Array.isArray(summary.modelMetrics) ? summary.modelMetrics : [];

        setText('dashboardScope', '数据范围：' + (isAdmin ? '全平台汇总' : '当前账号汇总'));
        setText('dashboardUpdatedAt', '更新时间：' + formatDateTime(new Date()));
        setText('dashboardSubtitle', isAdmin
            ? '聚合展示平台收入、调用、接入和系统状态，避免与实时监控和日志页功能重叠。'
            : '聚合展示当前账号的消费、调用、接入和请求质量，聚焦总览，不重复日志页细节。');

        setText('todayRevenue', formatMoney(revenue.todayRevenue));
        setText('monthRevenue', formatMoney(revenue.monthRevenue));
        setText('totalRevenue', formatMoney(revenue.totalRevenue));
        setText('avgCostPerRequest', formatMoney(revenue.avgCostPerRequest));
        setText('totalRevenueLabel', isAdmin ? '累计收入' : '累计消费');

        setText('todayTokens', formatNumber(usage.todayTokens));
        setText('monthTokens', formatNumber(usage.monthTokens));
        setText('todayRequests', formatNumber(usage.todayRequests));
        setText('avgTokensPerRequest', formatDecimal(usage.avgTokensPerRequest));

        setText('totalApiKeys', formatNumber(audience.totalApiKeys));
        setText('activeApiKeys', formatNumber(audience.activeApiKeys));
        setText('activeModelsText', '近 30 天模型数 ' + formatNumber(usage.activeModels30d));

        if (isAdmin) {
            setText('audienceSectionTitle', '用户指标');
            setText('audienceSectionSubtitle', '平台用户与接入规模');
            setText('totalUsers', formatNumber(audience.totalUsers));
            setText('newUsersToday', formatNumber(audience.newUsersToday));
            toggleElement('cardTotalUsers', true);
            toggleElement('cardNewUsersToday', true);
        } else {
            setText('audienceSectionTitle', '接入指标');
            setText('audienceSectionSubtitle', '当前账号的 API Key 与模型覆盖');
            toggleElement('cardTotalUsers', false);
            toggleElement('cardNewUsersToday', false);
        }

        setText('successRate', formatPercent(quality.successRate));
        setText('errorRate', formatPercent(quality.errorRate));
        setText('avgLatency', formatLatency(quality.avgLatencyMs));
        setText('p95Latency', formatLatency(quality.p95LatencyMs));

        const resourceHint = [
            'CPU ' + formatPercentValue(resources.cpuUsage),
            '内存 ' + formatPercentValue(resources.memoryUsage),
            'GPU ' + (resources.gpuCount || 0) + ' 张'
        ].join(' / ');
        setText('resourceHint', resourceHint);

        renderTrendChart(dailyTrend);
        renderModelRequestChart(modelMetrics);
        renderModelTokenChart(modelMetrics);
        renderDonutChart('requestStatusChart', summary.requestStatusDistribution || [], ['#00d4ff', '#ff6b6b']);
        renderDonutChart('apiKeyStatusChart', summary.apiKeyStatusDistribution || [], ['#10b981', '#64748b']);
    }

    function renderTrendChart(points) {
        const labels = points.map(item => item.date?.slice(5) || '');
        const requests = points.map(item => Number(item.requests || 0));
        const tokens = points.map(item => Number(item.tokens || 0));
        const revenues = points.map(item => Number(item.revenue || 0));

        initChart('coreTrendChart', {
            tooltip: { trigger: 'axis' },
            legend: {
                top: 8,
                textStyle: { color: '#a0aec0' },
                data: ['请求数', 'Token', '收入']
            },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '18%', containLabel: true },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: labels,
                axisLabel: { color: '#a0aec0' }
            },
            yAxis: [
                {
                    type: 'value',
                    name: '请求 / Token',
                    axisLabel: { color: '#a0aec0' },
                    splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } }
                },
                {
                    type: 'value',
                    name: '收入',
                    axisLabel: { color: '#a0aec0', formatter: value => '¥' + value },
                    splitLine: { show: false }
                }
            ],
            series: [
                {
                    name: '请求数',
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    data: requests,
                    lineStyle: { width: 3, color: '#00d4ff' },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(0, 212, 255, 0.30)' },
                            { offset: 1, color: 'rgba(0, 212, 255, 0.03)' }
                        ])
                    }
                },
                {
                    name: 'Token',
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    data: tokens,
                    lineStyle: { width: 3, color: '#f59e0b' }
                },
                {
                    name: '收入',
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    yAxisIndex: 1,
                    data: revenues,
                    lineStyle: { width: 3, color: '#10b981' }
                }
            ]
        });
    }

    function renderModelRequestChart(metrics) {
        const data = metrics.map(item => ({
            name: item.name || 'Unknown',
            value: Number(item.requests || 0)
        }));

        initChart('modelRequestChart', {
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            legend: { bottom: 0, textStyle: { color: '#a0aec0' } },
            series: [{
                type: 'pie',
                radius: ['42%', '72%'],
                center: ['50%', '45%'],
                data: data,
                itemStyle: { borderRadius: 8, borderColor: '#151942', borderWidth: 3 },
                label: { color: '#cbd5e1', formatter: '{b}' }
            }]
        });
    }

    function renderModelTokenChart(metrics) {
        const names = metrics.map(item => item.name || 'Unknown');
        const values = metrics.map(item => Number(item.tokens || 0));

        initChart('modelTokenChart', {
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
            xAxis: {
                type: 'category',
                data: names,
                axisLabel: { color: '#a0aec0', interval: 0, rotate: names.length > 4 ? 20 : 0 }
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: '#a0aec0' },
                splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } }
            },
            series: [{
                type: 'bar',
                data: values,
                barMaxWidth: 36,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#f59e0b' },
                        { offset: 1, color: '#fb7185' }
                    ]),
                    borderRadius: [8, 8, 0, 0]
                }
            }]
        });
    }

    function renderDonutChart(domId, items, colors) {
        const data = (Array.isArray(items) ? items : []).map(item => ({
            name: item.name,
            value: Number(item.value || 0)
        }));

        initChart(domId, {
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            color: colors,
            series: [{
                type: 'pie',
                radius: ['46%', '74%'],
                center: ['50%', '50%'],
                data: data,
                itemStyle: { borderRadius: 8, borderColor: '#151942', borderWidth: 3 },
                label: { color: '#cbd5e1', formatter: '{b}\n{d}%' }
            }]
        });
    }

    function initChart(domId, option) {
        const dom = document.getElementById(domId);
        if (!dom || !window.echarts) {
            return;
        }

        if (charts[domId]) {
            charts[domId].dispose();
        }

        const chart = window.echarts.init(dom, 'tech');
        charts[domId] = chart;
        chart.setOption(option);
    }

    function initSidebarUserInfo(user) {
        setText('sidebarUsername', user.username || '-');
        setText('sidebarUserAvatar', (user.username || 'U').substring(0, 1).toUpperCase());
    }

    function toggleElement(id, visible) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = visible ? '' : 'none';
        }
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    function formatNumber(value) {
        return UI.formatNumber(Number(value || 0));
    }

    function formatDecimal(value) {
        return Number(value || 0).toLocaleString('zh-CN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2
        });
    }

    function formatMoney(value) {
        return '¥' + Number(value || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatPercent(value) {
        return formatPercentValue(value);
    }

    function formatPercentValue(value) {
        return Number(value || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }) + '%';
    }

    function formatLatency(value) {
        return Math.round(Number(value || 0)) + ' ms';
    }

    function formatDateTime(date) {
        const resolved = date instanceof Date ? date : new Date(date);
        return resolved.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    function bindResize() {
        let timer = null;
        window.addEventListener('resize', function() {
            clearTimeout(timer);
            timer = setTimeout(function() {
                Object.values(charts).forEach(chart => chart.resize());
            }, 120);
        });
    }

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => window.location.href = '/login')
            .catch(() => window.location.href = '/login');
    };

    window.addEventListener('beforeunload', function() {
        Object.values(charts).forEach(chart => chart.dispose());
    });
})();
