/**
 * LLM Gateway - User Balance Detail Page
 */
(function() {
    'use strict';

    const state = {
        currentUser: null,
        currentBalance: 0,
        transactionPage: 0,
        transactionPageSize: 20,
        hasMoreTransactions: false
    };

    document.addEventListener('DOMContentLoaded', async function() {
        if (!(await API.isAuthenticated())) {
            window.location.href = '/login';
            return;
        }

        state.currentUser = await API.getCurrentUser();
        if (!state.currentUser) {
            window.location.href = '/login';
            return;
        }

        initSidebarUserInfo(state.currentUser);
        bindEvents();

        await Promise.all([
            loadBalance(),
            loadStats(),
            loadTransactions(true)
        ]);
    });

    function bindEvents() {
        document.getElementById('openRechargeModalBtn')?.addEventListener('click', openRechargeModal);
        document.getElementById('copyRechargeRequestBtn')?.addEventListener('click', copyRechargeRequest);
        document.getElementById('refreshTransactionsBtn')?.addEventListener('click', function() {
            loadTransactions(true);
        });
        document.getElementById('loadMoreTransactionsBtn')?.addEventListener('click', function() {
            if (state.hasMoreTransactions) {
                loadTransactions(false);
            }
        });

        document.getElementById('rechargeAmountInput')?.addEventListener('input', syncRechargeAmountInputs);
        document.getElementById('rechargeAmountModalInput')?.addEventListener('input', syncRechargeAmountInputs);
    }

    function initSidebarUserInfo(user) {
        setText('sidebarUsername', user.username || '-');
        setText('sidebarUserAvatar', (user.username || 'U').substring(0, 1).toUpperCase());
    }

    async function loadBalance() {
        try {
            const data = await API.get('/balance/current');
            state.currentBalance = Number(data && data.balance ? data.balance : 0);
            setText('balanceAmount', formatMoneyNumber(state.currentBalance));
            setText('modalCurrentBalance', 'CNY ' + formatMoneyNumber(state.currentBalance));
        } catch (error) {
            console.error('Failed to load balance', error);
            UI.showErrorMessage('加载余额失败: ' + error.message);
        }
    }

    async function loadStats() {
        try {
            const stats = await API.get('/user/stats');
            setText('todayTokens', formatNumber(stats && stats.todayTokens));
            setText('monthTokens', formatNumber(stats && stats.monthTokens));
            setText('totalRequests', formatNumber(stats && stats.totalRequests));
        } catch (error) {
            console.error('Failed to load user stats', error);
            UI.showErrorMessage('加载统计失败: ' + error.message);
        }
    }

    async function loadTransactions(reset) {
        const loading = document.getElementById('transactionsLoading');
        const container = document.getElementById('transactionsContainer');
        const list = document.getElementById('transactionsList');
        const nextPage = reset ? 0 : state.transactionPage + 1;

        if (loading) {
            loading.classList.remove('d-none');
        }
        if (container) {
            container.classList.add('d-none');
        }

        try {
            const page = await API.get('/balance/transactions?page=' + nextPage + '&size=' + state.transactionPageSize);
            const transactions = Array.isArray(page && page.content) ? page.content : [];

            state.transactionPage = Number(page && page.number ? page.number : nextPage);
            state.hasMoreTransactions = Boolean(page) && state.transactionPage < Number(page.totalPages || 0) - 1;

            if (!list) {
                return;
            }

            if (reset && transactions.length === 0) {
                list.innerHTML = renderEmptyTransactions();
                setText('lastTransactionTime', '-');
                setText('transactionStatusText', '暂无变动');
            } else {
                const html = transactions.map(renderTransactionItem).join('');
                list.innerHTML = reset ? html : list.innerHTML + html;

                if (reset && transactions[0]) {
                    setText('lastTransactionTime', formatDateTime(transactions[0].createdAt));
                    setText('transactionStatusText', '最近有资金变动');
                }
            }

            toggleLoadMore(state.hasMoreTransactions);
        } catch (error) {
            console.error('Failed to load balance transactions', error);
            if (list && reset) {
                list.innerHTML = renderErrorState(error.message);
            }
            UI.showErrorMessage('加载金额明细失败: ' + error.message);
        } finally {
            if (loading) {
                loading.classList.add('d-none');
            }
            if (container) {
                container.classList.remove('d-none');
            }
        }
    }

    function renderTransactionItem(item) {
        const amount = Number(item && item.amount ? item.amount : 0);
        const positive = amount >= 0;
        const type = item && item.type ? item.type : 'ADJUSTMENT';
        const referenceText = item && item.referenceId ? '引用 ' + item.referenceId : '';
        const actorText = item && item.createdBy ? '操作人 ' + item.createdBy : '';
        const amountClass = positive ? 'positive' : 'negative';

        return `
            <article class="ledger-item ${positive ? 'is-positive' : 'is-negative'}">
                <div class="ledger-item__icon ${type.toLowerCase()}">
                    ${getTransactionIcon(type)}
                </div>
                <div class="ledger-item__body">
                    <div class="ledger-item__top">
                        <div class="ledger-item__content">
                            <h3>${escapeHtml(item && item.title ? item.title : '余额变动')}</h3>
                            <p>${escapeHtml(item && item.detail ? item.detail : '系统记录了一笔余额变化')}</p>
                        </div>
                        <div class="ledger-item__amount ${amountClass}">
                            ${formatSignedMoney(amount)}
                        </div>
                    </div>
                    <div class="ledger-item__meta">
                        <span>${escapeHtml(formatDateTime(item && item.createdAt))}</span>
                        <span>变动后余额 CNY ${formatMoneyNumber(item && item.balanceAfter)}</span>
                        ${actorText ? '<span>' + escapeHtml(actorText) + '</span>' : ''}
                        ${referenceText ? '<span>' + escapeHtml(referenceText) + '</span>' : ''}
                    </div>
                </div>
            </article>
        `;
    }

    function renderEmptyTransactions() {
        return `
            <div class="ledger-empty">
                <div class="ledger-empty__title">还没有金额变动记录</div>
                <div class="ledger-empty__desc">后续的扣费、充值和管理员调整都会出现在这里。</div>
            </div>
        `;
    }

    function renderErrorState(message) {
        return `
            <div class="ledger-empty">
                <div class="ledger-empty__title">金额明细加载失败</div>
                <div class="ledger-empty__desc">${escapeHtml(message || '未知错误')}</div>
            </div>
        `;
    }

    function toggleLoadMore(visible) {
        const button = document.getElementById('loadMoreTransactionsBtn');
        if (!button) {
            return;
        }
        button.classList.toggle('d-none', !visible);
    }

    function openRechargeModal() {
        syncRechargeAmountInputs();
        setText('modalUsername', state.currentUser ? state.currentUser.username : '-');
        updateRechargePreview();

        const modal = document.getElementById('rechargeModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function closeRechargeModal() {
        const modal = document.getElementById('rechargeModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function syncRechargeAmountInputs(event) {
        const inlineInput = document.getElementById('rechargeAmountInput');
        const modalInput = document.getElementById('rechargeAmountModalInput');
        const source = event && event.target ? event.target : inlineInput;
        const value = source ? source.value : '';

        if (inlineInput && inlineInput !== source) {
            inlineInput.value = value;
        }
        if (modalInput && modalInput !== source) {
            modalInput.value = value;
        }

        updateRechargePreview();
    }

    function updateRechargePreview() {
        const preview = document.getElementById('rechargeRequestPreview');
        const amount = getRechargeAmount();
        const user = state.currentUser || {};

        if (!preview) {
            return;
        }

        preview.value = [
            '充值申请',
            '用户: ' + (user.username || '-'),
            '用户ID: ' + (user.id || '-'),
            '邮箱: ' + (user.email || '-'),
            '申请金额: CNY ' + formatMoneyNumber(amount),
            '当前余额: CNY ' + formatMoneyNumber(state.currentBalance),
            '申请时间: ' + formatDateTime(new Date()),
            '说明: 请管理员人工充值并确认到账'
        ].join('\n');
    }

    function copyRechargeRequest() {
        const preview = document.getElementById('rechargeRequestPreview');
        if (!preview || !preview.value) {
            UI.showErrorMessage('没有可复制的申请信息');
            return;
        }
        UI.copyToClipboard(preview.value);
    }

    function getRechargeAmount() {
        const modalInput = document.getElementById('rechargeAmountModalInput');
        const inlineInput = document.getElementById('rechargeAmountInput');
        const value = modalInput && modalInput.value !== '' ? modalInput.value : (inlineInput ? inlineInput.value : '');
        return Number(value || 0);
    }

    function getTransactionIcon(type) {
        if (type === 'RECHARGE') {
            return `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19V5"/>
                    <path d="M5 12l7-7 7 7"/>
                </svg>
            `;
        }
        if (type === 'USAGE') {
            return `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
                </svg>
            `;
        }
        return `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20"/>
                <path d="M17 7H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
        `;
    }

    function formatNumber(value) {
        return UI.formatNumber(Number(value || 0));
    }

    function formatMoneyNumber(value) {
        return UI.formatMoney(Number(value || 0), 2, 8);
    }

    function formatSignedMoney(value) {
        const amount = Number(value || 0);
        return (amount >= 0 ? '+CNY ' : '-CNY ') + formatMoneyNumber(Math.abs(amount));
    }

    function formatDateTime(value) {
        const date = value instanceof Date ? value : new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T'));
        if (Number.isNaN(date.getTime())) {
            return value ? String(value).replace('T', ' ') : '-';
        }
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    window.closeRechargeModal = closeRechargeModal;

    window.logout = function() {
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => window.location.href = '/login')
            .catch(() => window.location.href = '/login');
    };
})();
