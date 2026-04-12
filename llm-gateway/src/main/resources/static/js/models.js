(function() {
    'use strict';

    let currentUser = null;
    let catalog = null;
    let modelItems = [];
    let filteredItems = [];
    let activeModel = null;

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        currentUser = await API.getCurrentUser();
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }

        initSidebarUserInfo(currentUser);
        bindEvents();
        await loadCatalog();
    });

    function bindEvents() {
        const keywordInput = document.getElementById('modelKeywordInput');
        if (keywordInput) {
            keywordInput.addEventListener('input', applyFilters);
        }
    }

    async function loadCatalog() {
        showLoading(true);
        try {
            catalog = await API.get('/models/catalog');
            modelItems = Array.isArray(catalog?.models) ? catalog.models : [];
            applyFilters();
        } catch (error) {
            console.error('Failed to load model catalog', error);
            UI.showErrorMessage('模型列表加载失败: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    function applyFilters() {
        const keyword = String(document.getElementById('modelKeywordInput')?.value || '').trim().toLowerCase();
        filteredItems = modelItems.filter(function(item) {
            if (!keyword) {
                return true;
            }
            return [
                item.modelName,
                item.sourceLabel,
                item.providerId != null ? '#' + item.providerId : ''
            ].some(function(value) {
                return String(value || '').toLowerCase().includes(keyword);
            });
        });

        renderSummary();
        renderGrid();
    }

    function renderSummary() {
        const summary = document.getElementById('catalogSummary');
        if (!summary) {
            return;
        }
        summary.textContent = '共 ' + UI.formatNumber(filteredItems.length) + ' 个模型';
    }

    function renderGrid() {
        const grid = document.getElementById('modelsGrid');
        const empty = document.getElementById('modelsEmpty');
        if (!grid || !empty) {
            return;
        }

        if (!filteredItems.length) {
            grid.classList.add('d-none');
            empty.classList.remove('d-none');
            return;
        }

        empty.classList.add('d-none');
        grid.classList.remove('d-none');
        grid.innerHTML = filteredItems.map(function(item, index) {
            return '' +
                '<article class="model-card">' +
                    '<div class="model-card-head">' +
                        '<div>' +
                            '<h3 class="model-name">' + escapeHtml(item.modelName || '-') + '</h3>' +
                            '<div class="model-meta">' +
                                '<span class="meta-pill">供应商 #' + escapeHtml(item.providerId) + '</span>' +
                            '</div>' +
                        '</div>' +
                        renderStatusBadge(item.status, item.statusLabel) +
                    '</div>' +
                    '<div class="model-card-foot">' +
                        '<span class="model-source">' + escapeHtml(item.sourceLabel || '-') + '</span>' +
                        '<button class="btn btn-primary btn-sm" type="button" onclick="openModelDetail(' + index + ')">详情</button>' +
                    '</div>' +
                '</article>';
        }).join('');
    }

    function renderStatusBadge(status, label) {
        const badgeClass = status === 'enabled'
            ? 'badge-success'
            : status === 'circuit_open'
                ? 'badge-warning'
                : 'badge-danger';

        return '<span class="badge ' + badgeClass + '">' + escapeHtml(label || '-') + '</span>';
    }

    function showLoading(isLoading) {
        const loading = document.getElementById('modelsLoading');
        const grid = document.getElementById('modelsGrid');
        const empty = document.getElementById('modelsEmpty');
        if (loading) {
            loading.classList.toggle('d-none', !isLoading);
        }
        if (isLoading) {
            if (grid) {
                grid.classList.add('d-none');
            }
            if (empty) {
                empty.classList.add('d-none');
            }
        }
    }

    function initSidebarUserInfo(user) {
        const usernameEl = document.getElementById('sidebarUsername');
        const avatarEl = document.getElementById('sidebarUserAvatar');
        if (usernameEl) {
            usernameEl.textContent = user.username || '-';
        }
        if (avatarEl) {
            avatarEl.textContent = (user.username || 'U').substring(0, 1).toUpperCase();
        }
    }

    function escapeHtml(text) {
        if (text == null) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function getGatewayUrl() {
        const baseUrl = String(catalog?.gatewayBaseUrl || '').trim();
        const path = String(catalog?.chatCompletionsPath || '/v1/chat/completions').trim();
        if (!baseUrl) {
            return path;
        }
        return baseUrl + path;
    }

    function getCurlSnippet(item) {
        return [
            'curl ' + JSON.stringify(getGatewayUrl()) + ' \\',
            '  -H "Content-Type: application/json" \\',
            '  -H "Authorization: Bearer YOUR_API_KEY" \\',
            '  -d \'{',
            '    "model": "' + String(item.modelName || '') + '",',
            '    "messages": [',
            '      {"role": "user", "content": "你好"}',
            '    ]',
            '  }\''
        ].join('\n');
    }

    window.openModelDetail = function(index) {
        activeModel = filteredItems[index] || null;
        if (!activeModel) {
            return;
        }

        const statusClass = activeModel.status === 'enabled'
            ? 'badge badge-success'
            : activeModel.status === 'circuit_open'
                ? 'badge badge-warning'
                : 'badge badge-danger';

        setText('modelDetailTitle', activeModel.modelName || '模型调用方式');
        setText('detailProviderId', activeModel.providerId != null ? '供应商 #' + activeModel.providerId : '-');
        setText('detailUrl', getGatewayUrl());
        setText('detailModelName', activeModel.modelName || '-');
        setText('detailApiKey', '用户自备');
        setText('detailCurl', getCurlSnippet(activeModel));

        const detailStatus = document.getElementById('detailStatus');
        if (detailStatus) {
            detailStatus.className = statusClass;
            detailStatus.textContent = activeModel.statusLabel || '-';
        }

        const modal = document.getElementById('modelDetailModal');
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
        }
    };

    window.closeModelDetailModal = function() {
        const modal = document.getElementById('modelDetailModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    };

    window.copyModelDetail = function(type) {
        if (!activeModel) {
            return;
        }

        const content = type === 'url'
            ? getGatewayUrl()
            : type === 'model'
                ? String(activeModel.modelName || '')
                : type === 'curl'
                    ? getCurlSnippet(activeModel)
                    : 'API Key 需由用户自行填写';

        UI.copyToClipboard(content);
    };

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(function() { window.location.href = '/login'; })
            .catch(function() { window.location.href = '/login'; });
    };
})();
