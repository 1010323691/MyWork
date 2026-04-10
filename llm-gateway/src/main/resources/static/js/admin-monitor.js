/**
 * LLM Gateway - Admin Monitor Page
 */
(function() {
    'use strict';

    const charts = {};
    const chartSeriesHistory = {};
    const MAX_DATA_POINTS = 60;
    let refreshTimer = null;
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

        setText('currentQps', realtimeData.failRequests);
        setText('tokenRate', realtimeData.totalTokens.toLocaleString());
        setText('concurrentRequests', realtimeData.totalApiKeys);
        setText('avgResponseTime', realtimeData.avgLatency + 'ms');

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

        scheduleChartsResize();
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

        scheduleChartsResize();
    }

    function renderMultiGpuCharts(gpus) {
        const multiContainer = document.getElementById('multiGpuContainer');
        if (!multiContainer) {
            return;
        }

        const gpuKeys = gpus.map(getGpuKey);
        removeStaleGpuRows(gpuKeys);

        gpus.forEach((gpu) => {
            const gpuKey = getGpuKey(gpu);
            const utilId = `gpu-${gpuKey}-util`;
            const memId = `gpu-${gpuKey}-mem`;
            let row = document.getElementById(`gpu-row-${gpuKey}`);

            if (!row) {
                row = createMultiGpuRow(gpu, gpuKey);
                multiContainer.appendChild(row);
                requestAnimationFrame(() => {
                    if (!charts[utilId]) {
                        initCompactLineChart(utilId, `GPU ${gpu.index} 使用率 (%)`, '#f59e0b');
                    }
                    if (!charts[memId]) {
                        initCompactLineChart(memId, `GPU ${gpu.index} 显存 (%)`, '#ef4444');
                    }
                    if (isNumber(gpu.utilization)) {
                        updateLineChart(utilId, gpu.utilization);
                    }
                    if (isNumber(gpu.memoryUsagePercent)) {
                        updateLineChart(memId, gpu.memoryUsagePercent);
                    }
                });
            }

            const nameEl = row.querySelector('.gpu-compact-name');
            const metaEl = row.querySelector('.gpu-compact-meta');
            if (nameEl) {
                nameEl.textContent = gpu.name || `GPU ${gpu.index}`;
            }
            if (metaEl) {
                metaEl.textContent = buildGpuMeta(gpu);
            }

            if (!charts[utilId]) {
                initCompactLineChart(utilId, `GPU ${gpu.index} 使用率 (%)`, '#f59e0b');
            }
            if (!charts[memId]) {
                initCompactLineChart(memId, `GPU ${gpu.index} 显存 (%)`, '#ef4444');
            }

            if (isNumber(gpu.utilization)) {
                updateLineChart(utilId, gpu.utilization);
            }
            if (isNumber(gpu.memoryUsagePercent)) {
                updateLineChart(memId, gpu.memoryUsagePercent);
            }
        });

        renderedGpuKeys = gpuKeys;
        scheduleChartsResize();
    }

    function createMultiGpuRow(gpu, gpuKey) {
        const row = document.createElement('div');
        row.id = `gpu-row-${gpuKey}`;
        row.className = 'card gpu-compact-card';
        row.innerHTML = `
            <div class="gpu-compact-header">
                <div class="gpu-compact-name">${gpu.name || `GPU ${gpu.index}`}</div>
                <div class="gpu-compact-meta">${buildGpuMeta(gpu)}</div>
            </div>
            <div class="gpu-chart-stack">
                <div class="gpu-chart-panel">
                    <div class="gpu-chart-subtitle" style="color:var(--text-secondary);font-size:12px;margin-bottom:2px;">使用率</div>
                    <div id="gpu-${gpuKey}-util" style="flex:1;min-height:0;"></div>
                </div>
                <div class="gpu-chart-panel">
                    <div class="gpu-chart-subtitle" style="color:var(--text-secondary);font-size:12px;margin-bottom:2px;">显存</div>
                    <div id="gpu-${gpuKey}-mem" style="flex:1;min-height:0;"></div>
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

        scheduleChartsResize();
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
                formatter: buildTimeSeriesTooltipFormatter(label, color, '%')
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLine: { lineStyle: { color: '#4a5568' } },
                axisLabel: { show: false }
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

        const history = chartSeriesHistory[domId] || (chartSeriesHistory[domId] = []);
        if (history.length === 0) {
            const seed = round1(value);
            for (let i = MAX_DATA_POINTS - 1; i >= 0; i--) {
                history.push([Date.now() - i * 1000, seed]);
            }
        } else {
            if (history.length >= MAX_DATA_POINTS) {
                history.shift();
            }
            history.push([Date.now(), round1(value)]);
        }

        chart.setOption({
            series: [{ data: history }]
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

    }

    function getRealtimeValue(data, field, fallback) {
        const value = data ? data[field] : null;
        return value !== null && value !== undefined ? value : fallback();
    }

    function updateWithMockData() {
        setText('avgResponseTime', Math.round(randomRange(200, 300)) + 'ms');
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

    function scheduleChartsResize(delay) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            Object.values(charts).forEach((chart) => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }, typeof delay === 'number' ? delay : 150);
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
            failRequests: 0,
            totalTokens: 0,
            totalApiKeys: 0,
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

    function buildRecentSeriesData(values, endTime) {
        const safeValues = Array.isArray(values) ? values : [];
        const resolvedEndTime = isNumber(endTime) ? endTime : Date.now();
        return safeValues.map((value, index) => {
            const timestamp = resolvedEndTime - (safeValues.length - 1 - index) * 1000;
            return [timestamp, round1(value)];
        });
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    }

    function formatTooltipTimestamp(timestamp) {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${formatTimestamp(timestamp)}`;
    }

    function buildTimeSeriesTooltipFormatter(label, color, suffix) {
        return function(params) {
            if (!params || !params.length) {
                return '';
            }

            const point = params[0];
            const value = Array.isArray(point.data) ? point.data[1] : point.value;
            const timestamp = Array.isArray(point.data) ? point.data[0] : point.axisValue;
            const displayValue = isNumber(value) ? round1(value) + (suffix || '') : '-';
            return formatTooltipTimestamp(timestamp) + '<br/><span style="display:inline-block;width:10px;height:10px;background-color:' + color + ';"></span> ' + label + ': ' + displayValue;
        };
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
        scheduleChartsResize();
    });
})();
