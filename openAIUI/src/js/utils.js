/**
 * OpenAI-Style Design System - JavaScript Utilities
 * 通用工具函数库
 */

// ========== DOM Utilities ==========

/**
 * 安全地查询 DOM 元素
 * @param {string} selector - CSS 选择器
 * @param {Element} context - 查询上下文，默认为 document
 * @returns {Element|null}
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * 查询所有匹配的 DOM 元素
 * @param {string} selector - CSS 选择器
 * @param {Element} context - 查询上下文
 * @returns {NodeList}
 */
export function $all(selector, context = document) {
  return context.querySelectorAll(selector);
}

/**
 * 创建元素
 * @param {string} tag - 标签名
 * @param {Object} attrs - 属性对象
 * @param {string|Node} content - 内容
 * @returns {Element}
 */
export function create(tag = 'div', attrs = {}, content = '') {
  const el = document.createElement(tag);

  if (attrs.class) {
    el.className = attrs.class;
  }

  if (attrs.style) {
    Object.assign(el.style, attrs.style);
  }

  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'class' && key !== 'style') {
      el.setAttribute(key, value);
    }
  }

  if (typeof content === 'string') {
    el.innerHTML = content;
  } else if (content instanceof Node) {
    el.appendChild(content);
  }

  return el;
}

/**
 * 添加事件监听
 * @param {Element} el - 目标元素
 * @param {string} event - 事件名
 * @param {Function} handler - 处理函数
 * @param {Object} options - 事件选项
 */
export function on(el, event, handler, options = false) {
  el.addEventListener(event, handler, options);
}

/**
 * 移除事件监听
 */
export function off(el, event, handler, options = false) {
  el.removeEventListener(event, handler, options);
}

/**
 * 委托事件监听
 */
export function delegate(el, selector, event, handler) {
  el.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && target.within(el)) {
      handler.call(target, e);
    }
  });
}

/**
 * 添加 CSS 类
 */
export function addClass(el, ...classes) {
  el.classList.add(...classes);
}

/**
 * 移除 CSS 类
 */
export function removeClass(el, ...classes) {
  el.classList.remove(...classes);
}

/**
 * 切换 CSS 类
 */
export function toggleClass(el, className, force) {
  el.classList.toggle(className, force);
}

/**
 * 检查元素是否有某个类
 */
export function hasClass(el, className) {
  return el.classList.contains(className);
}

// ========== Animation Utilities ==========

/**
 * 触发动画
 * @param {Element} el - 目标元素
 * @param {string} animationName - 动画名称
 * @param {Object} options - 动画选项
 */
export function animate(el, animationName, options = {}) {
  const {
    duration = 300,
    easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
    delay = 0,
    iteration = 1,
    callback
  } = options;

  el.style.animation = `${animationName} ${duration}ms ${easing} ${delay}ms ${iteration}`;

  if (callback) {
    const handler = (e) => {
      if (e.animationName === animationName) {
        callback();
        el.removeEventListener('animationend', handler);
      }
    };
    el.addEventListener('animationend', handler);
  }
}

/**
 * 淡入效果
 */
export function fadeIn(el, duration = 300) {
  el.style.opacity = '0';
  el.style.transition = `opacity ${duration}ms ease`;

  requestAnimationFrame(() => {
    el.style.opacity = '1';
  });
}

/**
 * 淡出效果
 */
export function fadeOut(el, duration = 300, callback) {
  el.style.transition = `opacity ${duration}ms ease`;
  el.style.opacity = '0';

  setTimeout(() => {
    el.style.display = 'none';
    if (callback) callback();
  }, duration);
}

/**
 * 滑入效果
 */
