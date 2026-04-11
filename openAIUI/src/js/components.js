/**
 * OpenAI-Style Design System - Component JavaScript
 * 组件交互库
 */

// ========== Modal (模态框) ==========
export class Modal {
  constructor(options = {}) {
    this.options = {
      title: '',
      content: '',
      size: 'md',
      showCloseButton: true,
      closable: true,
      closeOnBackdrop: true,
      closeOnEscape: true,
      beforeOpen: null,
      onOpen: null,
      beforeClose: null,
      onClose: null,
      ...options
    };

    this.element = null;
    this.overlay = null;
  }

  create(html) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = html;
    this.element = this.overlay.querySelector('.modal');
    return this;
  }

  open() {
    if (this.options.beforeOpen && this.options.beforeOpen() === false) return;

    document.body.appendChild(this.overlay);
    document.body.style.overflow = 'hidden';

    // Trigger animations
    requestAnimationFrame(() => {
      this.overlay.classList.remove('closing');
    });

    if (this.options.onOpen) this.options.onOpen();
    return this;
  }

  close() {
    if (this.options.beforeClose && this.options.beforeClose() === false) return;

    this.overlay.classList.add('closing');

    setTimeout(() => {
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      document.body.style.overflow = '';

      if (this.options.onClose) this.options.onClose();
    }, 300);

    return this;
  }

  setTitle(title) {
    const titleEl = this.element?.querySelector('.modal-title');
    if (titleEl) titleEl.textContent = title;
    return this;
  }

  setContent(content) {
    const bodyEl = this.element?.querySelector('.modal-body');
    if (bodyEl) bodyEl.innerHTML = content;
    return this;
  }

  destroy() {
    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    document.body.style.overflow = '';
    this.element = null;
    this.overlay = null;
  }

  // 预设模态框
  static confirm(message, options = {}) {
    return new Modal({
      title: '确认',
      content: `
        <div class="p-6">
          <p class="text-secondary mb-6">${message}</p>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary">取消</button>
            <button class="btn btn-primary">确认</button>
          </div>
        </div>
      `,
      size: 'sm',
      ...options
    });
  }

  static alert(message, options = {}) {
    return new Modal({
      title: '提示',
      content: `
        <div class="p-6">
          <p class="text-secondary mb-6">${message}</p>
          <div class="flex justify-end">
            <button class="btn btn-primary">确定</button>
          </div>
        </div>
      `,
      size: 'sm',
      ...options
    });
  }
}

// ========== Toast (提示框) ==========
export class Toast {
  static create(options = {}) {
    const {
      message = '',
      title = '',
      type = 'info', // info, success, warning, danger
      duration = 3000,
      position = 'bottom-right',
      closable = true
    } = options;

    // Create container if not exists
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        ${this.getIcon(type)}
      </div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      ${closable ? `<button class="toast-close">\u00D7</button>` : ''}
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('showing');
    });

    // Auto close
    const timer = setTimeout(() => {
      this.remove(toast);
    }, duration);

    // Close button
    if (closable) {
      toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(timer);
        this.remove(toast);
      });
    }

    return toast;
  }

  static getIcon(type) {
    const icons = {
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };
    return icons[type] || icons.info;
  }

  static remove(toast) {
    toast.classList.add('closing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  static info(message, options = {}) {
    return this.create({ type: 'info', message, ...options });
  }

  static success(message, options = {}) {
    return this.create({ type: 'success', message, ...options });
  }

  static warning(message, options = {}) {
    return this.create({ type: 'warning', message, ...options });
  }

  static error(message, options = {}) {
    return this.create({ type: 'danger', message, ...options });
  }

  static clearAll() {
    const container = document.querySelector('.toast-container');
    if (container) {
      container.innerHTML = '';
    }
  }
}

// ========== Navigation (导航栏) ==========
export class Navigation {
  constructor(selectorOrElement) {
    this.element = typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

    if (!this.element) {
      console.error('Navigation element not found');
      return;
    }

    this.init();
  }

  init() {
    this.handleMobileMenu();
    this.handleDropdowns();
    this.handleActiveLink();
    this.handleScrollEffects();
  }

  handleMobileMenu() {
    const menuBtn = this.element.querySelector('.nav-mobile-toggle');
    const menu = this.element.querySelector('.nav-mobile-menu');

    if (menuBtn && menu) {
      menuBtn.addEventListener('click', () => {
        menu.classList.toggle('open');
        menuBtn.classList.toggle('active');
      });
    }
  }

