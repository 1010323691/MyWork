/**
 * api.js - API 调用模块
 * 负责封装 Ollama 和 vLLM API 请求
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
        if (savedUrl) return savedUrl.replace(/\/$/, '');

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
     * 检查与服务器的连接
     */
    async checkConnection() {
        const apiType = this.getApiType();
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 5000);

            let res;
            if (apiType === Config.apiTypes.VLLM || apiType === Config.apiTypes.LM_STUDIO) {
                res = await fetch(`${this.getApiUrl()}/v1/models`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });
            } else {
                res = await fetch(`${this.getApiUrl()}/api/tags`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });
            }

            if (res.ok) {
                const data = await res.json();
                return { success: true, data };
            } else {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
        } catch (error) {
            console.error('[API] 连接失败:', error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * 获取模型列表
     */
    async getModels() {
        const apiType = this.getApiType();
        try {
            let res;
            if (apiType === Config.apiTypes.VLLM || apiType === Config.apiTypes.LM_STUDIO) {
                res = await fetch(`${this.getApiUrl()}/v1/models`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
            } else {
                res = await fetch(`${this.getApiUrl()}/api/tags`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
            }

            if (res.ok) {
                const data = await res.json();
                if (apiType === Config.apiTypes.VLLM || apiType === Config.apiTypes.LM_STUDIO) {
                    // vLLM/LM Studio 返回格式：{ data: [{ id: 'xxx', ... }] } (OpenAI 格式)
                    return data.data?.map(m => m.id).filter(Boolean) || [];
                } else {
                    // Ollama 返回格式：{ models: [{ name: 'xxx', ... }] }
                    return data.models?.map(m => m.name).filter(Boolean) || [];
                }
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (error) {
            console.error('[API] 获取模型列表失败:', error.message);
            return [];
        }
    },

    /**
     * 调用聊天 API (流式响应)
     */
    async chat(prompt, model, temperature = 0.7, controller = null) {
        const apiType = this.getApiType();

        // 重试机制：模型加载时需要重试
        const maxRetries = 5;
        const retryDelay = 1000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const options = {};
                if (controller) {
                    options.signal = controller.signal;
                }

                let response;
                if (apiType === Config.apiTypes.VLLM || apiType === Config.apiTypes.LM_STUDIO) {
                    // vLLM/LM Studio 使用 OpenAI 兼容的 API
                    response = await fetch(`${this.getApiUrl()}/v1/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'text/event-stream'
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [{ role: 'user', content: prompt }],
                            stream: true,
                            temperature: temperature
                        }),
                        ...options
                    });
                } else {
                    // Ollama 使用自己的 API
                    response = await fetch(`${this.getApiUrl()}/api/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: model,
                            messages: [{ role: 'user', content: prompt }],
                            stream: true,
                            options: { temperature: temperature }
                        }),
                        ...options
                    });
                }

                if (response.ok) {
                    return response.body;
                }

                const errorBody = await response.text();

                // Ollama 特有的模型加载错误
                if (apiType === Config.apiTypes.OLLAMA &&
                    response.status === 500 &&
                    errorBody.includes('loading model')) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }

                throw new Error(`HTTP ${response.status}: ${errorBody}`);

            } catch (error) {
                if (error.name === 'AbortError') {
                    throw error;
                }

                // Ollama 特有的模型加载错误重试
                if (apiType === Config.apiTypes.OLLAMA &&
                    error.message.includes('loading model') &&
                    attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                    console.error('[API] 请求错误:', error.message);
                    throw error;
                }
            }
        }

        throw new Error('请求超时，请稍后重试');
    },

    /**
     * 解析流式响应
     */
    async parseStream(stream, onToken, onComplete) {
        const apiType = this.getApiType();
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let accumulatedContent = '';
        let promptTokens = 0;
        let outputTokens = 0;
        let startTime = Date.now();
        let firstTokenTime = null;
        // lastTokenTime 已移除：改用 endTime 计算 generationTime

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                if (apiType === Config.apiTypes.VLLM || apiType === Config.apiTypes.LM_STUDIO) {
                    // vLLM/LM Studio 使用 OpenAI 格式的 SSE
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        if (line.startsWith('data: [DONE]')) {
                            // vLLM 流结束标记
                            const endTime = Date.now();
                            const totalTime = endTime - startTime;
                            const ttf = firstTokenTime !== null ? firstTokenTime - startTime : null;
                            // 使用 endTime 代替 lastTokenTime，确保计算到实际完成时间
                            const generationTime = firstTokenTime !== null ? (endTime - firstTokenTime) / 1000 : 0;
                            const visibleTokens = outputTokens > 0 ? outputTokens : accumulatedContent.length;
                            const speed = generationTime > 0 ? visibleTokens / generationTime : 0;

                            onComplete({
                                content: accumulatedContent,
                                inputTokens: promptTokens,
                                outputTokens: visibleTokens,
                                totalTime: totalTime,
                                ttf: ttf,
                                speed: speed
                            });
                            break;
                        }

                        if (line.startsWith('data: ')) {
                            try {
                                const jsonData = line.substring(6);
                                const data = JSON.parse(jsonData);

                                // 记录 token 统计 (OpenAI 格式在最后一个 chunk 中)
                                if (data.usage) {
                                    promptTokens = data.usage.prompt_tokens || 0;
                                    outputTokens = data.usage.completion_tokens || outputTokens;
                                }

                                // 处理消息内容
                                if (data.choices?.[0]?.delta?.content) {
                                    const newContent = data.choices[0].delta.content;
                                    accumulatedContent += newContent;

                                    if (firstTokenTime === null && newContent.length > 0) {
                                        firstTokenTime = Date.now();
                                    }
                                    // lastTokenTime 已移除：改用 endTime 计算 generationTime

                                    if (newContent.length > 0) {
                                        onToken(accumulatedContent, accumulatedContent.length, 'content');
                                    }
                                }
                            } catch (e) {
                                // 忽略 JSON 解析错误
                            }
                        }
                    }
                } else {
                    // Ollama 格式：每行一个 JSON 对象
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (!line.trim()) continue;

                        try {
                            const data = JSON.parse(line);

                            // 处理消息内容 - Ollama 返回增量内容
                            if (data.message?.content) {
                                const newContent = data.message.content;
                                accumulatedContent += newContent;

                                if (firstTokenTime === null && newContent.length > 0) {
                                    firstTokenTime = Date.now();
                                }
                                // lastTokenTime 已移除：改用 endTime 计算 generationTime

                                if (newContent.length > 0) {
                                    onToken(accumulatedContent, accumulatedContent.length, 'content');
                                }
                            }

                            // 流结束
                            if (data.done) {
                                // Ollama 在 done 时返回准确的统计信息
                                if (data.eval_count !== undefined) {
                                    outputTokens = data.eval_count;
                                }
                                if (data.prompt_eval_count !== undefined) {
                                    promptTokens = data.prompt_eval_count;
                                }

                                const endTime = Date.now();
                                const totalTime = endTime - startTime;
                                const ttf = firstTokenTime !== null ? firstTokenTime - startTime : null;

                                // 优先使用 Ollama 返回的 eval_duration（服务器实际生成耗时）
                                let generationTime;
                                if (data.eval_duration !== undefined) {
                                    generationTime = data.eval_duration / 1000000000; // ns → s
                                } else {
                                    // 降级：用 totalTime - ttf 近似生成耗时
                                    generationTime = ttf !== null ? (totalTime - ttf) / 1000 : 0;
                                }

                                const visibleTokens = outputTokens > 0 ? outputTokens : accumulatedContent.length;
                                const speed = generationTime > 0 ? visibleTokens / generationTime : 0;

                                onComplete({
                                    content: accumulatedContent,
                                    inputTokens: promptTokens,
                                    outputTokens: visibleTokens,
                                    totalTime: totalTime,
                                    ttf: ttf,
                                    speed: speed
                                });

                                break;
                            }
                        } catch (e) {
                            // 忽略 JSON 解析错误
                        }
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

// 导出到全局
window.API = API;

console.log('[API] 模块加载完成');