export function slideIn(el, direction = 'up', duration = 300) {
  const translations = {
    up: 'translateY(20px)',
    down: 'translateY(-20px)',
    left: 'translateX(-20px)',
    right: 'translateX(20px)'
  };

  el.style.opacity = '0';
  el.style.transform = translations[direction];
  el.style.transition = `all ${duration}ms var(--transition-timing-default)`;

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

// ========== Scroll Utilities ==========

/**
 * 平滑滚动到元素
 */
export function scrollToElement(el, options = {}) {
  const behavior = options.behavior || 'smooth';
  const block = options.block || 'start';

  el.scrollIntoView({ behavior, block });
}

/**
 * 平滑滚动到指定位置
 */
export function scrollTo(y, duration = 500) {
  const start = window.pageYOffset;
  const change = y - start;
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    window.scrollTo(0, start + change * ease);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * 检查元素是否在视口中
 */
export function isInViewport(el, partial = false) {
  const rect = el.getBoundingClientRect();

  if (partial) {
    return (
      rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
      rect.bottom > 0
    );
  }

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// ========== Storage Utilities ==========

/**
 * 从 localStorage 获取数据
 */
export function getStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 向 localStorage 存储数据
 */
export function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 从 localStorage 移除数据
 */
export function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

// ========== Network Utilities ==========

/**
 * 发送 HTTP 请求
 */
export async function request(url, options = {}) {
  const {
    method = 'GET',
    data = null,
    headers = {},
    timeout = 30000,
    ...rest
  } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    signal: controller.signal,
    ...rest
  };

  if (method !== 'GET' && data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    clearTimeout(id);

    const contentType = response.headers.get('content-type');
    let result;

    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * GET 请求
 */
export function get(url, options = {}) {
  return request(url, { ...options, method: 'GET' });
}

/**
 * POST 请求
 */
export function post(url, data, options = {}) {
  return request(url, { ...options, method: 'POST', data });
}

/**
 * PUT 请求
 */
export function put(url, data, options = {}) {
  return request(url, { ...options, method: 'PUT', data });
}

/**
 * DELETE 请求
 */
export function del(url, options = {}) {
  return request(url, { ...options, method: 'DELETE' });
}

// ========== Debounce & Throttle ==========

/**
 * 防抖函数
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;

  return function(...args) {
    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    }, wait);

    if (callNow) func.apply(this, args);
  };
}

/**
 * 节流函数
 */
export function throttle(func, limit = 300) {
  let inThrottle;

  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ========== Format Utilities ==========

/**
 * 格式化日期
 */
export function formatDate(date, format = 'yyyy-MM-dd') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('yyyy', year)
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化数字
 */
export function formatNumber(num, decimals = 0) {
  return Number(num).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 相对时间格式化
 */
export function formatRelativeTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);

  const seconds = Math.floor(diff);
  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);
  const weeks = Math.floor(diff / 604800);
  const months = Math.floor(diff / 2592000);
  const years = Math.floor(diff / 31536000);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  if (weeks < 4) return `${weeks}周前`;
  if (months < 12) return `${months}个月前`;
  return `${years}年前`;
}

// ========== Validation Utilities ==========

/**
 * 验证邮箱
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * 验证手机号
 */
export function isValidPhone(phone) {
  const re = /^1[3-9]\d{9}$/;
  return re.test(phone);
}

/**
 * 验证 URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证身份证
 */
export function isValidIdCard(idCard) {
  const re = /^\d{17}[\dXx]$/;
  return re.test(idCard);
}

// ========== Class Utils ==========

/**
 * 绑定方法
 */
export function bind(method, context) {
  return function(...args) {
    return method.apply(context, args);
  };
}

/**
 * 深拷贝
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
  }

  return cloned;
}

/**
 * 防抖
 */
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 节流
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 获取 URL 参数
 */
export function getURLParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * 设置 URL 参数
 */
export function setURLParam(name, value) {
  const url = new URL(window.location);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url);
}

/**
 * 生成 UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 数组去重
 */
export function uniqueArray(arr) {
  return [...new Set(arr)];
}

/**
 * 数组分组
 */
export function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {});
}

/**
 * 延迟执行
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取元素尺寸
 */
export function getDimensions(el) {
  const rect = el.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom
  };
}

/**
 * 检查是否在深色模式
 */
export function isDarkMode() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/**
 * 切换深色模式
 */
export function toggleDarkMode() {
  const isDark = isDarkMode();
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  setStorage('theme', isDark ? 'light' : 'dark');
}

// ========== Debounce & Throttle ==========

/**
 * 防抖函数 - 在指定时间内只执行最后一次
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function}
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;

  return function(...args) {
    const call = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };

    const shouldCall = !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(call, wait);

    if (shouldCall && immediate) func.apply(this, args);
  };
}

/**
 * 节流函数 - 在指定时间内只执行一次
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;

  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ========== Debounce & Throttle ==========

/**
 * 防抖函数
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle(fn, delay = 300) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

// ========== Format Utilities ==========

/**
 * 格式化日期
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化数字为千分位
 */
export function formatNumber(num, decimals = 0) {
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// ========== Validation ==========

/**
 * 验证邮箱格式
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 验证手机号
 */
export function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 验证 URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ========== Storage ==========

/**
 * localStorage 封装
 */
export const storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

// ========== HTTP Request ==========

/**
 * 通用 HTTP 请求封装
 */
export const http = {
  async request(url, options = {}) {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const config = { ...defaultOptions, ...options };

    if (config.data) {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.data);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  },

  get(url) {
    return this.request(url);
  },

  post(url, data) {
    return this.request(url, { method: 'POST', data });
  },

  put(url, data) {
    return this.request(url, { method: 'PUT', data });
  },

  delete(url) {
    return this.request(url, { method: 'DELETE' });
  }
};

// ========== Event Bus ==========

/**
 * 简单的事件总线
 */
export class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}

// 全局事件总线实例
export const bus = new EventBus();
