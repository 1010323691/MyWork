/**
 * LLM Gateway - Admin Pricing Page
 * Session/Cookie 认证模式
 */
(function() {
    'use strict';

    let providers = [];

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        const user = await API.getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            window.location.href = '/dashboard';
            return;
        }

        initSidebarUserInfo(user);
        loadPricing();
    });

    function initSidebarUserInfo(user) {
        const usernameEl = document.getElementById('sidebarUsername');
        const avatarEl = document.getElementById('sidebarUserAvatar');
        if (user && usernameEl) {
            usernameEl.textContent = user.username;
        }
        if (user && avatarEl) {
            avatarEl.textContent = user.username.substring(0, 1).toUpperCase();
        }
    }

    /**
     * 加载定价信息
     */
    async function loadPricing() {
        try {
            const response = await fetch('/api/admin/providers', {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            providers = await response.json();
            renderPricing();
            document.getElementById('pricingLoading').classList.add('d-none');
            document.getElementById('pricingContainer').classList.remove('d-none');
        } catch (error) {
            console.error('加载定价信息失败:', error);
            UI.showAlert('加载定价信息失败：' + error.message, 'error');
        }
    }

    /**
     * 渲染定价信息
     */
    function renderPricing() {
        const hasPricing = providers.some(function(p) {
            return p.sellPriceInput || p.sellPriceOutput;
        });

        if (!hasPricing) {
            document.getElementById('pricingContent').innerHTML =
                '<div class="alert alert-info">' +
                    '暂无定价配置，请在 <a href="/admin/providers">提供商管理</a> 中配置' +
                '</div>';
            return;
        }

        const pricingCards = providers.filter(function(p) {
            return p.sellPriceInput || p.sellPriceOutput;
        }).map(function(p) {
            const inputProfit = (p.sellPriceInput || 0) - (p.buyPriceInput || 0);
            const outputProfit = (p.sellPriceOutput || 0) - (p.buyPriceOutput || 0);
            const profitClass = inputProfit + outputProfit > 0 ? 'profit-positive' : 'profit-zero';

            return '<div class="card pricing-card">' +
                '<div class="card-header">' +
                    '<strong>' + escapeHtml(p.name) + '</strong>' +
                    '<span class="profit-badge ' + profitClass + '">' +
                        '利润：' + formatProfit(inputProfit + outputProfit) + ' 元/百万 Token' +
                    '</span>' +
                '</div>' +
                '<div class="card-body">' +
                    '<table class="table">' +
                        '<thead>' +
                            '<tr>' +
                                '<th>类型</th>' +
                                '<th>买入价</th>' +
                                '<th>卖出价</th>' +
                                '<th>利润</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                            '<tr>' +
                                '<td>输入 Token</td>' +
                                '<td>' + (p.buyPriceInput || 0) + ' 元</td>' +
                                '<td>' + (p.sellPriceInput || 0) + ' 元</td>' +
                                '<td><span class="' + (inputProfit > 0 ? 'text-success' : '') + '">' +
                                    formatProfit(inputProfit) + ' 元' +
                                '</span></td>' +
                            '</tr>' +
                            '<tr>' +
                                '<td>输出 Token</td>' +
                                '<td>' + (p.buyPriceOutput || 0) + ' 元</td>' +
                                '<td>' + (p.sellPriceOutput || 0) + ' 元</td>' +
                                '<td><span class="' + (outputProfit > 0 ? 'text-success' : '') + '">' +
                                    formatProfit(outputProfit) + ' 元' +
                                '</span></td>' +
                            '</tr>' +
                        '</tbody>' +
                    '</table>' +
                    '<p class="text-muted">' +
                        '<small>' +
                            '计费示例：100 万输入 Token + 50 万输出 Token = ' +
                            ((p.sellPriceInput || 0) + (p.sellPriceOutput || 0) * 0.5) + ' 元' +
                        '</small>' +
                    '</p>' +
                '</div>' +
            '</div>';
        }).join('');

        document.getElementById('pricingContent').innerHTML = pricingCards;
    }

    /**
     * 格式化利润
     */
    function formatProfit(value) {
        return value >= 0 ? '+' + value.toFixed(6) : value.toFixed(6);
    }

    /**
     * HTML 转义
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * 退出登录
     */
    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(function() { window.location.href = '/login'; })
            .catch(function() { window.location.href = '/login'; });
    };
})();
