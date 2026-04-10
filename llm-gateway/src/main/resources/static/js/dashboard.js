/**
 * LLM Gateway - Dashboard Page JavaScript (Enhanced Tech Theme)
 * Session/Cookie 认证模式 | Enhanced with multiple chart types
 */

(function() {
    'use strict';

    // ===============================
    // 全局状态与图表实例管理
    // ===============================
    let apiKeys = [];
    let currentUser = null;
    let currentUserRole = 'USER';
    const charts = {}; // Store all chart instances for cleanup and resize

    // Mock data generator for demo purposes (replace with real API calls)
    const mockData = {
        revenue: { today: 1256.80, month: 45678.90, change: 12 },
        subscriptionRatio: [{ name: '订阅收入', value: 65 }, { name: '按量收入', value: 35 }],
        tokens: { today: 2456789, month: 78945612, change: 5 },
        requests: { total: 15234, avgTokensPerReq: 161 },
        qps: { current: 12, peak: 85 },
        users: { newToday: 23, new7Day: 156, dau: 1234, mau: 8901 },
        retention: { d1: 78.5, d7: 45.2, d30: 28.1 },
        system: { successRate: 99.2, errorRate: 0.8, avgLatency: 235, latencyP95: 890, load: 42 },
        realtime: { qps: [8, 12, 15, 11, 18, 14, 16, 12, 10, 14, 17, 13, 11, 15, 19, 14, 12, 16, 13, 11],
                   tokenRate: [1200, 1800, 2200, 1600, 2700, 2100, 2400, 1800, 1500, 2100, 2600, 1900, 1600, 2300, 2900, 2100, 1800, 2400, 1900, 1600],
                   concurrent: [45, 52, 58, 48, 67, 61, 65, 52, 47, 59, 68, 55, 50, 62, 71, 58, 53, 64, 56, 50] },
        models: { distribution: [{ name: '7B', value: 450 }, { name: '13B', value: 320 }, { name: '70B', value: 180 }],
                     tokenUsage: [{ name: '7B', value: 1234567 }, { name: '13B', value: 890123 }, { name: '70B', value: 456789 }],
                     latency: [{ name: '7B', value: 120 }, { name: '13B', value: 280 }, { name: '70B', value: 650 }] },
        resources: { gpuUsage: 68, memoryUsage: 72, kvCache: 45, queueLength: 3 },
        usersAnalytics: { topUsers: [{ name: 'user_001', value: 456789 }, { name: 'user_002', value: 345678 },
                                    { name: 'user_003', value: 234567 }, { name: 'user_004', value: 123456 },
                                    { name: 'user_005', value: 98765 }, { name: 'user_006', value: 87654 },
                                    { name: 'user_007', value: 76543 }, { name: 'user_008', value: 65432 },
                                    { name: 'user_009', value: 54321 }, { name: 'user_010', value: 43210 }],
                           userType: [{ name: '企业用户', value: 78 }, { name: '个人用户', value: 22 }],
                           longTail: [{ name: '<1k tokens', value: 650 }, { name: '1k-10k', value: 230 },
                                     { name: '10k-100k', value: 85 }, { name: '>100k', value: 35 }],
                           sessionLength: [{ name: '<100', value: 450 }, { name: '100-500', value: 320 },
                                          { name: '500-1k', value: 180 }, { name: '>1k', value: 50 }],
                           longContext: [{ name: '<32k', value: 75 }, { name: '32k-128k', value: 20 }, { name: '>128k', value: 5 }],
                           requestType: [{ name: '短文本', value: 450 }, { name: '长文本', value: 280 }, { name: '流式', value: 170 }] },
        heatmapData: [
            [0, 0, 15], [0, 1, 20], [0, 2, 45], [0, 3, 65], [0, 4, 85], [0, 5, 95], [0, 6, 75],
            [1, 0, 12], [1, 1, 18], [1, 2, 42], [1, 3, 62], [1, 4, 82], [1, 5, 92], [1, 6, 72],
            [2, 0, 10], [2, 1, 15], [2, 2, 38], [2, 3, 58], [2, 4, 78], [2, 5, 88], [2, 6, 68]
        ],
        tokenTrend: [1234567, 1345678, 1456789, 1567890, 1678901, 1789012, 2456789]
    };

    // ===============================
    // 初始化入口函数
    // ===============================
    document.addEventListener('DOMContentLoaded', async function() {
        if (!await checkAuthentication()) {
            window.location.href = '/login';
            return;
        }
        await initUserInfo();
        cacheElements();
        initUIBasedOnRole();
        initEventListeners();
        loadAllData();
    });

    // ===============================
    // 认证与用户信息
    // ===============================
    async function checkAuthentication() {
        const user = await API.getCurrentUser();
        if (!user) return false;
        currentUser = user;
        currentUserRole = (user.role || 'USER').toUpperCase();
        return true;
    }

    async function initUserInfo() {
        const usernameEl = document.getElementById('sidebarUsername');
        const avatarEl = document.getElementById('sidebarUserAvatar');
        if (currentUser && currentUser.username) {
            usernameEl && (usernameEl.textContent = currentUser.username);
            avatarEl && (avatarEl.textContent = currentUser.username.substring(0, 1).toUpperCase());
        }
    }

    // ===============================
    // DOM 元素缓存
    // ===============================
    const elements = {};
    function cacheElements() {
        elements.apiKeyName = document.getElementById('apiKeyName');
        elements.tokenLimit = document.getElementById('tokenLimit');
        elements.expiresAtDays = document.getElementById('expiresAtDays');
        elements.apiKeyTableBody = document.getElementById('apiKeyTableBody');
        elements.apiKeyLoading = document.getElementById('apiKeyLoading');
        elements.apiKeyListContainer = document.getElementById('apiKeyListContainer');
        elements.apiKeyListSubtext = document.getElementById('apiKeyListSubtext');
        elements.createApiKeyCard = document.getElementById('createApiKeyCard');
    }

    function initUIBasedOnRole() {
        if (currentUserRole === 'ADMIN') {
            elements.apiKeyListSubtext && (elements.apiKeyListSubtext.textContent = '(管理员可见所有 API Key)');
        } else {
            elements.createApiKeyCard && (elements.createApiKeyCard.style.display = 'none');
            elements.apiKeyListSubtext && (elements.apiKeyListSubtext.textContent = '(仅显示自己的 API Key)');
        }
    }

    function initEventListeners() {
        const createBtn = elements.createApiKeyCard?.querySelector('button[type="button"]');
        if (createBtn) createBtn.addEventListener('click', createApiKey);
        if (elements.apiKeyName) {
            elements.apiKeyName.addEventListener('keypress', e => e.key === 'Enter' && createApiKey());
        }
    }

    // ===============================
    // 加载所有数据（模拟 + API）
    // ===============================
    async function loadAllData() {
        try {
            // Load API Keys
            const keys = await API.get('/admin/apikeys');
            apiKeys = Array.isArray(keys) ? keys : [];
            renderApiKeys();

            // Load usage stats from API or use mock data
            let stats;
            try {
                stats = await API.get('/user/stats');
            } catch (e) {
                console.log('Using mock data for demo');
                stats = null;
            }

            // Combine with mock data if needed
            const combinedData = mergeWithMockData(stats || {});

            // Store combined data for lazy initialization
            window.dashboardCombinedData = combinedData;

            // Initialize overview tab first (default active)
            renderOverviewTab(combinedData);
            chartsInitialized.overview = true;
        } catch (e) {
            console.error('加载数据失败', e);
            UI.showErrorMessage('数据加载失败：' + e.message);
        }
    }

    function mergeWithMockData(apiStats) {
        return {
            ...mockData,
            revenue: { ...mockData.revenue, ...(apiStats.revenue || {}) },
            tokens: { ...mockData.tokens, today: apiStats.todayTokens || mockData.tokens.today },
            requests: { ...mockData.requests, total: apiStats.totalRequests || mockData.requests.total }
        };
    }

    // ===============================
    // 渲染总览概览标签页
    // ===============================
    function renderOverviewTab(data) {
        // Revenue Metrics
        setText('todayRevenue', '¥' + data.revenue.today.toFixed(2));
        setSubtext('todayRevenueChange', `较昨日 +${data.revenue.change}%`);
        setText('monthRevenue', '¥' + data.revenue.month.toFixed(2));
        setSubtext('monthRevenueProgress', '目标进度 45%');
        setText('arpuValue', '¥' + ((data.revenue.month / 1234).toFixed(2)));

        // Revenue Type Chart (mini pie)
        initChart('revenueTypeChart', {
            series: [{ type: 'pie', radius: ['0%', '55%'], center: ['45%', '50%'],
                      data: data.subscriptionRatio,
                      itemStyle: { borderRadius: 3, borderColor: '#151942', borderWidth: 2 },
                      label: { show: false, position: 'center' },
                      emphasis: { scale: 1.05 } }]
        });

        // Usage Metrics
        setText('todayTokens', UI.formatNumber(data.tokens.today));
        setSubtext('todayTokenChange', `较昨日 +${data.tokens.change}%`);
        setText('totalRequests', UI.formatNumber(data.requests.total));
        setText('avgTokensPerRequest', data.requests.avgTokensPerReq.toFixed(0));

        // Peak QPS Gauge
        initGaugeChart('peakQpsGaugeChart', data.qps.peak, 100, '', 'QPS');

        // User Metrics
        setText('newUsersToday', data.users.newToday);
        setText('newUsers7Day', data.users.new7Day);
        setText('dauValue', data.users.dau);
        setText('mauValue', data.users.mau);

        // Retention Rate Chart (bar)
        initChart('retentionRateChart', {
            grid: { left: 10, right: 10, top: 20, bottom: 20 },
            xAxis: { type: 'category', data: ['D1', 'D7', 'D30'], show: false },
            yAxis: { show: false, max: 100 },
            series: [{ type: 'bar', data: [data.retention.d1, data.retention.d7, data.retention.d30],
                      itemStyle: { color: '#00d4ff', borderRadius: [3, 3, 0, 0] } }]
        });

        // Set retention text values
        setText('d1Retention', data.retention.d1 + '%');
        setText('d7Retention', data.retention.d7 + '%');
        setText('d30Retention', data.retention.d30 + '%');

        // DAU/MAU Ratio Gauge
        const dauMauRatio = (data.users.dau / data.users.mau * 100).toFixed(1);
        initGaugeChart('dauMauRatioGaugeChart', parseFloat(dauMauRatio), 100, '%');

        // System Health
        initGaugeChart('apiSuccessRateGaugeChart', data.system.successRate, 100, '%');
        setText('avgLatency', data.system.avgLatency + 'ms');
        setText('latencyP95', data.system.latencyP95 + 'ms');
        setText('errorRateValue', data.system.errorRate + '%');
        initGaugeChart('currentLoadGaugeChart', data.system.load, 100, '%');

        // Core Metrics Trend Chart (multi-yaxis line)
        initCoreMetricsTrendChart();

        // Token Distribution Bar Chart
        initChart('tokenDistributionChart', {
            title: { text: '7 日 Token 消耗对比', left: 'left' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: ['前 6 天', '前 5 天', '前 4 天', '前 3 天', '前 2 天', '前 1 天', '今日'] },
            yAxis: { type: 'value', name: 'Token' },
            series: [{ type: 'bar', data: mockData.tokenTrend, itemStyle: { color: '#00d4ff', borderRadius: [4, 4, 0, 0] } }]
        });

        // Provider Pie Chart
        initChart('providerPieChart', {
            tooltip: { trigger: 'item' },
            legend: { top: 'bottom', textStyle: { color: '#a0aec0' } },
            series: [{ type: 'pie', radius: ['45%', '75%'], center: ['50%', '50%'],
                      data: mockData.providerStats || [
                          { name: 'Ollama', value: 1234567 }, { name: 'vLLM', value: 890123 }, { name: 'OpenAI', value: 567890 }
                      ], itemStyle: { borderRadius: 6, borderColor: '#151942', borderWidth: 3 },
                      label: { show: true, color: '#a0aec0', formatter: '{b}: {d}%' } }]
        });
    }

    // ===============================
    // 渲染实时监控标签页
    // ===============================
    function renderRealtimeTab() {
        const realtimeData = mockData.realtime;

        setText('currentQps', realtimeData.qps[realtimeData.qps.length - 1]);
        setText('tokenRate', realtimeData.tokenRate[realtimeData.tokenRate.length - 1].toLocaleString());
        setText('concurrentRequests', realtimeData.concurrent[realtimeData.concurrent.length - 1]);
        setText('avgResponseTime', (mockData.system.avgLatency + 'ms'));

        // Real-time QPS Line Chart
        initChart('realtimeQpsChart', {
            title: { text: '实时请求速率', left: 'left' },
            tooltip: { trigger: 'axis', formatter: '{b}<br/><span style="color:#00d4ff">{c}</span> req/s' },
            xAxis: { type: 'category', data: Array.from({ length: 20 }, (_, i) => i + 1), boundaryGap: false },
            yAxis: { type: 'value', name: 'QPS', min: 0 },
            series: [{ type: 'line', smooth: true, showSymbol: false, data: realtimeData.qps,
                      lineStyle: { width: 2, color: '#00d4ff' },
                      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                          { offset: 0, color: 'rgba(0, 212, 255, 0.4)' }, { offset: 1, color: 'rgba(0, 212, 255, 0.05)' }
                      ]) }]
        });

        // Token Rate Chart
        initChart('tokenRateChart', {
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: Array.from({ length: 20 }, (_, i) => i + 1), boundaryGap: false, show: false },
            yAxis: { type: 'value', min: 0, show: false },
            series: [{ type: 'line', smooth: true, showSymbol: false, data: realtimeData.tokenRate,
                      lineStyle: { width: 2, color: '#a855f7' },
                      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                          { offset: 0, color: 'rgba(168, 85, 247, 0.3)' }, { offset: 1, color: 'rgba(168, 85, 247, 0.05)' }
                      ]) }]
        });

        // Concurrent Connections Chart
        initChart('concurrentConnectionsChart', {
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: Array.from({ length: 20 }, (_, i) => i + 1), boundaryGap: false, show: false },
            yAxis: { type: 'value', min: 0, show: false },
            series: [{ type: 'line', smooth: true, showSymbol: false, data: realtimeData.concurrent,
                      lineStyle: { width: 2, color: '#10b981' },
                      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                          { offset: 0, color: 'rgba(16, 185, 129, 0.3)' }, { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
                      ]) }]
        });

        // Model Distribution Pie Chart
        initChart('modelDistributionPieChart', {
            title: { text: '请求数量占比', left: 'center' },
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            series: [{ type: 'pie', radius: ['40%', '75%'], center: ['50%', '52%'],
                      data: mockData.models.distribution,
                      itemStyle: { borderRadius: 6, borderColor: '#151942', borderWidth: 3 },
                      label: { show: true, position: 'outside', color: '#a0aec0', formatter: '{b}\n{d}%' } }]
        });

        // Model Token Usage Bar Chart
        initChart('modelTokenUsageChart', {
            title: { text: 'Token 消耗对比', left: 'left' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: mockData.models.tokenUsage.map(d => d.name) },
            yAxis: { type: 'value', name: 'Tokens' },
            series: [{ type: 'bar', data: mockData.models.tokenUsage, itemStyle: { color: '#fbbf24', borderRadius: [4, 4, 0, 0] } }]
        });

        // Model Latency Bar Chart
        initChart('modelLatencyChart', {
            title: { text: '平均延迟对比', left: 'left' },
            tooltip: { trigger: 'axis', formatter: '{b}: {c}ms' },
            xAxis: { type: 'category', data: mockData.models.latency.map(d => d.name) },
            yAxis: { type: 'value', name: 'ms' },
            series: [{ type: 'bar', data: mockData.models.latency, itemStyle: { color: '#ec4899', borderRadius: [4, 4, 0, 0] } }]
        });

        // Resource Gauges
        initGaugeChart('gpuUsageGaugeChart', mockData.resources.gpuUsage, 100, '%');
        initGaugeChart('memoryUsageGaugeChart', mockData.resources.memoryUsage, 100, '%');
        initGaugeChart('kvCacheGaugeChart', mockData.resources.kvCache, 100, '%');
        initGaugeChart('queueLengthGaugeChart', mockData.resources.queueLength * 20, 100, '', 'items'); // Scale for visual effect
    }

    // ===============================
    // 渲染用户分析标签页
    // ===============================
    function renderAnalyticsTab() {
        const data = mockData.usersAnalytics;

        // Top Users Horizontal Bar Chart
        initChart('topUsersChart', {
            title: { text: 'Token 消耗排名（前 10）', left: 'left' },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'value', show: false },
            yAxis: { type: 'category', data: data.topUsers.slice(0, 10).reverse().map(d => d.name),
                    axisLabel: { color: '#a0aec0' } },
            series: [{ type: 'bar', data: data.topUsers.slice(0, 10).reverse(),
                      itemStyle: { color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                          { offset: 0, color: '#ff0066' }, { offset: 1, color: '#a855f7' }
                      ]), borderRadius: [0, 4, 4, 0] },
                      label: { show: true, position: 'right', formatter: '{c}', color: '#e8ecf1' } }]
        });

        // User Type Pie Chart
        initChart('userTypePieChart', {
            title: { text: '用户类型分布', left: 'center' },
            tooltip: { trigger: 'item' },
            series: [{ type: 'pie', radius: ['45%', '75%'], center: ['50%', '50%'], data: data.userType,
                      itemStyle: { borderRadius: 6, borderColor: '#151942', borderWidth: 3 },
                      label: { show: true, color: '#a0aec0', formatter: '{b}: {d}%' } }]
        });

        // Long Tail Analysis Chart
        initChart('longTailUserChart', {
            title: { text: '长尾用户分布', left: 'left' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: data.longTail.map(d => d.name) },
            yAxis: { type: 'value', name: '用户数' },
            series: [{ type: 'bar', data: data.longTail, itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } }]
        });

        // Session Length Distribution
        initChart('sessionLengthChart', {
            title: { text: '会话长度分布', left: 'left' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: data.sessionLength.map(d => d.name) },
            yAxis: { type: 'value' },
            series: [{ type: 'bar', data: data.sessionLength, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } }]
        });

        // Long Context User Ratio Pie
        initChart('longContextUserChart', {
            title: { text: '上下文长度分布', left: 'center' },
            tooltip: { trigger: 'item' },
            series: [{ type: 'pie', radius: ['45%', '75%'], center: ['50%', '50%'], data: data.longContext,
                      itemStyle: { borderRadius: 6, borderColor: '#151942', borderWidth: 3 },
                      label: { show: true, color: '#a0aec0', formatter: '{b}: {d}%' } }]
        });

        // Request Type Distribution
        initChart('requestTypeChart', {
            title: { text: '请求类型分布', left: 'center' },
            tooltip: { trigger: 'item' },
            series: [{ type: 'pie', radius: ['30%', '65%'], center: ['50%', '52%'], data: data.requestType,
                      itemStyle: { borderRadius: 4, borderColor: '#151942', borderWidth: 2 },
                      label: { show: true, color: '#a0aec0' } }]
        });

        // Usage Heatmap Chart
        initHeatmapChart('usageHeatmapChart');
    }

    // ===============================
    // 热力图（小时级使用时段）
    // ===============================
    function initHeatmapChart(domId) {
        const dom = document.getElementById(domId);
        if (!dom) return;

        const chart = echarts.init(dom, 'tech');
        charts[domId] = chart;

        const hours = Array.from({ length: 24 }, (_, i) => i + ':00');
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

        // Generate heatmap data
        const data = [];
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 24; j++) {
                // Simulate usage pattern: peak at work hours, lower at night
                let value = Math.random() * 30;
                if (j >= 9 && j <= 18) value += 50 + Math.random() * 30;
                if (i >= 1 && i <= 5) value *= 1.5; // Weekdays higher

                data.push([j, i, Math.round(value)]);
            }
        }

        const option = {
            tooltip: { position: 'top', formatter: '{c}%' },
            grid: { height: '70%', top: '10%' },
            xAxis: { type: 'category', data: hours, splitArea: { show: true } },
            yAxis: { type: 'category', data: days, splitArea: { show: true }, inverse: true },
            visualMap: {
                min: 0, max: 100, orient: 'horizontal', left: 'center', bottom: '5%',
                textStyle: { color: '#a0aec0' },
                inRange: { color: [
                    'rgba(15, 20, 60, 0.3)',
                    'rgba(0, 212, 255, 0.3)',
                    'rgba(0, 212, 255, 0.5)',
                    'rgba(0, 212, 255, 0.7)',
                    'rgba(0, 212, 255, 0.9)'
                ]}
            },
            series: [{
                type: 'heatmap', data: data, itemStyle: { borderRadius: 2, borderColor: '#151942', borderWidth: 0.5 },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 212, 255, 0.5)' } }
            }]
        };

        chart.setOption(option);
    }

    // ===============================
    // 核心指标趋势图（多 Y 轴）
    // ===============================
    function initCoreMetricsTrendChart() {
        const dom = document.getElementById('coreMetricsTrendChart');
        if (!dom) return;

        const chart = echarts.init(dom, 'tech');
        charts['coreMetricsTrendChart'] = chart;

        const days = ['前 6 天', '前 5 天', '前 4 天', '前 3 天', '前 2 天', '前 1 天', '今日'];
        const tokenData = [1200000, 1350000, 1280000, 1420000, 1380000, 1500000, 2456789];
        const requestData = [850, 920, 880, 960, 940, 1000, 1523];
        const latencyData = [220, 235, 228, 245, 238, 242, 235];

        const option = {
            tooltip: { trigger: 'axis', axisPointer: { type: 'crosshair' } },
            legend: { data: ['Token 消耗', '请求数', '平均延迟'], textStyle: { color: '#a0aec0' }, top: 10 },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
            xAxis: { type: 'category', boundaryGap: false, data: days },
            yAxis: [
                { type: 'value', name: 'Token', position: 'left', axisLine: { lineStyle: { color: '#00d4ff' } }, splitArea: { show: true } },
                { type: 'value', name: '请求数', position: 'right', axisLine: { lineStyle: { color: '#a855f7' } }, splitLine: { show: false } },
                { type: 'value', name: '延迟 (ms)', position: 'right', offset: 60, axisLine: { lineStyle: { color: '#10b981' } }, splitLine: { show: false } }
            ],
            series: [
                { name: 'Token 消耗', type: 'line', smooth: true, data: tokenData, yAxisIndex: 0,
                  lineStyle: { width: 3, color: '#00d4ff' },
                  areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: 'rgba(0, 212, 255, 0.3)' }, { offset: 1, color: 'rgba(0, 212, 255, 0.05)' }
                  ]) } },
                { name: '请求数', type: 'line', smooth: true, data: requestData, yAxisIndex: 1,
                  lineStyle: { width: 3, color: '#a855f7' } },
                { name: '平均延迟', type: 'line', smooth: true, data: latencyData, yAxisIndex: 2,
                  lineStyle: { width: 3, color: '#10b981' } }
            ]
        };

        chart.setOption(option);
    }

    // ===============================
    // 通用图表初始化函数
    // ===============================
    function initChart(domId, option) {
        const dom = document.getElementById(domId);
        if (!dom) return;

        const existingChart = charts[domId];
        if (existingChart) {
            existingChart.dispose();
        }

        const chart = echarts.init(dom, 'tech');
        charts[domId] = chart;
        chart.setOption(option);
    }

    function initGaugeChart(domId, value, max, unit, suffix) {
        const dom = document.getElementById(domId);
        if (!dom) return;

        const existingChart = charts[domId];
        if (existingChart) {
            existingChart.dispose();
        }

        const chart = echarts.init(dom, 'tech');
        charts[domId] = chart;

        const gaugeOption = window.TechChartTheme?.createGauge ?
            window.TechChartTheme.createGauge(value, '', suffix || unit, max) : {
                series: [{ type: 'gauge', data: [{ value }] }]
            };

        if (unit && !suffix && gaugeOption.series[0]) {
            gaugeOption.series[0].detail = gaugeOption.series[0].detail || {};
            gaugeOption.series[0].detail.formatter = '{value}' + unit;
        }

        chart.setOption(gaugeOption);
    }

    // ===============================
    // API Key 管理相关函数（保留原有逻辑）
    // ===============================
    async function loadApiKeys() {
        if (elements.apiKeyLoading) elements.apiKeyLoading.classList.remove('d-none');
        if (elements.apiKeyListContainer) elements.apiKeyListContainer.classList.add('d-none');

        try {
            const keys = await API.get('/admin/apikeys');
            apiKeys = Array.isArray(keys) ? keys : [];
            renderApiKeys();
            if (elements.apiKeyListContainer) elements.apiKeyListContainer.classList.remove('d-none');
        } catch (e) {
            console.error('加载 API Keys 失败', e);
            UI.showErrorMessage('加载失败：' + e.message);
        } finally {
            if (elements.apiKeyLoading) elements.apiKeyLoading.classList.add('d-none');
        }
    }

    function renderApiKeys() {
        if (!elements.apiKeyTableBody) return;

        if (apiKeys.length === 0) {
            elements.apiKeyTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;padding:40px;">暂无 API Key</td></tr>';
            return;
        }

        elements.apiKeyTableBody.innerHTML = apiKeys.map(function(k) {
            const statusBadge = k.enabled ? '<span class="badge-success">启用</span>' : '<span class="badge-danger">禁用</span>';
            const expiresText = k.expiresAt ? formatDate(k.expiresAt) : '永不过期';
            const quotaText = k.tokenLimit != null ? UI.formatNumber(k.tokenLimit) : '无限';

            return '<tr>' +
                '<td>' + escapeHtml(k.name) + '</td>' +
                '<td title="' + escapeHtml(k.apiKeyValue || '') + '">' + maskKey(k.apiKeyValue) + '</td>' +
                '<td>' + quotaText + '</td>' +
                '<td>' + UI.formatNumber(k.usedTokens || 0) + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + expiresText + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm btn-primary" onclick="copyApiKey(\'' + escapeAttr(k.apiKeyValue) + '\')">复制</button>' +
                    (currentUserRole === 'ADMIN' ? '<button class="btn btn-sm btn-danger" style="margin-left:6px;" onclick="deleteApiKey(' + k.id + ')">删除</button>' : '') +
                '</td></tr>';
        }).join('');
    }

    async function createApiKey() {
        const name = elements.apiKeyName ? elements.apiKeyName.value.trim() : '';
        const tokenLimit = elements.tokenLimit ? elements.tokenLimit.value : '';
        const expiresAtDays = elements.expiresAtDays ? elements.expiresAtDays.value : '';

        if (!name) {
            UI.showErrorMessage('请输入 API Key 名称');
            if (elements.apiKeyName) elements.apiKeyName.focus();
            return;
        }

        const payload = { name: name };
        if (tokenLimit !== '' && parseInt(tokenLimit) > 0) payload.tokenLimit = parseInt(tokenLimit);
        if (expiresAtDays !== '' && parseInt(expiresAtDays) > 0) payload.expiresAtDays = parseInt(expiresAtDays);

        try {
            const res = await API.post('/admin/apikeys', payload);
            UI.showSuccessMessage('创建成功！Key: ' + res.key);
            if (elements.apiKeyName) elements.apiKeyName.value = '';
            if (elements.tokenLimit) elements.tokenLimit.value = '';
            if (elements.expiresAtDays) elements.expiresAtDays.value = '';
            loadApiKeys();
        } catch (e) {
            UI.showErrorMessage('创建失败：' + e.message);
        }
    }

    async function deleteApiKey(id) {
        if (!confirm('确定要删除该 API Key 吗？此操作不可恢复。')) return;
        try {
            await API.delete('/admin/apikeys/' + id);
            UI.showSuccessMessage('删除成功');
            loadApiKeys();
        } catch (e) {
            UI.showErrorMessage('删除失败：' + e.message);
        }
    }

    // ===============================
    // 工具函数
    // ===============================
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function setSubtext(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = text;
    }

    window.copyApiKey = function(key) {
        if (!key) { UI.showErrorMessage('Key 为空'); return; }
        navigator.clipboard.writeText(key)
            .then(() => UI.showSuccessMessage('已复制到剪贴板'))
            .catch(() => UI.showErrorMessage('复制失败，请手动复制'));
    };

    window.checkTokenUsage = async function() {
        const apiKey = document.getElementById('clientApiKey')?.value.trim() || '';
        if (!apiKey) { UI.showErrorMessage('请输入 API Key'); return; }

        try {
            const data = await API.get('/clients/token-usage', { headers: { 'X-API-Key': apiKey } });
            const resultDiv = document.getElementById('tokenUsageResult');
            if (resultDiv) {
                resultDiv.style.display = 'block';
                document.getElementById('usageKeyName').textContent = data.name || '-';
                document.getElementById('usageTotal').textContent = data.tokenLimit != null ? UI.formatNumber(data.tokenLimit) : '无限';
                document.getElementById('usageUsed').textContent = UI.formatNumber(data.usedTokens || 0);
                document.getElementById('usageRemaining').textContent = data.tokenLimit != null
                    ? UI.formatNumber(data.tokenLimit - (data.usedTokens || 0))
                    : '无限';
            }
        } catch (e) {
            UI.showErrorMessage('查询失败：' + e.message);
        }
    };

    // Charts initialized flag tracking
    const chartsInitialized = {
        overview: false,
        realtime: false,
        analytics: false
    };

    // Tab switch function exposed globally
    window.switchTab = function(tabId) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        const activeTabBtn = Array.from(document.querySelectorAll('.tab')).find(b => b.onclick && b.onclick.toString().includes(tabId));
        const activeContent = document.getElementById(tabId);

        if (activeTabBtn) {
            activeTabBtn.classList.add('active');
            // Update URL hash without scrolling
            history.pushState(null, null, '#' + tabId);
        }
        if (activeContent) activeContent.classList.add('active');

        // Lazy initialize charts when tab is first activated
        if (!chartsInitialized[tabId]) {
            initChartsForTab(tabId);
            chartsInitialized[tabId] = true;
        }
    };

    // Initialize charts for specific tab
    function initChartsForTab(tabId) {
        const data = mergeWithMockData({});
        if (tabId === 'realtime') {
            renderRealtimeTab();
        } else if (tabId === 'analytics') {
            renderAnalyticsTab();
        } else if (tabId === 'overview') {
            renderOverviewTab(data);
        }
    }

    // Auto-switch to tab from URL hash on page load
    function switchTabFromHash() {
        const hash = window.location.hash.slice(1) || 'overview';
        const targetContent = document.getElementById(hash);
        if (targetContent) {
            switchTab(hash);
        }
    }

    // Initialize tab from URL hash after DOM loads
    setTimeout(switchTabFromHash, 100);

    function maskKey(key) {
        if (!key || key.length < 10) return key;
        return key.substring(0, 8) + '...' + key.substring(key.length - 4);
    }

    function formatDate(isoStr) {
        if (!isoStr) return '-';
        const d = new Date(isoStr);
        return d.toLocaleDateString('zh-CN');
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => window.location.href = '/login')
            .catch(() => window.location.href = '/login');
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        Object.values(charts).forEach(chart => chart.dispose());
    });

    // Resize handler for all charts
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            Object.values(charts).forEach(chart => chart.resize());
        }, 150);
    });
})();
