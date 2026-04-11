/**
 * Neon date picker.
 */

(function() {
    'use strict';

    const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

    class NeonDatePicker {
        constructor(inputElement, options = {}) {
            this.input = inputElement;
            this.value = this.input.value || '';
            this.options = {
                minDate: options.minDate || null,
                maxDate: options.maxDate || null,
                format: options.format || 'yyyy/mm/dd',
                ...options
            };

            this.currentDate = new Date();
            this.currentYear = this.currentDate.getFullYear();
            this.currentMonth = this.currentDate.getMonth();
            this.selectedDate = null;

            this.init();
        }

        init() {
            this.createWrapper();
            this.createPanel();
            NeonDatePicker.instances.add(this);
            NeonDatePicker.ensureGlobalListeners();
            this.bindEvents();

            if (this.value) {
                const parsedDate = this.parseDate(this.value);
                if (parsedDate) {
                    this.selectedDate = parsedDate;
                    this.currentYear = parsedDate.getFullYear();
                    this.currentMonth = parsedDate.getMonth();
                }
            }

            this.render();
            this.input._neonDatePicker = this;
        }

        createWrapper() {
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'date-picker-wrapper';
            this.input.parentNode.insertBefore(this.wrapper, this.input);
            this.wrapper.appendChild(this.input);

            this.input.className = 'date-picker-input';

            this.icon = document.createElement('svg');
            this.icon.className = 'date-picker-icon';
            this.icon.setAttribute('viewBox', '0 0 24 24');
            this.icon.setAttribute('fill', 'none');
            this.icon.setAttribute('stroke', 'currentColor');
            this.icon.setAttribute('stroke-width', '2');
            this.icon.setAttribute('stroke-linecap', 'round');
            this.icon.setAttribute('stroke-linejoin', 'round');
            this.icon.innerHTML = `
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            `;
            this.wrapper.appendChild(this.icon);
        }

        createPanel() {
            this.panel = document.createElement('div');
            this.panel.className = 'date-picker-panel';
            this.wrapper.appendChild(this.panel);
        }

        bindEvents() {
            this.input.addEventListener('click', (e) => {
                e.stopPropagation();
                this.show();
                e.preventDefault();
            });

            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.show();
                } else if (e.key === 'Escape') {
                    this.hide();
                }
            });

            this.panel.addEventListener('click', (e) => {
                e.stopPropagation();

                if (e.target.closest('#prevMonthBtn')) {
                    this.shiftMonth(-1);
                    return;
                }

                if (e.target.closest('#nextMonthBtn')) {
                    this.shiftMonth(1);
                    return;
                }

                if (e.target.closest('#clearBtn')) {
                    this.clear();
                    return;
                }

                if (e.target.closest('#todayBtn')) {
                    const today = new Date();
                    this.selectDate(today.getFullYear(), today.getMonth(), today.getDate());
                    return;
                }

                const dayElement = e.target.closest('.date-picker-day');
                if (dayElement && !dayElement.classList.contains('other-month')) {
                    this.selectDate(
                        this.currentYear,
                        this.currentMonth,
                        parseInt(dayElement.getAttribute('data-day'), 10)
                    );
                }
            });

            this.panel.addEventListener('change', (e) => {
                if (e.target.id === 'monthSelect') {
                    this.currentMonth = parseInt(e.target.value, 10);
                    this.renderDays();
                    this.updateSelects();
                    return;
                }

                if (e.target.id === 'yearSelect') {
                    this.currentYear = parseInt(e.target.value, 10);
                    this.renderDays();
                    this.updateSelects();
                }
            });
        }

        shiftMonth(delta) {
            this.currentMonth += delta;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear -= 1;
            } else if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear += 1;
            }

            this.renderDays();
            this.updateSelects();
        }

        getPanelHTML() {
            const startYear = this.currentYear - 50;
            const endYear = this.currentYear + 10;

            let yearOptions = '';
            for (let year = startYear; year <= endYear; year++) {
                yearOptions += `<option value="${year}" ${year === this.currentYear ? 'selected' : ''}>${year}</option>`;
            }

            const monthOptions = MONTHS.map((month, index) => {
                const selected = index === this.currentMonth ? 'selected' : '';
                return `<option value="${index}" ${selected}>${month}</option>`;
            }).join('');

            return `
                <div class="date-picker-header">
                    <div class="date-picker-month-year">
                        <select id="monthSelect">${monthOptions}</select>
                        <select id="yearSelect">${yearOptions}</select>
                    </div>
                    <div class="date-picker-nav">
                        <button type="button" class="date-picker-nav-btn" id="prevMonthBtn" aria-label="上个月">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button type="button" class="date-picker-nav-btn" id="nextMonthBtn" aria-label="下个月">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="date-picker-weekdays">
                    ${WEEKDAYS.map(day => `<div class="date-picker-weekday">${day}</div>`).join('')}
                </div>
                <div class="date-picker-days" id="daysGrid">
                    ${this.generateDaysGrid()}
                </div>
                <div class="date-picker-footer">
                    <button type="button" class="date-picker-footer-btn secondary" id="clearBtn">清除</button>
                    <button type="button" class="date-picker-footer-btn" id="todayBtn">今天</button>
                </div>
            `;
        }

        generateDaysGrid() {
            const firstDay = new Date(this.currentYear, this.currentMonth, 1);
            const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
            const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0);

            let startWeekday = firstDay.getDay();
            startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const days = [];

            for (let i = startWeekday - 1; i >= -6; i--) {
                days.push({
                    day: prevMonthLastDay.getDate() + i + 1,
                    isOtherMonth: true,
                    isToday: false
                });
            }

            for (let i = 1; i <= lastDay.getDate(); i++) {
                const currentDate = new Date(this.currentYear, this.currentMonth, i);
                currentDate.setHours(0, 0, 0, 0);
                days.push({
                    day: i,
                    isOtherMonth: false,
                    isToday: currentDate.getTime() === today.getTime()
                });
            }

            const remainingDays = 42 - days.length;
            for (let i = 1; i <= remainingDays; i++) {
                days.push({ day: i, isOtherMonth: true, isToday: false });
            }

            return days.map(d => {
                const classes = ['date-picker-day'];
                if (d.isOtherMonth) {
                    classes.push('other-month');
                }
                if (d.isToday && !d.isOtherMonth) {
                    classes.push('today');
                }
                if (
                    this.selectedDate &&
                    !d.isOtherMonth &&
                    this.selectedDate.getDate() === d.day &&
                    this.selectedDate.getMonth() === this.currentMonth &&
                    this.selectedDate.getFullYear() === this.currentYear
                ) {
                    classes.push('selected');
                }

                return `<div class="${classes.join(' ')}" data-day="${d.day}">${d.day}</div>`;
            }).join('');
        }

        updateSelects() {
            const monthSelect = this.panel.querySelector('#monthSelect');
            const yearSelect = this.panel.querySelector('#yearSelect');
            if (monthSelect) {
                monthSelect.value = String(this.currentMonth);
            }
            if (yearSelect) {
                yearSelect.value = String(this.currentYear);
            }
        }

        renderDays() {
            const daysGrid = this.panel.querySelector('#daysGrid');
            if (daysGrid) {
                daysGrid.innerHTML = this.generateDaysGrid();
            }
        }

        render() {
            this.panel.innerHTML = this.getPanelHTML();
        }

        selectDate(year, month, day) {
            this.selectedDate = new Date(year, month, day);
            const formattedDate = this.formatInternalDate(year, month, day);
            this.input.value = formattedDate;
            this.value = formattedDate;
            this.renderDays();
            this.input.dispatchEvent(new CustomEvent('datechange', {
                detail: { date: this.selectedDate, formatted: formattedDate }
            }));
            this.hide();
        }

        clear() {
            this.selectedDate = null;
            this.input.value = '';
            this.value = '';
            this.renderDays();
            this.input.dispatchEvent(new CustomEvent('datechange', {
                detail: { date: null, formatted: '' }
            }));
            this.hide();
        }

        show() {
            NeonDatePicker.instances.forEach(picker => {
                if (picker !== this) {
                    picker.hide();
                }
            });

            this.wrapper.classList.add('show');
            this.panel.classList.add('show');
        }

        hide() {
            this.wrapper.classList.remove('show');
            this.panel.classList.remove('show');
        }

        toggle() {
            if (this.wrapper.classList.contains('show')) {
                this.hide();
            } else {
                this.show();
            }
        }

        formatInternalDate(year, month, day) {
            const m = month + 1;
            return `${year}/${m.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
        }

        parseDate(dateStr) {
            if (!dateStr) {
                return null;
            }

            const parts = dateStr.replace(/-/g, '/').split('/');
            if (parts.length !== 3) {
                return null;
            }

            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);

            if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
                return null;
            }

            if (month < 0 || month > 11 || day < 1 || day > 31) {
                return null;
            }

            return new Date(year, month, day);
        }

        getDate() {
            return this.selectedDate;
        }

        setDate(date) {
            if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
                return;
            }

            this.selectedDate = date;
            this.currentYear = date.getFullYear();
            this.currentMonth = date.getMonth();
            this.input.value = this.formatInternalDate(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            );
            this.value = this.input.value;
            this.render();
        }
    }

    NeonDatePicker.instances = new Set();
    NeonDatePicker.globalListenersAttached = false;
    NeonDatePicker.ensureGlobalListeners = function() {
        if (NeonDatePicker.globalListenersAttached) {
            return;
        }

        document.addEventListener('click', (e) => {
            NeonDatePicker.instances.forEach(picker => {
                if (!picker.wrapper.contains(e.target)) {
                    picker.hide();
                }
            });
        }, true);

        NeonDatePicker.globalListenersAttached = true;
    };

    window.NeonDatePicker = NeonDatePicker;
    window._neonDatePickers = window._neonDatePickers || [];

    function initNeonDatePickers() {
        document.querySelectorAll('input[data-neon-datepicker]').forEach(input => {
            if (input._neonDatePicker) {
                return;
            }

            const options = {
                minDate: input.getAttribute('data-min-date'),
                maxDate: input.getAttribute('data-max-date'),
                format: input.getAttribute('data-format') || 'yyyy/mm/dd'
            };
            const picker = new NeonDatePicker(input, options);
            window._neonDatePickers.push(picker);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNeonDatePickers);
    } else {
        initNeonDatePickers();
    }
})();
