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

        // Color constants
        TECH_COLORS: TECH_COLORS,
        HEATMAP_COLORS: HEATMAP_COLORS
    };

    // Auto-register theme if echarts is loaded
    if (typeof echarts !== 'undefined') {
        registerTheme();
    }

})();
