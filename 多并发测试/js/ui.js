/**
 * ui.js - UI 渲染模块
 * 负责界面的创建和更新
 */

const UI = {
    // DOM 元素缓存
    elements: {},

    /**
     * 初始化 DOM 引用
     */
    init() {
        // 导航元素
        this.elements.connectionStatus = document.getElementById('connectionStatus');
        this.elements.concurrentStatus = document.getElementById('concurrentStatus');

        // 配置元素
        this.elements.apiTypeSelect = document.getElementById('apiTypeSelect');
        this.elements.apiUrl = document.getElementById('apiUrl');
        this.elements.modelSelect = document.getElementById('modelSelect');
        this.elements.refreshBtn = document.getElementById('refreshBtn');

        // 测试参数元素
        this.elements.promptInput = document.getElementById('promptInput');
        this.elements.concurrentCount = document.getElementById('concurrentCount');
        this.elements.temperature = document.getElementById('temperature');

        // 操作按钮
        this.elements.startBtn = document.getElementById('startBtn');
        this.elements.stopBtn = document.getElementById('stopBtn');
        this.elements.clearBtn = document.getElementById('clearBtn');
        this.elements.exportCsvBtn = document.getElementById('exportCsvBtn');

        // 指标元素
        this.elements.concurrentCountDisplay = document.getElementById('concurrentCountDisplay');
        this.elements.totalRequests = document.getElementById('totalRequests');
        this.elements.qps = document.getElementById('qps');
        this.elements.totalThroughput = document.getElementById('totalThroughput');
        this.elements.avgTtf = document.getElementById('avgTtf');
        this.elements.avgSpeed = document.getElementById('avgSpeed');
        this.elements.avgTotalTime = document.getElementById('avgTotalTime');

        // 列表元素
        this.elements.concurrentTasksList = document.getElementById('concurrentTasksList');
        this.elements.resultsTableBody = document.getElementById('resultsTableBody');

        this.bindEvents();
    },

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // API 类型切换
        this.elements.apiTypeSelect.addEventListener('change', () => {
            const apiType = this.elements.apiTypeSelect.value;
            localStorage.setItem(Config.storageKeys.apiType, apiType);

            // 更新默认地址
            if (apiType === Config.apiTypes.VLLM) {
                this.elements.apiUrl.value = Config.defaultVllmUrl;
            } else {
                this.elements.apiUrl.value = Config.defaultApiUrl;
            }

            // 刷新模型列表
            this.setLoading(true);
            App.loadModels();
        });

        // API 地址变更
        this.elements.apiUrl.addEventListener('change', () => {
            localStorage.setItem(Config.storageKeys.apiUrl, this.elements.apiUrl.value);
        });

        // 模型选择变更
        this.elements.modelSelect.addEventListener('change', () => {
            localStorage.setItem(Config.storageKeys.model, this.elements.modelSelect.value);
        });

        // 提示词变更
        this.elements.promptInput.addEventListener('change', () => {
            localStorage.setItem(Config.storageKeys.prompt, this.elements.promptInput.value);
        });

        // 并发数变更
        this.elements.concurrentCount.addEventListener('change', () => {
            let value = parseInt(this.elements.concurrentCount.value);
            if (value < Config.minConcurrentCount) value = Config.minConcurrentCount;
            if (value > Config.maxConcurrentCount) value = Config.maxConcurrentCount;
            this.elements.concurrentCount.value = value;
            localStorage.setItem(Config.storageKeys.concurrentCount, value);
        });

        // Temperature 变更
        this.elements.temperature.addEventListener('change', () => {
            localStorage.setItem(Config.storageKeys.temperature, this.elements.temperature.value);
        });

        // 刷新按钮
        this.elements.refreshBtn.addEventListener('click', () => {
            this.setLoading(true);
            App.loadModels();
        });

        // 开始按钮
        this.elements.startBtn.addEventListener('click', () => {
            App.startTest();
        });

        // 停止按钮
        this.elements.stopBtn.addEventListener('click', () => {
            App.stopTest();
        });

        // 清空按钮
        this.elements.clearBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有测试结果吗？')) {
                Concurrent.clear();
                this.clearResultsTable();
                this.clearTaskList();
                this.resetMetrics();
                UI.updateSummary([]);
            }
        });

        // 导出 CSV 按钮
        this.elements.exportCsvBtn.addEventListener('click', () => {
            this.exportToCsv();
        });
    },

    /**
     * 更新连接状态
     */
    updateConnectionStatus(isConnected, message = '') {
        if (!this.elements.connectionStatus) return;

        this.elements.connectionStatus.className = 'status-badge';

        if (isConnected) {
            this.elements.connectionStatus.classList.add('connected');
            this.elements.connectionStatus.textContent = '已连接';
        } else {
            this.elements.connectionStatus.classList.add('error');
            this.elements.connectionStatus.textContent = message || '未连接';
        }
    },

    /**
     * 设置加载状态
     */
    setLoading(isLoading) {
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.disabled = isLoading;
        }
        if (this.elements.startBtn) {
            this.elements.startBtn.disabled = isLoading;
        }
    },

    /**
     * 设置测试状态
     */
    setTesting(isTesting) {
        if (this.elements.startBtn) {
            this.elements.startBtn.disabled = isTesting;
        }
        if (this.elements.stopBtn) {
            this.elements.stopBtn.disabled = !isTesting;
        }
        if (this.elements.modelSelect) {
            this.elements.modelSelect.disabled = isTesting;
        }
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.disabled = isTesting;
        }
        if (this.elements.concurrentCount) {
            this.elements.concurrentCount.disabled = isTesting;
        }

        // 更新并发状态徽章
        if (this.elements.concurrentStatus) {
            if (isTesting) {
                this.elements.concurrentStatus.classList.remove('hidden');
                this.elements.concurrentStatus.classList.add('active');
            } else {
                this.elements.concurrentStatus.classList.add('hidden');
                this.elements.concurrentStatus.classList.remove('active');
            }
        }
    },

    /**
     * 更新并发状态显示
     */
    updateConcurrentStatus(count) {
        if (this.elements.concurrentCountDisplay) {
            this.elements.concurrentCountDisplay.textContent = count;
        }
    },

    /**
     * 更新请求总数
     */
    updateTotalRequests(count) {
        if (this.elements.totalRequests) {
            this.elements.totalRequests.textContent = count;
        }
    },

    /**
     * 更新 QPS
     */
    updateQps(qps) {
        if (this.elements.qps) {
            this.elements.qps.textContent = qps.toFixed(1);
        }
    },

    /**
     * 更新总吞吐量
     */
    updateTotalThroughput(throughput) {
        if (this.elements.totalThroughput) {
            this.elements.totalThroughput.textContent = throughput.toFixed(0);
        }
    },

    /**
     * 更新指标
     */
    updateMetrics(concurrentState) {
        // 总请求数
        this.updateTotalRequests(concurrentState.completedCount);

        // 总吞吐量 (所有已完成请求的速度总和)
        const totalTokens = concurrentState.results.reduce((sum, r) => sum + r.outputTokens, 0);
        const totalTime = concurrentState.results.reduce((sum, r) => sum + r.totalTime, 0);
        const throughput = totalTime > 0 ? (totalTokens / totalTime) * 1000 : 0;
        this.updateTotalThroughput(throughput);
    },

    /**
     * 更新任务列表
     */
    updateTaskList() {
        if (!this.elements.concurrentTasksList) return;

        let html = '';

        if (Concurrent.tasks.length === 0) {
            html = '<span class="placeholder-text">等待测试开始...</span>';
        } else {
            Concurrent.tasks.forEach(task => {
                let statusClass = '';
                let statusText = '';

                switch (task.status) {
                    case 'pending':
                        statusClass = '';
                        statusText = '等待中';
                        break;
                    case 'running':
                        statusClass = 'running';
                        statusText = '进行中';
                        break;
                    case 'completed':
                        statusClass = 'completed';
                        statusText = '已完成';
                        break;
                    case 'error':
                        statusClass = 'error';
                        statusText = '错误';
                        break;
                    case 'aborted':
                        statusClass = 'error';
                        statusText = '已取消';
                        break;
                }

                html += `
                    <div class="concurrent-task-item ${statusClass}" id="task-${task.id}">
                        <span class="task-id">#${task.id.toString().padStart(3, '0')}</span>
                        <span class="task-status">${statusText}</span>
                        <span class="task-progress" id="task-progress-${task.id}">
                            ${task.tokens ? task.tokens + ' tokens' : ''}
                        </span>
                    </div>
                `;
            });
        }

        this.elements.concurrentTasksList.innerHTML = html;
    },

    /**
     * 更新任务进度
     */
    updateTaskProgress(task) {
        const progressEl = document.getElementById(`task-progress-${task.id}`);
        if (progressEl) {
            progressEl.innerHTML = task.tokens + ' tokens<span class="dots">...</span>';
        }
    },

    /**
     * 更新任务状态
     */
    updateTaskStatus(task, status, message = '') {
        const taskEl = document.getElementById(`task-${task.id}`);
        if (taskEl) {
            taskEl.className = `concurrent-task-item ${status}`;
            const statusEl = taskEl.querySelector('.task-status');
            if (statusEl) {
                statusEl.textContent = message || status;
            }
        }
    },

    /**
     * 更新任务结果
     */
    updateTaskResult(task, result) {
        const progressEl = document.getElementById(`task-progress-${task.id}`);
        if (progressEl) {
            progressEl.textContent = result.outputTokens + ' tokens';
        }
    },

    /**
     * 清空任务列表
     */
    clearTaskList() {
        if (this.elements.concurrentTasksList) {
            this.elements.concurrentTasksList.innerHTML = '<span class="placeholder-text">等待测试开始...</span>';
        }
    },

    /**
     * 重置指标
     */
    resetMetrics() {
        this.updateConcurrentStatus(0);
        this.updateTotalRequests(0);
        this.updateQps(0);
        this.updateTotalThroughput(0);
    },

    /**
     * 添加结果到表格
     */
    addResultRow(result) {
        if (!this.elements.resultsTableBody) return;

        const row = document.createElement('tr');
        const statusClass = result.ttf !== null ? 'success' : 'error';

        row.innerHTML = `
            <td>${result.id.toString().padStart(3, '0')}</td>
            <td>${result.model}</td>
            <td>${result.inputTokens}</td>
            <td>${result.outputTokens}</td>
            <td class="highlight-cell">${result.ttf !== null ? result.ttf + 'ms' : '-'}</td>
            <td class="highlight-cell">${result.speed.toFixed(2)} t/s</td>
            <td>${result.totalTime}ms</td>
            <td><span class="status-cell ${statusClass}">${result.ttf !== null ? '✓' : '✗'}</span></td>
        `;

        // 插入到第一行
        if (this.elements.resultsTableBody.firstChild) {
            this.elements.resultsTableBody.insertBefore(row, this.elements.resultsTableBody.firstChild);
        } else {
            this.elements.resultsTableBody.appendChild(row);
        }

        // 限制行数
        while (this.elements.resultsTableBody.children.length > Config.maxTableRows) {
            this.elements.resultsTableBody.removeChild(this.elements.resultsTableBody.lastChild);
        }
    },

    /**
     * 清空结果表格
     */
    clearResultsTable() {
        if (this.elements.resultsTableBody) {
            this.elements.resultsTableBody.innerHTML = '';
        }
    },

    /**
     * 更新统计汇总
     */
    updateSummary(results) {
        if (results.length === 0) {
            if (this.elements.avgTtf) this.elements.avgTtf.textContent = '-';
            if (this.elements.avgSpeed) this.elements.avgSpeed.textContent = '-';
            if (this.elements.avgTotalTime) this.elements.avgTotalTime.textContent = '-';
            return;
        }

        // 计算平均值
        const totalSpeed = results.reduce((sum, r) => sum + r.speed, 0);
        const avgSpeed = totalSpeed / results.length;

        const totalTtf = results
            .map(r => r.ttf)
            .filter(t => t !== null)
            .reduce((sum, t) => sum + t, 0);
        const validTtfCount = results.filter(r => r.ttf !== null).length;
        const avgTtf = validTtfCount > 0 ? Math.round(totalTtf / validTtfCount) : null;

        const totalTotalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
        const avgTotalTime = Math.round(totalTotalTime / results.length);

        // 更新 UI
        if (this.elements.avgTtf) {
            this.elements.avgTtf.textContent = avgTtf !== null ? avgTtf + 'ms' : '-';
        }
        if (this.elements.avgSpeed) {
            this.elements.avgSpeed.textContent = avgSpeed.toFixed(2) + ' t/s';
        }
        if (this.elements.avgTotalTime) {
            this.elements.avgTotalTime.textContent = avgTotalTime + 'ms';
        }
    },

    /**
     * 导出 CSV
     */
    exportToCsv() {
        const results = Concurrent.getResults();
        if (results.length === 0) {
            alert('没有可导出的数据');
            return;
        }

        const headers = ['ID', '模型', '输入 Tokens', '输出 Tokens', 'TTFT(ms)', '生成速度 (t/s)', '总耗时 (ms)', '时间'];
        const rows = results.map(r => [
            r.id,
            r.model,
            r.inputTokens,
            r.outputTokens,
            r.ttf !== null ? r.ttf : '',
            r.speed.toFixed(Config.decimalPrecision),
            r.totalTime,
            this.formatTime(r.timestamp)
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        link.setAttribute('href', url);
        link.setAttribute('download', `concurrent_test_results_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * 格式化时间
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },

    /**
     * 加载保存的配置
     */
    loadSavedConfig() {
        // API 类型
        const savedApiType = localStorage.getItem(Config.storageKeys.apiType);
        if (savedApiType && this.elements.apiTypeSelect) {
            this.elements.apiTypeSelect.value = savedApiType;
        }

        // API 地址：根据 API 类型设置默认地址，不直接加载缓存
        const currentApiType = this.elements.apiTypeSelect?.value || Config.defaultApiType;
        const defaultUrl = currentApiType === Config.apiTypes.VLLM
            ? Config.defaultVllmUrl
            : Config.defaultApiUrl;

        if (this.elements.apiUrl) {
            this.elements.apiUrl.value = defaultUrl;
        }

        // 模型
        const savedModel = localStorage.getItem(Config.storageKeys.model);
        if (savedModel && this.elements.modelSelect) {
            this.elements.modelSelect.value = savedModel;
        }

        // 提示词
        const savedPrompt = localStorage.getItem(Config.storageKeys.prompt);
        if (savedPrompt && this.elements.promptInput) {
            this.elements.promptInput.value = savedPrompt;
        }

        // 并发数
        const savedConcurrentCount = localStorage.getItem(Config.storageKeys.concurrentCount);
        if (savedConcurrentCount && this.elements.concurrentCount) {
            this.elements.concurrentCount.value = savedConcurrentCount;
        }

        // Temperature
        const savedTemperature = localStorage.getItem(Config.storageKeys.temperature);
        if (savedTemperature && this.elements.temperature) {
            this.elements.temperature.value = savedTemperature;
        }
    }
};

// 导出到全局
window.UI = UI;

console.log('[UI] 模块加载完成');
