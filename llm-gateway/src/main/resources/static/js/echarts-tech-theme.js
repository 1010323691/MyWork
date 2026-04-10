/**
 * LLM Gateway - ECharts Tech Theme Configuration
 * 深色科技风格图表主题 | Dark Neon Tech Charts
 */

(function() {
    'use strict';

    // Global color palette for tech theme
    const TECH_COLORS = [
        '#00d4ff',  // Cyan - primary
        '#a855f7',  // Purple
        '#ff0066',  // Magenta
        '#10b981',  // Green
        '#fbbf24',  // Yellow
        '#3b82f6',  // Blue
        '#ec4899',  // Pink
        '#8b5cf6'   // Violet
    ];

    const HEATMAP_COLORS = [
        'rgba(15, 20, 60, 0.2)',  // Lowest - dark navy
        'rgba(0, 212, 255, 0.3)',
        'rgba(0, 212, 255, 0.5)',
        'rgba(0, 212, 255, 0.7)',
        'rgba(0, 212, 255, 0.9)'   // Highest - bright cyan
    ];

    /**
     * 科技感深色主题配置
     * @returns {Object} ECharts theme option
     */
    function getTechThemeOption() {
        return {
            color: TECH_COLORS,
            backgroundColor: 'rgba(21, 25, 66, 0)',
            textStyle: { fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif" },
            grid: { containLabel: true },

            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'line', lineStyle: { color: 'rgba(0, 212, 255, 0.6)', width: 2 } },
                backgroundColor: 'rgba(15, 20, 60, 0.95)',
                borderColor: 'rgba(0, 212, 255, 0.4)',
                textStyle: { color: '#e8ecf1' },
                extraCssText: 'box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3); border-radius: 8px;'
            },

            legend: { textStyle: { color: '#a0aec0' }, itemWidth: 14, itemHeight: 6 },

            xAxis: {
                axisLine: { show: true, lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
                axisTick: { show: true, lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
                axisLabel: { color: '#a0aec0', margin: 15 },
                splitLine: { show: true, lineStyle: { color: 'rgba(0, 212, 255, 0.08)', type: 'solid' } }
            },

            yAxis: {
                axisLine: { show: true, lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
                axisTick: { show: true, lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
                axisLabel: { color: '#a0aec0', margin: 15 },
                splitLine: { show: true, lineStyle: { color: 'rgba(0, 212, 255, 0.08)', type: 'solid' } }
            },

            line: {
                symbol: 'circle', symbolSize: 6, showSymbol: true, smooth: true,
                lineStyle: { width: 3 },
                itemStyle: { borderColor: '#0a0e27', borderWidth: 2 },
                areaStyle: { opacity: 0.3 },
                emphasis: { lineStyle: { width: 4 }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 212, 255, 0.5)' } }
            },

            bar: {
                borderRadius: [4, 4, 0, 0],
                itemStyle: { borderRadius: [4, 4, 0, 0] },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 212, 255, 0.4)' } }
            },

            pie: {
                radius: ['40%', '70%'], center: ['50%', '50%'],
                itemStyle: { borderRadius: 8, borderColor: '#151942', borderWidth: 3 },
                label: { color: '#a0aec0' },
                emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0, 212, 255, 0.6)', scale: 1.1 } }
            },

            gauge: {
                startAngle: 180, endAngle: 0, min: 0, max: 100, radius: '90%', center: ['50%', '60%'],
                axisLine: { lineStyle: { width: 20, color: [[0.3, '#ff0066'], [0.6, '#a855f7'], [1, '#00d4ff']] } },
                pointer: { show: false },
                axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                detail: { valueAnimation: true, fontSize: 24, fontWeight: 'bold', color: '#00d4ff', offsetCenter: [0, '-15%'], formatter: '{value}%' }
            },

            title: { textStyle: { color: '#e8ecf1', fontWeight: 'bold' }, subtextStyle: { color: '#a0aec0' } },

            graph: {
                layout: 'force',
                force: { repulsion: 300, edgeLength: 60 },
                roam: true, draggable: true,
                label: { show: true, position: 'right', color: '#e8ecf1' },
                edgeStyle: { color: 'rgba(0, 212, 255, 0.3)', width: 2, curveness: 0.2 },
                emphasis: { focus: 'adjacency', itemStyle: { shadowBlur: 10, shadowColor: '#00d4ff' } }
            }
        };
    }

    // ==================== Line Chart Creators ====================

    /**
     * 创建带渐变和发光效果的线图表配置
     */
    function createTechLineChart(baseOption, useArea = false) {
        const option = { ...getTechThemeOption(), ...baseOption };
        if (Array.isArray(option.series)) {
            option.series = option.series.map((series, index) => {
                if (series.type === 'line') {
                    const color = TECH_COLORS[index % TECH_COLORS.length];
                    return {
                        ...series, itemStyle: { color: color, shadowBlur: 10, shadowColor: `${color}80` },
                        lineStyle: { width: 3, shadowBlur: 8, shadowColor: `${color}60`, color: color },
                        areaStyle: useArea ? { opacity: 0.4, color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}80` }, { offset: 1, color: `${color}05` }]) } : series.areaStyle
                    };
                }
                return series;
            });
        }
        return option;
    }

    /**
     * 创建多 Y 轴线图表（适合混合指标展示）
     */
    function createMultiYAxisLineChart(baseOption) {
        const option = getTechThemeOption();
        Object.assign(option, baseOption);

        if (Array.isArray(option.series)) {
            option.series = option.series.map((series, index) => {
                const color = TECH_COLORS[index % TECH_COLORS.length];
                return {
                    ...series, itemStyle: { color: color }, lineStyle: { color: color, width: 3 },
                    areaStyle: series.areaStyle || { opacity: 0.2, color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}60` }, { offset: 1, color: `${color}05` }]) }
                };
            });
        }

        // Enhance Y-Axis styling
        if (option.yAxis && Array.isArray(option.yAxis)) {
            option.yAxis = option.yAxis.map((axis, index) => ({
                ...axis, axisLine: { show: true, lineStyle: { color: TECH_COLORS[index % TECH_COLORS.length] } },
                axisLabel: { color: '#a0aec0' }, splitLine: index === 0 ? { show: false } : { show: true, lineStyle: { color: `${TECH_COLORS[index % TECH_COLORS.length]}20`, type: 'dashed' } }
            }));
        }

        return option;
    }

    // ==================== Gauge Chart Creators ====================

    /**
     * 创建科技风格仪表盘（环形进度条样式）
     * @param {number} value - 当前值 (0-100)
     * @param {string} title - 标题
     * @param {string} unit - 单位符号
     * @param {number} max - 最大值
     */
    function createTechGauge(value = 0, title = '', unit = '%', max = 100) {
        const normalizedValue = Math.max(0, Math.min(value / max, 1));
        // Determine color based on value percentage
        let primaryColor = '#10b981';  // Green for healthy (<30%)
        if (normalizedValue > 0.6) primaryColor = '#ff0066';  // Red for critical (>60%)
        else if (normalizedValue > 0.4) primaryColor = '#a855f7';  // Purple for moderate (40-60%)
        else primaryColor = '#00d4ff';  // Cyan for good

        return {
            ...getTechThemeOption(),
            series: [{
                type: 'gauge', progress: { show: true, width: 16 },
                axisLine: { lineStyle: { width: 16, color: [[normalizedValue, primaryColor], [1, 'rgba(0, 212, 255, 0.08)']] } },
                pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                detail: { valueAnimation: true, formatter: '{value}' + unit, color: primaryColor, fontSize: 24, fontWeight: 'bold', offsetCenter: [0, 5], shadowBlur: 12, shadowColor: primaryColor },
                title: { show: !!title, color: '#a0aec0', fontSize: 12, textAlign: 'center' },
                data: [{ value: Math.round(value * 100) / 100 }]
            }],
            ...(title ? { title: { text: title, left: 'center', top: '5%', textStyle: { color: '#a0aec0', fontSize: 12 } } } : {})
        };
    }

    /**
     * 创建小仪表盘（用于紧凑卡片）
     */
    function createSmallGauge(value = 0, unit = '%') {
        return {
            ...getTechThemeOption(),
            series: [{
                type: 'gauge', radius: '85%', center: ['50%', '60%'], min: 0, max: 100,
                axisLine: { lineStyle: { width: 12, color: [[value / 100, '#00d4ff'], [1, 'rgba(0, 212, 255, 0.08)']] } },
                pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                detail: { valueAnimation: true, formatter: '{value}' + unit, color: '#00d4ff', fontSize: 18, fontWeight: 'bold', offsetCenter: [0, -5] }, data: [{ value }]
            }]
        };
    }

    // ==================== Pie/Donut Chart Creators ====================

    /**
     * 创建科技风格饼图/环形图
     */
    function createTechPieChart(baseOption, isDonut = true) {
        const option = getTechThemeOption();
        Object.assign(option, baseOption);

        if (Array.isArray(option.series)) {
            option.series = option.series.map((series, index) => {
                if (series.type === 'pie') {
                    return {
                        ...series, radius: isDonut ? ['50%', '75%'] : ['0%', '75%'], center: isDonut ? ['50%', '50%'] : ['50%', '50%'],
                        itemStyle: { borderRadius: 6, borderColor: '#151942', borderWidth: 3 },
                        label: { show: true, position: 'outside', color: '#a0aec0', formatter: '{b}: {d}%' },
                        emphasis: { itemStyle: { shadowBlur: 20, shadowColor: `${TECH_COLORS[index % TECH_COLORS.length]}80`, scale: 1.05 } }
                    };
                }
                return series;
            });
        }

        option.tooltip = option.tooltip || { trigger: 'item', formatter: '{b}: {c} ({d}%)' };
        return option;
    }

    /**
     * 创建对比饼图（并排显示）
     */
    function createComparisonPieChart(data1, data2) {
        const series = [data1, data2].map((data, index) => ({
            type: 'pie', radius: '65%', center: [(index * 50 + 25) + '%', '50%'],
            itemStyle: { borderRadius: 4, borderColor: '#151942', borderWidth: 2 },
            label: { show: true, color: '#a0aec0' }, data: data
        }));

        return {
            ...getTechThemeOption(), tooltip: { trigger: 'item' },
            series: [{ type: 'graph', coordinateSystem: 'cartesian2d', symbolSize: 60, data: [], edges: [] }, ...series]
        };
    }

    // ==================== Bar Chart Creators ====================

    /**
     * 创建科技风格柱状图
     */
    function createTechBarChart(baseOption, horizontal = false) {
        const option = getTechThemeOption();
        Object.assign(option, baseOption);

        if (Array.isArray(option.series)) {
            option.series = option.series.map((series, index) => {
                if (series.type === 'bar' || series.type === undefined) {
                    const color = TECH_COLORS[index % TECH_COLORS.length];
                    const gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: color }, { offset: 1, color: `${color}60` }
                    ]);

                    return {
                        ...series, itemStyle: { color: gradient, borderRadius: horizontal ? [4, 0, 0, 4] : [4, 4, 0, 0], shadowBlur: 8, shadowColor: `${color}40` },
                        emphasis: { itemStyle: { shadowBlur: 15, shadowColor: `${color}60`, scale: 1.02 } }
                    };
                }
                return series;
            });
        }

        if (horizontal) {
            option.xAxis = [{ ...option.xAxis, axisLabel: { color: '#a0aec0' }, splitLine: { show: false } }];
            option.yAxis = [{ ...option.yAxis, axisLabel: { color: '#a0aec0' } }];
        }

        return option;
    }

    /**
     * 创建堆叠柱状图
     */
    function createStackedBarChart(baseOption) {
        const option = createTechBarChart(baseOption);
        if (Array.isArray(option.series)) {
            option.series = option.series.map(series => ({ ...series, stack: 'stack1' }));
        }
        return option;
    }

    /**
     * 创建横向柱状图（适合排行榜）
     */
    function createHorizontalBarChart(baseOption) {
        const option = createTechBarChart(baseOption, true);
        option.tooltip = option.tooltip || { trigger: 'axis', axisPointer: { type: 'shadow' } };
        return option;
    }

    // ==================== Heatmap Chart Creator ====================

    /**
     * 创建科技风格热力图
     */
    function createTechHeatmap(baseOption) {
        const option = getTechThemeOption();
        Object.assign(option, baseOption);

        if (Array.isArray(option.series)) {
            option.series = option.series.map(series => ({
                ...series, type: 'heatmap',
                itemStyle: { borderRadius: 2 },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: '#00d4ff' } },
                label: { show: baseOption.showLabel !== false, color: '#e8ecf1', fontSize: 11 },
                visualMap: baseOption.visualMap || {
                    min: 0, max: 100, calculable: true, orient: 'horizontal', left: 'center', top: 'bottom',
                    textStyle: { color: '#a0aec0' },
                    inRange: { color: HEATMAP_COLORS }
                }
            }));
        }

        if (!option.xAxis) option.xAxis = [{ type: 'category', splitArea: { show: true } }];
        if (!option.yAxis) option.yAxis = [{ type: 'category' }];

        return option;
    }

    // ==================== Scatter/Bubble Chart Creator ====================

    /**
     * 创建散点图/气泡图
     */
    function createScatterChart(baseOption, isBubble = false) {
        const option = getTechThemeOption();
        Object.assign(option, baseOption);

        if (Array.isArray(option.series)) {
            option.series = option.series.map((series, index) => ({
                ...series, type: isBubble ? 'custom' : 'scatter',
                itemStyle: { color: TECH_COLORS[index % TECH_COLORS.length], shadowBlur: 8, shadowColor: `${TECH_COLORS[index]}60` },
                emphasis: { itemStyle: { shadowBlur: 15 } }
            }));
        }

        return option;
    }

    // ==================== Radar Chart Creator ====================

    /**
     * 创建雷达图
     */
    function createRadarChart(baseOption) {
        const option = getTechThemeOption();
        Object.assign(option, baseOption);

        option.radar = option.radar || {
            indicator: baseOption.indicators || [], axisName: { color: '#a0aec0' },
            splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.1)' } },
            splitArea: { areaStyle: { color: ['rgba(0, 212, 255, 0.03)', 'rgba(0, 212, 255, 0.06)'] } }
        };

        if (Array.isArray(option.series)) {
            option.series = option.series.map((series, index) => ({
                ...series, itemStyle: { color: TECH_COLORS[index % TECH_COLORS.length] },
                areaStyle: { color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [{ offset: 0, color: `${TECH_COLORS[index]}40` }, { offset: 1, color: `${TECH_COLORS[index]}05` }]) },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: `${TECH_COLORS[index]}80` } }
            }));
        }

        return option;
    }

    // ==================== Theme Registration ====================

    /**
     * 注册主题到 ECharts
     */
    function registerTheme() {
        if (typeof echarts !== 'undefined') {
            echarts.registerTheme('tech', getTechThemeOption());
        }
    }

    // Expose to global scope
    window.TechChartTheme = {
        // Get base theme option
        getBaseOption: getTechThemeOption,
        register: registerTheme,

        // Chart creators
        createLineChart: createTechLineChart,
        createMultiYAxisLineChart: createMultiYAxisLineChart,
        createGauge: createTechGauge,
        createSmallGauge: createSmallGauge,
        createPieChart: createTechPieChart,
        createBarChart: createTechBarChart,
        createStackedBarChart: createStackedBarChart,
        createHorizontalBarChart: createHorizontalBarChart,
        createHeatmap: createTechHeatmap,
        createScatterChart: createScatterChart,
        createRadarChart: createRadarChart,

        // Color constants
        TECH_COLORS: TECH_COLORS,
        HEATMAP_COLORS: HEATMAP_COLORS
    };

    // Auto-register theme if echarts is loaded
    if (typeof echarts !== 'undefined') {
        registerTheme();
    }

})();
