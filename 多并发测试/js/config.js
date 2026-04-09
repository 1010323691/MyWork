/**
 * config.js - 配置文件
 * 存储应用的默认配置和常量
 */

const Config = {
    // API 类型枚举
    apiTypes: {
        OLLAMA: 'ollama',
        VLLM: 'vllm',
        LM_STUDIO: 'lm_studio'
    },

    // API 默认配置
    defaultApiUrl: 'http://192.168.0.119:11434',
    defaultVllmUrl: 'http://127.0.0.1:8000',
    defaultLmStudioUrl: 'http://192.168.0.119:1234',
    defaultApiType: 'lm_studio',
    defaultTemperature: 0.7,

    // 并发测试默认配置
    defaultConcurrentCount: 1,
    maxConcurrentCount: 100,
    minConcurrentCount: 1,

    // 存储键名
    storageKeys: {
        apiUrl: 'concurrent_test_api_url',
        apiType: 'concurrent_test_api_type',
        model: 'concurrent_test_model',
        prompt: 'concurrent_test_prompt',
        concurrentCount: 'concurrent_test_concurrent_count',
        temperature: 'concurrent_test_temperature'
    },

    // UI 更新频率 (ms)
    uiUpdateInterval: 100,

    // 表格显示最大行数
    maxTableRows: 100,

    // QPS 计算窗口 (秒)
    qpsWindow: 1,

    // 时间格式
    timeFormat: 'HH:mm:ss',

    // 精度设置
    decimalPrecision: 2
};

// 导出到全局
window.Config = Config;

console.log('[Config] 配置加载完成');
