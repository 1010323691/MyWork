/**
 * api.js - API 调用模块
 * 负责封装 Ollama 和 OpenAI 兼容接口请求
 */

const API = {
    /**
     * 获取当前 API 类型
     */
    getApiType() {
        return localStorage.getItem(Config.storageKeys.apiType) || Config.defaultApiType;
    },

    /**
     * 获取当前 API URL
     */
    getApiUrl() {
        const savedUrl = localStorage.getItem(Config.storageKeys.apiUrl);
        if (savedUrl) {
            return savedUrl.replace(/\/$/, '');
        }

        const apiType = this.getApiType();
        if (apiType === Config.apiTypes.VLLM) {
            return Config.defaultVllmUrl.replace(/\/$/, '');
        }
        if (apiType === Config.apiTypes.LM_STUDIO) {
            return Config.defaultLmStudioUrl.replace(/\/$/, '');
        }
        return Config.defaultApiUrl.replace(/\/$/, '');
    },

    /**
     * 获取可选认证头
     */
    getAuthHeaders() {
        const apiKey = localStorage.getItem(Config.storageKeys.apiKey)?.trim();
        if (!apiKey) {
            return {};
        }

        return {
            'Authorization': `Bearer ${apiKey}`
        };
    },

    /**
     * 检查与服务端的连接
     */
    async checkConnection() {
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 5000);

            const res = await fetch(`${this.getApiUrl()}/v1/models`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    ...this.getAuthHeaders()
                },
                signal: controller.signal
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            return { success: true, data };
        } catch (error) {
            console.error('[API] 连接失败:', error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * 获取模型列表
     */
    async getModels() {
        try {
            const res = await fetch(`${this.getApiUrl()}/v1/models`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    ...this.getAuthHeaders()
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            return data.data?.map(model => model.id).filter(Boolean) || [];
        } catch (error) {
            console.error('[API] 获取模型列表失败:', error.message);
            return [];
        }
    },

    /**
     * 调用聊天 API（流式响应）
     */
    async chat(prompt, model, temperature = 0.7, controller = null) {
        const maxRetries = 5;
        const retryDelay = 1000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const options = {};
                if (controller) {
                    options.signal = controller.signal;
                }

                const response = await fetch(`${this.getApiUrl()}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream',
                        ...this.getAuthHeaders()
                    },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        stream: true,
                        temperature
                    }),
                    ...options
                });

                if (response.ok) {
                    return response.body;
                }

                const errorBody = await response.text();

                if (response.status === 500 && errorBody.includes('loading model')) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }

                throw new Error(`HTTP ${response.status}: ${errorBody}`);
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw error;
                }

                if (error.message.includes('loading model') && attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }

                console.error('[API] 请求错误:', error.message);
                throw error;
            }
        }

        throw new Error('请求超时，请稍后重试');
    },

    /**
     * 解析流式响应
     */
    async parseStream(stream, onToken, onComplete) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let accumulatedContent = '';
        let promptTokens = 0;
        let outputTokens = 0;
        const startTime = Date.now();
        let firstTokenTime = null;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });

                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim()) {
                        continue;
                    }

                    if (line.startsWith('data: [DONE]')) {
                        const endTime = Date.now();
                        const totalTime = endTime - startTime;
                        const ttf = firstTokenTime !== null ? firstTokenTime - startTime : null;
                        const generationTime = firstTokenTime !== null ? (endTime - firstTokenTime) / 1000 : 0;
                        const visibleTokens = outputTokens > 0 ? outputTokens : accumulatedContent.length;
                        const speed = generationTime > 0 ? visibleTokens / generationTime : 0;

                        onComplete({
                            content: accumulatedContent,
                            inputTokens: promptTokens,
                            outputTokens: visibleTokens,
                            totalTime,
                            ttf,
                            speed
                        });
                        break;
                    }

                    if (!line.startsWith('data: ')) {
                        continue;
                    }

                    try {
                        const data = JSON.parse(line.substring(6));

                        if (data.usage) {
                            promptTokens = data.usage.prompt_tokens || 0;
                            outputTokens = data.usage.completion_tokens || outputTokens;
                        }

                        const newContent = data.choices?.[0]?.delta?.content;
                        if (!newContent) {
                            continue;
                        }

                        accumulatedContent += newContent;
                        if (firstTokenTime === null) {
                            firstTokenTime = Date.now();
                        }

                        onToken(accumulatedContent, accumulatedContent.length, 'content');
                    } catch (_) {
                        // Ignore malformed stream chunks.
                    }
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('[API] 流读取错误:', error.message);
            }
        }

        return { reader };
    }
};

window.API = API;

console.log('[API] 模块加载完成');
