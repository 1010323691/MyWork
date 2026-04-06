/**
 * concurrent.js - 并发测试模块
 * 负责管理并发请求和执行测试
 */

const Concurrent = {
    // 测试状态
    isRunning: false,
    abortController: null,

    // 并发任务管理
    tasks: [],
    pendingCount: 0,
    runningCount: 0,
    completedCount: 0,
    totalCount: 0,

    // 结果存储
    results: [],

    // QPS 统计
    requestTimestamps: [],
    lastQpsCalc: 0,
    currentQps: 0,

    // 初始化测试
    initialize(concurrentCount) {
        this.isRunning = true;
        this.abortController = new AbortController();
        this.tasks = [];
        this.pendingCount = 0;
        this.runningCount = 0;
        this.completedCount = 0;
        this.totalCount = 0;
        this.results = [];
        this.requestTimestamps = [];
        this.lastQpsCalc = Date.now();
        this.currentQps = 0;

        // 创建任务队列
        for (let i = 1; i <= concurrentCount; i++) {
            this.tasks.push({
                id: i,
                status: 'pending',
                result: null
            });
        }
    },

    /**
     * 停止测试
     */
    stop() {
        this.isRunning = false;
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    },

    /**
     * 清空结果
     */
    clear() {
        this.results = [];
        this.tasks = [];
        this.pendingCount = 0;
        this.runningCount = 0;
        this.completedCount = 0;
        this.totalCount = 0;
    },

    /**
     * 检查所有任务是否完成
     */
    checkAllCompleted() {
        if (this.completedCount === this.tasks.length) {
            this.isRunning = false;
            this.abortController = null;
            UI.setTesting(false);  // 重置右上角"并发中"状态徽章
            return true;
        }
        return false;
    },

    /**
     * 运行单次请求
     */
    async runRequest(id, config) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        task.status = 'running';
        this.runningCount++;
        UI.updateTaskList();
        UI.updateConcurrentStatus(this.runningCount);

        const startTime = Date.now();
        const startTimestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        let result = null;

        console.log(`[Concurrent] 任务 ${id} 开始于 ${startTimestamp}, 当前并发数：${this.runningCount}`);

        try {
            const controller = new AbortController();

            // 记录请求开始时间（用于 QPS 计算）
            this.requestTimestamps.push(Date.now());

            // 发送请求，获取流式响应
            const stream = await API.chat(
                config.prompt,
                config.model,
                config.temperature,
                controller
            );

            // 解析流式响应
            await API.parseStream(stream,
                (content, tokens, type) => {
                    // 实时更新任务进度
                    task.content = content;
                    task.tokens = tokens;
                    task.startTime = startTime;
                    UI.updateTaskProgress(task);
                },
                (stats) => {
                    const endTime = Date.now();
                    const endTimestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
                    const duration = endTime - startTime;

                    console.log(`[Concurrent] 任务 ${id} 完成于 ${endTimestamp}, 耗时：${duration}ms, 当前并发数：${this.runningCount}`);

                    this.completedCount++;
                    this.runningCount--;

                    result = {
                        id: id,
                        model: config.model,
                        inputTokens: 0, // 可在需要时添加计数
                        outputTokens: stats.outputTokens,
                        totalTime: stats.totalTime,
                        speed: stats.speed,
                        ttf: stats.ttf,
                        timestamp: startTime,
                        content: stats.content
                    };

                    task.status = 'completed';
                    task.result = result;
                    this.results.push(result);

                    UI.updateTaskList();
                    UI.updateTaskResult(task, result);
                    UI.addResultRow(result);
                    UI.updateConcurrentStatus(this.runningCount);
                    UI.updateMetrics(this);

                    if (this.checkAllCompleted()) {
                        UI.updateSummary(this.results);
                    }
                }
            );

        } catch (error) {
            if (error.name === 'AbortError') {
                task.status = 'aborted';
                this.completedCount++;
                this.runningCount--;
                UI.updateTaskStatus(task, 'aborted');
            } else {
                task.status = 'error';
                this.completedCount++;
                this.runningCount--;
                console.error(`[Concurrent] 请求 ${id} 失败:`, error.message);
                UI.updateTaskStatus(task, 'error', error.message);
            }
            UI.updateConcurrentStatus(this.runningCount);

            if (this.checkAllCompleted()) {
                UI.updateSummary(this.results);
            }
        }
    },

    /**
     * 运行所有并发请求
     */
    async runAll(config) {
        this.totalCount = this.tasks.length;
        this.completedCount = 0;
        this.runningCount = 0;
        this.pendingCount = this.tasks.length;

        // 启动 QPS 计算定时器
        this.startQpsCalc();

        // 同时启动所有请求
        const launchTime = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        console.log(`[Concurrent] 并发测试启动于 ${launchTime}, 任务数：${this.tasks.length}`);

        const promises = this.tasks.map(task => {
            this.pendingCount--;
            return this.runRequest(task.id, config);
        });

        await Promise.allSettled(promises);

        const finishTime = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        console.log(`[Concurrent] 并发测试结束于 ${finishTime}`);

        // 停止 QPS 计算
        this.stopQpsCalc();

        // 更新最终状态
        this.isRunning = false;
        this.abortController = null;
        UI.updateConcurrentStatus(0);
        UI.updateSummary(this.results);
    },

    /**
     * 启动 QPS 计算
     */
    startQpsCalc() {
        const calcQps = () => {
            if (!this.isRunning) return;

            const now = Date.now();
            const windowMs = Config.qpsWindow * 1000;

            // 移除窗口外的时间戳
            this.requestTimestamps = this.requestTimestamps.filter(
                ts => now - ts <= windowMs
            );

            // 计算 QPS
            this.currentQps = this.requestTimestamps.length / Config.qpsWindow;

            // 更新 UI
            UI.updateQps(this.currentQps);

            this.lastQpsCalc = now;
        };

        this.qpsTimer = setInterval(calcQps, Config.uiUpdateInterval / 2);
        calcQps();
    },

    /**
     * 停止 QPS 计算
     */
    stopQpsCalc() {
        if (this.qpsTimer) {
            clearInterval(this.qpsTimer);
            this.qpsTimer = null;
        }
    },

    /**
     * 获取测试结果
     */
    getResults() {
        return [...this.results];
    }
};

// 导出到全局
window.Concurrent = Concurrent;

console.log('[Concurrent] 模块加载完成');
