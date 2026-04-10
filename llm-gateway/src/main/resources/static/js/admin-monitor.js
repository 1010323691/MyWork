/**
 * LLM Gateway - Admin Monitor Page
 */
(function() {
    'use strict';

    const charts = {};
    const MAX_DATA_POINTS = 60;
    const MULTI_GPU_CHART_HEIGHT = 64;

    let refreshTimer = null;
    let qpsData = Array.from({ length: 20 }, () => randomRange(5, 20));
    let renderedGpuKeys = [];

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        const user = await API.getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            UI.showErrorMessage('需要管理员权限');
            setTimeout(() => window.location.href = '/dashboard', 1500);
            return;
        }

        initCharts();
        await loadMonitorData();
        refreshTimer = setInterval(loadMonitorData, 1000);
    });

    function initCharts() {
        const realtimeData = getMockRealtimeData();

        setText('currentQps', realtimeData.qps[realtimeData.qps.length - 1]);
        setText('tokenRate', realtimeData.tokenRate[realtimeData.tokenRate.length - 1].toLocaleString());
        setText('concurrentRequests', realtimeData.concurrent[realtimeData.concurrent.length - 1]);
        setText('avgResponseTime', realtimeData.avgLatency + 'ms');

        initChart('realtimeQpsChart', {
            title: { text: '实时请求速率', left: 'left', textStyle: { color: '#e8ecf1' } },
            tooltip: { trigger: 'axis', formatter: '{b}<br/><span style="color:#00d4ff">{c}</span> req/s' },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: buildRecentTimestamps(20),
                axisLine: { lineStyle: { color: '#4a5568' } },
                axisLabel: { color: '#a0aec0' }
            },
            yAxis: {
                type: 'value',
                name: 'QPS',
                min: 0,
                axisLine: { lineStyle: { color: '#4a5568' } },
                axisLabel: { color: '#a0aec0' },
                splitLine: { lineStyle: { color: '#2d3748' } }
            },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
            series: [{
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: realtimeData.qps,
                lineStyle: { width: 2, color: '#00d4ff' },
                areaStyle: {
                    color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(0, 212, 255, 0.4)' },
                        { offset: 1, color: 'rgba(0, 212, 255, 0.05)' }
                    ])
                }
            }]
        });

        initChart('tokenRateChart', {
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: Array.from({ length: 20 }, (_, i) => i + 1), boundaryGap: false, show: false },
            yAxis: { type: 'value', min: 0, show: false },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '5%' },
            series: [{
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: realtimeData.tokenRate,
                lineStyle: { width: 2, color: '#a855f7' },
                areaStyle: {
                    color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(168, 85, 247, 0.3)' },
                        { offset: 1, color: 'rgba(168, 85, 247, 0.05)' }
                    ])
                }
            }]
        });

        initChart('concurrentConnectionsChart', {
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: Array.from({ length: 20 }, (_, i) => i + 1), boundaryGap: false, show: false },
            yAxis: { type: 'value', min: 0, show: false },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '5%' },
            series: [{
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: realtimeData.concurrent,
                lineStyle: { width: 2, color: '#10b981' },
                areaStyle: {
                    color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                        { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
                    ])
                }
            }]
        });

        initChart('modelDistributionPieChart', {
            title: { text: '模型请求占比', left: 'center', textStyle: { color: '#e8ecf1' } },
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            series: [{
                type: 'pie',
                radius: ['40%', '75%'],
                center: ['50%', '52%'],
                data: realtimeData.models.distribution,
                itemStyle: { borderRadius: 6, borderColor: '#151942', borderWidth: 3 },
                label: { show: true, position: 'outside', color: '#a0aec0', formatter: '{b}\n{d}%' }
            }]
        });

        initChart('modelTokenUsageChart', {
            title: { text: '模型 Token 消耗', left: 'left', textStyle: { color: '#e8ecf1' } },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: realtimeData.models.tokenUsage.map(item => item.name), axisLabel: { color: '#a0aec0' } },
            yAxis: { type: 'value', name: 'Tokens', axisLabel: { color: '#a0aec0' }, splitLine: { lineStyle: { color: '#2d3748' } } },
            series: [{ type: 'bar', data: realtimeData.models.tokenUsage, itemStyle: { color: '#fbbf24', borderRadius: [4, 4, 0, 0] } }]
        });

        initChart('modelLatencyChart', {
            title: { text: '模型延迟', left: 'left', textStyle: { color: '#e8ecf1' } },
            tooltip: { trigger: 'axis', formatter: '{b}: {c}ms' },
            xAxis: { type: 'category', data: realtimeData.models.latency.map(item => item.name), axisLabel: { color: '#a0aec0' } },
            yAxis: { type: 'value', name: 'ms', axisLabel: { color: '#a0aec0' }, splitLine: { lineStyle: { color: '#2d3748' } } },
            series: [{ type: 'bar', data: realtimeData.models.latency, itemStyle: { color: '#ec4899', borderRadius: [4, 4, 0, 0] } }]
        });

        initLineChart('cpuUsageChart', 'CPU (%)', '#00d4ff');
        initLineChart('memoryUsageChart', 'Memory (%)', '#10b981');
    }

    async function loadMonitorData() {
        try {
            const data = await API.get('/admin/monitor');
            updateKpiCards(data);
            updateSystemResourceCharts(data);
        } catch (error) {
            console.error('Failed to load monitor data', error);
            updateWithMockData();
        }
    }

    function updateSystemResourceCharts(data) {
        if (isNumber(data.cpuUsage)) {
            updateLineChart('cpuUsageChart', data.cpuUsage);
        }

        if (isNumber(data.memoryUsage)) {
            updateLineChart('memoryUsageChart', data.memoryUsage);
        }

        updateGpuCharts(data.gpus || []);
    }

    function updateGpuCharts(gpus) {
        const normalizedGpus = normalizeGpus(gpus);

        if (normalizedGpus.length === 0) {
            hideSingleGpuCharts();
            clearMultiGpuCharts();
            return;
        }

        if (normalizedGpus.length === 1) {
            clearMultiGpuCharts();
            showSingleGpuCharts(normalizedGpus[0]);
            return;
        }

        hideSingleGpuCharts();
        renderMultiGpuCharts(normalizedGpus);
    }

    function showSingleGpuCharts(gpu) {
        const gpuUsageCard = document.getElementById('gpuUsageCard');
        const gpuMemoryCard = document.getElementById('gpuMemoryCard');
        const gpuTitle = document.getElementById('gpuChartTitle');

        if (gpuUsageCard) {
            gpuUsageCard.style.display = 'block';
        }
        if (gpuMemoryCard) {
            gpuMemoryCard.style.display = 'block';
        }
        if (gpuTitle) {
            gpuTitle.textContent = `${gpu.name || 'GPU'} 使用率`;
        }

        if (!charts.gpuUsageChart) {
            initLineChart('gpuUsageChart', 'GPU 使用率 (%)', '#f59e0b');
        }
        if (!charts.gpuMemoryChart) {
            initLineChart('gpuMemoryChart', 'GPU 显存 (%)', '#ef4444');
        }

        if (isNumber(gpu.utilization)) {
            updateLineChart('gpuUsageChart', gpu.utilization);
        }
        if (isNumber(gpu.memoryUsagePercent)) {
            updateLineChart('gpuMemoryChart', gpu.memoryUsagePercent);
        }
    }

    function hideSingleGpuCharts() {
        const gpuUsageCard = document.getElementById('gpuUsageCard');
        const gpuMemoryCard = document.getElementById('gpuMemoryCard');

        if (gpuUsageCard) {
            gpuUsageCard.style.display = 'none';
        }
        if (gpuMemoryCard) {
            gpuMemoryCard.style.display = 'none';
        }
    }

    function renderMultiGpuCharts(gpus) {
        const multiContainer = document.getElementById('multiGpuContainer');
        if (!multiContainer) {
            return;
        }

        multiContainer.style.cssText = [
            'display:flex',
            'flex-direction:row',
            'flex-wrap:nowrap',
            'gap:12px',
            'margin-bottom:0',
            'align-items:stretch'
        ].join(';');

        const gpuKeys = gpus.map(getGpuKey);
        removeStaleGpuRows(gpuKeys);

        gpus.forEach((gpu) => {
            const gpuKey = getGpuKey(gpu);
            let row = document.getElementById(`gpu-row-${gpuKey}`);

            if (!row) {
                row = createMultiGpuRow(gpu, gpuKey);
                multiContainer.appendChild(row);
                initCompactLineChart(`gpu-${gpuKey}-util`, `GPU ${gpu.index} 使用率 (%)`, '#f59e0b');
                initCompactLineChart(`gpu-${gpuKey}-mem`, `GPU ${gpu.index} 显存 (%)`, '#ef4444');
            }

            const nameEl = row.querySelector('.gpu-compact-name');
            const metaEl = row.querySelector('.gpu-compact-meta');
            if (nameEl) {
                nameEl.textContent = gpu.name || `GPU ${gpu.index}`;
            }
            if (metaEl) {
                metaEl.textContent = buildGpuMeta(gpu);
            }

            if (isNumber(gpu.utilization)) {
                updateLineChart(`gpu-${gpuKey}-util`, gpu.utilization);
            }
            if (isNumber(gpu.memoryUsagePercent)) {
                updateLineChart(`gpu-${gpuKey}-mem`, gpu.memoryUsagePercent);
            }
        });

        renderedGpuKeys = gpuKeys;
    }

    function createMultiGpuRow(gpu, gpuKey) {
        const row = document.createElement('div');
        row.id = `gpu-row-${gpuKey}`;
        row.className = 'card gpu-compact-card';
        row.style.cssText = [
            'display:grid',
            'grid-template-columns:1fr',
            'grid-template-rows:auto auto',
            'gap:8px',
            'padding:12px 14px',
            'min-width:520px',
            'flex:0 0 520px',
            'align-items:stretch',
            'margin-bottom:0'
        ].join(';');

        row.innerHTML = `
            <div class="gpu-compact-header" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;min-width:0;margin-bottom:2px;">
                <div class="gpu-compact-name" style="color:var(--text-primary);font-weight:600;font-size:14px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${gpu.name || `GPU ${gpu.index}`}</div>
                <div class="gpu-compact-meta" style="color:var(--text-secondary);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${buildGpuMeta(gpu)}</div>
            </div>
            <div class="gpu-chart-stack" style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;min-width:0;">
                <div class="gpu-chart-panel" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:6px 8px;min-width:0;">
                    <div class="gpu-chart-subtitle" style="color:var(--text-secondary);font-size:12px;margin-bottom:2px;">使用率</div>
                    <div id="gpu-${gpuKey}-util" style="height: ${MULTI_GPU_CHART_HEIGHT}px;"></div>
                </div>
                <div class="gpu-chart-panel" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:6px 8px;min-width:0;">
                    <div class="gpu-chart-subtitle" style="color:var(--text-secondary);font-size:12px;margin-bottom:2px;">显存</div>
                    <div id="gpu-${gpuKey}-mem" style="height: ${MULTI_GPU_CHART_HEIGHT}px;"></div>
                </div>
            </div>
        `;

        return row;
    }

    function removeStaleGpuRows(activeGpuKeys) {
        renderedGpuKeys
            .filter(key => !activeGpuKeys.includes(key))
            .forEach(key => {
                const row = document.getElementById(`gpu-row-${key}`);
                if (row) {
                    row.remove();
                }
                disposeChart(`gpu-${key}-util`);
                disposeChart(`gpu-${key}-mem`);
            });
    }

    function clearMultiGpuCharts() {
        removeStaleGpuRows([]);
        renderedGpuKeys = [];
        const multiContainer = document.getElementById('multiGpuContainer');
        if (multiContainer) {
            multiContainer.innerHTML = '';
        }
    }

    function initLineChart(domId, label, color) {
        const dom = document.getElementById(domId);
        if (!dom) {
            return;
        }

        disposeChart(domId);

        const chart = window.echarts.init(dom, 'tech');
        charts[domId] = chart;
        chart.setOption(buildLineChartOption(label, color, false));
    }

    function initCompactLineChart(domId, label, color) {
        const dom = document.getElementById(domId);
        if (!dom) {
            return;
        }

        disposeChart(domId);

        const chart = window.echarts.init(dom, 'tech');
        charts[domId] = chart;
        chart.setOption(buildLineChartOption(label, color, true));
    }

    function buildLineChartOption(label, color, compact) {
        return {
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    if (!params || !params.length) {
                        return '';
                    }
                    const point = params[0];
                    const value = isNumber(point.value) ? Math.round(point.value * 10) / 10 : '-';
                    return `${point.name}<br/><span style="display:inline-block;width:10px;height:10px;background-color:${color};"></span> ${label}: ${value}%`;
                }
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: buildRecentTimestamps(MAX_DATA_POINTS),
                axisLine: { lineStyle: { color: '#4a5568' } },
                axisLabel: compact ? { show: false } : { color: '#a0aec0', interval: 'auto' }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 100,
                splitLine: compact ? { show: false } : { lineStyle: { color: '#2d3748' } },
                axisLabel: compact ? { show: false } : { color: '#a0aec0', formatter: '{value}%' }
            },
            grid: compact
                ? { left: '2%', right: '2%', bottom: '6%', top: '8%', containLabel: false }
                : { left: '5%', right: '5%', bottom: '5%', top: '10%' },
            series: [{
                name: label,
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: [],
                lineStyle: { width: compact ? 1.8 : 2, color: color },
                areaStyle: {
                    color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: hexToRgba(color, 0.35) },
                        { offset: 1, color: hexToRgba(color, 0.05) }
                    ])
                }
            }]
        };
    }

    function updateLineChart(domId, value) {
        const chart = charts[domId];
        if (!chart || !isNumber(value)) {
            return;
        }

        const option = chart.getOption();
        const seriesData = (option.series[0].data || []).slice();
        const xAxisData = (option.xAxis[0].data || []).slice();

        if (seriesData.length >= MAX_DATA_POINTS) {
            seriesData.shift();
            xAxisData.shift();
        }

        seriesData.push(round1(value));
        xAxisData.push(formatTimestamp(Date.now()));

        chart.setOption({
            xAxis: { data: xAxisData },
            series: [{ data: seriesData }]
        });
    }

    function updateKpiCards(data) {
        const avgLatency = getRealtimeValue(data, 'avgLatencyMs', () => randomRange(200, 300));
        const totalTokens = getRealtimeValue(data, 'totalTokens', () => 0);
        const failRequests = getRealtimeValue(data, 'failRequests', () => 0);
        const totalApiKeys = getRealtimeValue(data, 'totalApiKeys', () => 0);

        setText('avgResponseTime', Math.round(avgLatency) + 'ms');
        setText('tokenRate', Number(totalTokens).toLocaleString());
        setText('currentQps', failRequests);
        setText('concurrentRequests', totalApiKeys);

        updateQpsChart();
    }

    function getRealtimeValue(data, field, fallback) {
        const value = data ? data[field] : null;
        return value !== null && value !== undefined ? value : fallback();
    }

    function updateQpsChart() {
        const chart = charts.realtimeQpsChart;
        if (!chart) {
            return;
        }

        qpsData.shift();
        qpsData.push(round1(randomRange(8, 18)));

        chart.setOption({
            xAxis: { data: buildRecentTimestamps(20) },
            series: [{ data: qpsData }]
        });
    }

    function updateWithMockData() {
        setText('avgResponseTime', Math.round(randomRange(200, 300)) + 'ms');
        updateQpsChart();
    }

    function initChart(domId, option) {
        const dom = document.getElementById(domId);
        if (!dom) {
            return;
        }

        disposeChart(domId);

        const chart = window.echarts.init(dom, 'tech');
        charts[domId] = chart;
        chart.setOption(option);
    }

    function disposeChart(domId) {
        if (charts[domId]) {
            charts[domId].dispose();
            delete charts[domId];
        }
    }

    function normalizeGpus(gpus) {
        return (Array.isArray(gpus) ? gpus : [])
            .map((gpu) => {
                const memoryTotalMb = toNumber(gpu.memoryTotalMb);
                const memoryUsedMb = toNumber(gpu.memoryUsedMb);
                const memoryUsagePercent = isNumber(gpu.memoryUsagePercent)
                    ? round1(gpu.memoryUsagePercent)
                    : (memoryTotalMb > 0 && isNumber(memoryUsedMb) ? round1((memoryUsedMb / memoryTotalMb) * 100) : null);

                return {
                    index: gpu.index,
                    name: gpu.name || `GPU ${gpu.index}`,
                    utilization: toNumber(gpu.utilization),
                    memoryUsedMb: memoryUsedMb,
                    memoryTotalMb: memoryTotalMb,
                    memoryUsagePercent: memoryUsagePercent
                };
            })
            .filter(gpu => gpu.index !== null && gpu.index !== undefined);
    }

    function getGpuKey(gpu) {
        return String(gpu.index).replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    function buildGpuMeta(gpu) {
        const parts = [`GPU ${gpu.index}`];
        if (isNumber(gpu.utilization)) {
            parts.push(`使用率 ${round1(gpu.utilization)}%`);
        }
        if (isNumber(gpu.memoryUsedMb) && isNumber(gpu.memoryTotalMb) && gpu.memoryTotalMb > 0) {
            parts.push(`显存 ${gpu.memoryUsedMb}/${gpu.memoryTotalMb} MB`);
        }
        return parts.join(' | ');
    }

    function getMockRealtimeData() {
        return {
            qps: [8, 12, 15, 11, 18, 14, 16, 12, 10, 14, 17, 13, 11, 15, 19, 14, 12, 16, 13, 11],
            tokenRate: [1200, 1800, 2200, 1600, 2700, 2100, 2400, 1800, 1500, 2100, 2600, 1900, 1600, 2300, 2900, 2100, 1800, 2400, 1900, 1600],
            concurrent: [45, 52, 58, 48, 67, 61, 65, 52, 47, 59, 68, 55, 50, 62, 71, 58, 53, 64, 56, 50],
            avgLatency: Math.round(randomRange(150, 350)),
            models: {
                distribution: [
                    { name: 'Qwen-7B', value: 450 },
                    { name: 'Qwen-13B', value: 320 },
                    { name: 'Qwen-70B', value: 180 }
                ],
                tokenUsage: [
                    { name: 'Qwen-7B', value: 1234567 },
                    { name: 'Qwen-13B', value: 890123 },
                    { name: 'Qwen-70B', value: 456789 }
                ],
                latency: [
                    { name: 'Qwen-7B', value: 120 },
                    { name: 'Qwen-13B', value: 280 },
                    { name: 'Qwen-70B', value: 650 }
                ]
            }
        };
    }

    function buildRecentTimestamps(count) {
        return Array.from({ length: count }, (_, i) => formatTimestamp(Date.now() - (count - 1 - i) * 1000));
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return `${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    function round1(value) {
        return Math.round(Number(value) * 10) / 10;
    }

    function isNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function toNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const result = Number(value);
        return Number.isFinite(result) ? result : null;
    }

    window.addEventListener('beforeunload', function() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }
        Object.keys(charts).forEach(disposeChart);
    });

    let resizeTimeout = null;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            Object.values(charts).forEach(chart => chart.resize());
        }, 150);
    });
})();
