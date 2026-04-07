/**
 * main.js - 主入口模块
 * 负责初始化应用和业务流程控制
 */

(function() {
    'use strict';

    /**
     * 应用主模块
     */
    const App = {
        /**
         * 初始化应用
         */
        async init() {
            try {
                UI.init();
                UI.loadSavedConfig();
                await this.checkConnection();
                await this.loadModels();
            } catch (error) {
                console.error('[App] 初始化失败:', error);
                UI.updateConnectionStatus(false, '初始化失败');
            }
        },

        /**
         * 检查连接
         */
        async checkConnection() {
            const result = await API.checkConnection();

            if (result.success) {
                UI.updateConnectionStatus(true, '已连接');
            } else {
                UI.updateConnectionStatus(false, '连接失败');
                console.error('[App] 连接失败:', result.error);
            }

            return result;
        },

        /**
         * 加载模型列表
         */
        async loadModels() {
            UI.setLoading(true);

            try {
                const models = await API.getModels();

                const select = UI.elements.modelSelect;
                if (!select) {
                    console.error('[App] 模型选择元素不存在');
                    return;
                }

                select.innerHTML = '';

                if (models.length === 0) {
                    const option = document.createElement('option');
                    option.textContent = '未找到模型';
                    option.disabled = true;
                    select.appendChild(option);
                } else {
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = '请选择模型...';
                    defaultOption.disabled = true;
                    defaultOption.selected = true;
                    select.appendChild(defaultOption);

                    models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        select.appendChild(option);
                    });

                    const savedModel = localStorage.getItem(Config.storageKeys.model);
                    if (savedModel && models.includes(savedModel)) {
                        select.value = savedModel;
                    }
                }

                UI.updateConnectionStatus(true, '已连接');

            } catch (error) {
                console.error('[App] 加载模型失败:', error);
                select.innerHTML = '<option value="">加载失败</option>';
                UI.updateConnectionStatus(false, '加载失败');
            } finally {
                UI.setLoading(false);
            }
        },

        /**
         * 开始测试
         */
        startTest() {
            if (!this.validateInput()) {
                return;
            }

            const config = this.getTestConfig();

            // 初始化并发测试
            Concurrent.initialize(config.concurrentCount);

            // 更新 UI 状态
            UI.setTesting(true);
            UI.resetMetrics();

            // 更新任务列表显示
            UI.updateTaskList();

            // 开始运行
            Concurrent.runAll(config);
        },

        /**
         * 停止测试
         */
        stopTest() {
            if (confirm('确定要停止当前测试吗？')) {
                Concurrent.stop();
                UI.setTesting(false);
            }
        },

        /**
         * 验证输入
         */
        validateInput() {
            const model = UI.elements.modelSelect?.value;
            if (!model) {
                alert('请选择一个模型');
                return false;
            }

            const prompt = UI.elements.promptInput?.value.trim();
            if (!prompt) {
                alert('请输入测试提示词');
                return false;
            }

            const concurrentCount = parseInt(UI.elements.concurrentCount?.value) || 1;
            if (concurrentCount < 1 || concurrentCount > 100) {
                alert('并发数必须在 1-100 之间');
                return false;
            }

            return true;
        },

        /**
         * 获取测试配置
         */
        getTestConfig() {
            return {
                apiUrl: UI.elements.apiUrl?.value || Config.defaultApiUrl,
                apiType: UI.elements.apiTypeSelect?.value || Config.defaultApiType,
                model: UI.elements.modelSelect?.value,
                prompt: UI.elements.promptInput?.value.trim(),
                concurrentCount: parseInt(UI.elements.concurrentCount?.value) || Config.defaultConcurrentCount,
                temperature: parseFloat(UI.elements.temperature?.value) || Config.defaultTemperature
            };
        }
    };

    // 导出到全局
    window.App = App;

    /**
     * 页面加载完成后初始化
     */
    window.addEventListener('DOMContentLoaded', () => {
        App.init();
    });

})();