  handleDropdowns() {
    const dropdowns = this.element.querySelectorAll('.nav-dropdown');

    dropdowns.forEach(dropdown => {
      const trigger = dropdown.querySelector('.nav-link');

      trigger?.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.classList.toggle('open');
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-dropdown')) {
        dropdowns.forEach(d => d.classList.remove('open'));
      }
    });
  }

  handleActiveLink() {
    const links = this.element.querySelectorAll('.nav-link');

    links.forEach(link => {
      link.addEventListener('click', () => {
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }

  handleScrollEffects() {
    let lastScroll = 0;

    window.addEventListener('scroll', debounce(() => {
      const currentScroll = window.pageYOffset;

      if (currentScroll > lastScroll && currentScroll > 100) {
        this.element.classList.add('scrolled');
      } else {
        this.element.classList.remove('scrolled');
      }

      lastScroll = currentScroll;
    }, 100);
  }
}

// ========== Tabs (标签页) ==========
export class Tabs {
  constructor(element) {
    this.tabs = typeof element === 'string' ? document.querySelector(element) : element;
    this.init();
  }

  init() {
    const tabButtons = this.tabs.querySelectorAll('[data-tab]');
    const tabPanels = this.tabs.querySelectorAll('[data-tab-panel]');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // 初始化第一个标签
    const firstTab = tabButtons[0]?.dataset.tab;
    if (firstTab) {
      this.switchTab(firstTab);
    }
  }

  switchTab(tabId) {
    const tabButtons = this.tabs.querySelectorAll('[data-tab]');
    const tabPanels = this.tabs.querySelectorAll('[data-tab-panel]');

    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.dataset.tabPanel === tabId);
    });
  }
}

// ========== Accordion (手风琴) ==========
export class Accordion {
  constructor(element) {
    this.accordion = typeof element === 'string' ? document.querySelector(element) : element;
    this.init();
  }

  init() {
    const items = this.accordion.querySelectorAll('[data-accordion-trigger]');

    items.forEach(trigger => {
      trigger.addEventListener('click', () => this.toggle(trigger));
    });
  }

  toggle(trigger) {
    const panel = trigger.nextElementSibling;
    const isOpen = trigger.classList.contains('active');

    // 关闭所有面板
    this.accordion.querySelectorAll('[data-accordion-trigger]').forEach(t => {
      t.classList.remove('active');
      t.nextElementSibling.classList.remove('active');
    });

    // 如果不是已打开状态，则打开当前面板
    if (!isOpen) {
      trigger.classList.add('active');
      panel.classList.add('active');
      panel.style.maxHeight = panel.scrollHeight + 'px';
    } else {
      panel.style.maxHeight = null;
    }
  }
}

// ========== Tooltip (工具提示) ==========
export class Tooltip {
  constructor(element) {
    this.tooltip = typeof element === 'string' ? document.querySelector(element) : element;
    this.init();
  }

  init() {
    this.tooltip.addEventListener('mouseenter', () => this.show());
    this.tooltip.addEventListener('mouseleave', () => this.hide());
  }

  show() {
    this.tooltip.classList.add('show');
  }

  hide() {
    this.tooltip.classList.remove('show');
  }
}

// ========== Dropdown (下拉菜单) ==========
export class Dropdown {
  constructor(element) {
    this.dropdown = typeof element === 'string' ? document.querySelector(element) : element;
    this.init();
  }

  init() {
    const trigger = this.dropdown.querySelector('.dropdown-trigger');
    const menu = this.dropdown.querySelector('.dropdown-menu');

    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });

      document.addEventListener('click', () => this.hide());
    }
  }

  toggle() {
    this.isOpen ? this.hide() : this.show();
  }

  show() {
    this.dropdown.classList.add('open');
    this.isOpen = true;
  }

  hide() {
    this.dropdown.classList.remove('open');
    this.isOpen = false;
  }
}

// ========== Carousel (轮播) ==========
export class Carousel {
  constructor(element, options = {}) {
    this.carousel = typeof element === 'string' ? document.querySelector(element) : element;
    this.options = {
      autoplay: false,
      interval: 5000,
      loop: true,
      ...options
    };

    this.init();
  }

  init() {
    this.slides = this.carousel.querySelectorAll('.carousel-slide');
    this.currentIndex = 0;
    this.total = this.slides.length;

    this.slides.forEach((slide, index) => {
      slide.classList.toggle('active', index === 0);
    });

    if (this.options.autoplay) {
      this.startAutoplay();
    }
  }

  goTo(index) {
    this.slides[this.currentIndex].classList.remove('active');
    this.currentIndex = (index + this.total) % this.total;
    this.slides[this.currentIndex].classList.add('active');
  }

  next() {
    this.goTo(this.currentIndex + 1);
  }

  prev() {
    this.goTo(this.currentIndex - 1);
  }

  startAutoplay() {
    this.timer = setInterval(() => this.next(), this.options.interval);
  }

  stopAutoplay() {
    clearInterval(this.timer);
  }
}

// ========== Form Validation (表单验证) ==========
export class FormValidation {
  constructor(form) {
    this.form = typeof form === 'string' ? document.querySelector(form) : form;
    this.validators = {};
    this.init();
  }

  init() {
    const inputs = this.form.querySelectorAll('[name]');

    inputs.forEach(input => {
      // 添加错误状态监听
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('input-error')) {
          this.validateField(input);
        }
      });
    });

    // 表单提交验证
    this.form.addEventListener('submit', (e) => {
      if (!this.validate()) {
        e.preventDefault();
      }
    });
  }

  validateField(field) {
    let isValid = true;
    let message = '';

    // 必填验证
    if (field.hasAttribute('required') && !field.value.trim()) {
      isValid = false;
      message = '此字段不能为空';
    }

    // 邮箱验证
    if (field.type === 'email' && field.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value)) {
        isValid = false;
        message = '请输入有效的邮箱地址';
      }
    }

    // 手机号验证
    if (field.type === 'tel' && field.value) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(field.value)) {
        isValid = false;
        message = '请输入有效的手机号';
      }
    }

    // URL 验证
    if (field.type === 'url' && field.value) {
      try {
        new URL(field.value);
      } catch {
        isValid = false;
        message = '请输入有效的 URL';
      }
    }

    // 自定义验证
    if (this.validators[field.name]) {
      const result = this.validators[field.name](field.value);
      if (result !== true) {
        isValid = false;
        message = result;
      }
    }

    this.setFieldState(field, isValid, message);
    return isValid;
  }

  setFieldState(field, isValid, message) {
    if (isValid) {
      field.classList.remove('input-error');
      field.classList.add('input-success');
      this.removeErrorMessage(field);
    } else {
      field.classList.remove('input-success');
      field.classList.add('input-error');
      this.showErrorMessage(field, message);
    }
  }

  showErrorMessage(field, message) {
    let errorEl = field.parentElement.querySelector('.input-error-message');

    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'input-error-message';
      field.parentElement.appendChild(errorEl);
    }

    errorEl.textContent = message;
  }

  removeErrorMessage(field) {
    const errorEl = field.parentElement.querySelector('.input-error-message');
    if (errorEl) {
      errorEl.remove();
    }
  }

  validate() {
    const inputs = this.form.querySelectorAll('[name]');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  addValidator(name, validator) {
    this.validators[name] = validator;
  }

  clearErrors() {
    const inputs = this.form.querySelectorAll('[name]');
    inputs.forEach(input => {
      input.classList.remove('input-error', 'input-success');
      this.removeErrorMessage(input);
    });
  }
}

// ========== Loading/Spinner (加载状态) ==========
export class Loading {
  static show(container, options = {}) {
    const {
      text = '加载中...',
      size = 'md',
      backgroundColor = 'rgba(255, 255, 255, 0.8)'
    } = options;

    const loading = document.createElement('div');
    loading.className = `loading-overlay loading-${size}`;
    loading.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: ${backgroundColor};
      z-index: 10;
    `;
    loading.innerHTML = `
      <div class="spinner"></div>
      ${text ? `<p class="mt-4 text-sm text-secondary">${text}</p>` : ''}
    `;

    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    container.style.position = 'relative';
    container.appendChild(loading);
    return loading;
  }

  static hide(container) {
    const loading = typeof container === 'string'
      ? document.querySelector(container)?.querySelector('.loading-overlay')
      : container.querySelector('.loading-overlay');

    if (loading) {
      loading.remove();
    }
  }
}

// ========== Search (搜索) ==========
export class Search {
  constructor(input, options = {}) {
    this.input = typeof input === 'string' ? document.querySelector(input) : input;
    this.options = {
      debounce: 300,
      onSearch: null,
      ...options
    };

    this.init();
  }

  init() {
    const handleSearch = debounce((value) => {
      if (this.options.onSearch) {
        this.options.onSearch(value);
      }
    }, this.options.debounce);

    this.input.addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });

    // 回车搜索
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (this.options.onSearch) {
          this.options.onSearch(this.input.value);
        }
      }
    });
  }
}

// ========== Pagination (分页) ==========
export class Pagination {
  constructor(element, options = {}) {
    this.pagination = typeof element === 'string' ? document.querySelector(element) : element;
    this.options = {
      currentPage: 1,
      totalPages: 1,
      siblings: 1,
      onPageChange: null,
      ...options
    };

    this.init();
  }

  init() {
    this.render();
  }

  render() {
    const { currentPage, totalPages, siblings } = this.options;

    let pages = [];

    if (totalPages <= 7) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const start = Math.max(2, currentPage - siblings);
      const end = Math.min(totalPages - 1, currentPage + siblings);

      pages.push(1);

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    this.pagination.innerHTML = `
      <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="prev">‹</button>

      ${pages.map(page =>
      page === '...'
        ? `<span class="pagination-dots">...</span>`
        : `<button class="pagination-btn ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`
    ).join('')}

      <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" data-page="next">›</button>
    `;

    // 绑定事件
    this.pagination.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (btn.classList.contains('disabled')) return;

        let page;
        if (e.target.dataset.page === 'prev') {
          page = currentPage - 1;
        } else if (e.target.dataset.page === 'next') {
          page = currentPage + 1;
        } else {
          page = parseInt(e.target.dataset.page, 10);
        }

        if (page && page !== currentPage) {
          this.options.currentPage = page;
          this.render();
          if (this.options.onPageChange) {
            this.options.onPageChange(page);
          }
        }
      });
    });
  }

  setPage(page) {
    this.options.currentPage = page;
    this.render();
  }
}

// ========== Export all ==========
export {
  Modal,
  Toast,
  Navigation,
  Tabs,
  Accordion,
  Tooltip,
  Dropdown,
  Carousel,
  FormValidation,
  Loading,
  Search,
  Pagination
};
