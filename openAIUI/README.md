# OpenAI-Style Design System

基于 OpenAI API 文档页面的完整 UI 组件库，包含 CSS 样式、动画效果和 JavaScript 交互组件。

## 📁 项目结构

```
openAIUI/
├── src/
│   ├── styles/
│   │   ├── variables.css    # CSS 变量（颜色、字体、间距等）
│   │   ├── base.css         # 基础样式和重置
│   │   ├── components.css   # 组件样式
│   │   └── animations.css   # 动画效果
│   └── js/
│       ├── utils.js         # 工具函数
│       └── components.js    # 组件交互
├── demo.html                # Demo 展示页面
└── README.md                # 文档
```

## 🚀 快速开始

### 1. 引入 CSS 文件

```html
<link rel="stylesheet" href="./src/styles/variables.css">
<link rel="stylesheet" href="./src/styles/base.css">
<link rel="stylesheet" href="./src/styles/components.css">
<link rel="stylesheet" href="./src/styles/animations.css">
```

### 2. 使用组件

```html
<!-- 按钮 -->
<button class="btn btn-primary">主要按钮</button>
<button class="btn btn-secondary">次要按钮</button>
<button class="btn btn-ghost">幽灵按钮</button>

<!-- 卡片 -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">卡片标题</h3>
  </div>
  <div class="card-body">
    <p>卡片内容</p>
  </div>
</div>

<!-- 输入框 -->
<input type="text" class="input" placeholder="请输入...">
```

### 3. 使用 JavaScript 组件

```html
<script type="module">
  import { Modal, Toast } from './src/js/components.js';

  // 显示模态框
  const modal = new Modal({
    title: '标题',
    content: '<p>内容</p>'
  });
  modal.open();

  // 显示提示
  Toast.success('操作成功!');
  Toast.error('操作失败');
</script>
```

## 🎨 组件列表

### 按钮 (Buttons)
- `btn-primary` - 主要按钮
- `btn-secondary` - 次要按钮
- `btn-ghost` - 幽灵按钮
- `btn-outline` - 描边按钮
- `btn-success/danger/warning` - 颜色变体
- `btn-sm/lg` - 尺寸变体
- `btn.loading` - 加载状态

### 卡片 (Cards)
- `card` - 基础卡片
- `card-interactive` - 可交互卡片
- `card-elevated` - elevated 卡片
- `card-compact` - 紧凑卡片

### 表单 (Forms)
- `input` - 输入框
- `input-error` - 错误状态
- `input-success` - 成功状态
- `select` - 下拉选择
- `textarea` - 文本域
- `checkbox-group` - 复选框
- `radio-group` - 单选框
- `switch` - 开关

### 徽章 (Badges)
- `badge-primary/success/danger/warning/info` - 颜色变体
- `badge-sm/lg` - 尺寸变体
- `pill` - 胶囊标签

### 提示框 (Alerts)
- `alert alert-info` - 信息提示
- `alert alert-success` - 成功提示
- `alert alert-warning` - 警告提示
- `alert alert-danger` - 错误提示
- `alert-dismissible` - 可关闭提示

### 模态框 (Modals)
- `Modal` 类 - 模态框组件
- `modal-sm/md/lg/xl` - 尺寸变体
- `modal-bottom-sheet` - 底部弹窗

### 提示 (Toast)
- `Toast.info()` - 信息提示
- `Toast.success()` - 成功提示
- `Toast.warning()` - 警告提示
- `Toast.error()` - 错误提示

### 动画 (Animations)
- `animate-fadeIn/out` - 淡入淡出
- `animate-slideUp/Down` - 滑动效果
- `animate-scaleIn` - 缩放效果
- `animate-bounce` - 弹跳效果
- `animate-pulse` - 脉冲效果
- `animate-shake` - 抖动效果
- `animate-spin` - 旋转效果

### 其他组件
- `code-block` - 代码块
- `progress` - 进度条
- `spinner` - 加载 spinner
- `skeleton` - 骨架屏
- `breadcrumb` - 面包屑
- `timeline` - 时间线
- `avatar` - 头像
- `tooltip` - 工具提示

## 🎯 设计特点

### 颜色系统
- 完整的灰度色系 (gray-0 到 gray-1000)
- 语义化颜色 (success, danger, warning, info)
- 支持 OKLab 颜色空间
- 深色模式支持

### 字体系统
- 主字体："OpenAI Sans"
- 等宽字体："SF Mono"
- 完整的字体大小系统
- 行高和字间距控制

### 间距系统
- 基于 0.25rem 的间距单位
- 从 spacing-1 到 spacing-32
- 响应式断点支持

### 圆角系统
- 从 radius-2xs 到 radius-full
- 按钮使用完全圆角
- 卡片使用中等圆角

### 动画系统
- 平滑的过渡动画
- 多种预设动画效果
- 性能优化的动画实现

## 📱 响应式支持

```css
/* 断点 */
--breakpoint-xs: 380px;
--breakpoint-sm: 576px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;

/* 响应式类 */
.md\:grid-cols-2
.lg\:grid-cols-3
```

## 🌙 深色模式

```html
<!-- 自动切换 -->
<button onclick="toggleDarkMode()">切换主题</button>

<!-- 自动检测系统偏好 -->
<script>
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
</script>
```

## 🛠️ JavaScript 工具

### DOM 操作
```javascript
import { $, $all, create, on, off } from './src/js/utils.js';

const element = $('.selector');
const elements = $all('.selector');
const newEl = create('div', { class: 'my-class' }, '内容');
```

### 网络请求
```javascript
import { get, post } from './src/js/utils.js';

const data = await get('/api/users');
const result = await post('/api/users', { name: 'John' });
```

### 表单验证
```javascript
import { FormValidation } from './src/js/components.js';

const validator = new FormValidation('#my-form');
validator.addValidator('username', value => {
  return value.length >= 6 ? true : '用户名至少 6 个字符';
});
```

### 事件总线
```javascript
import { bus } from './src/js/utils.js';

bus.on('user:login', (data) => {
  console.log('用户登录:', data);
});

bus.emit('user:login', { userId: 123 });
```

## 📖 使用示例

### 完整表单示例
```html
<form id="login-form">
  <div class="form-group mb-4">
    <label class="input-label">邮箱</label>
    <input type="email" class="input" name="email" required>
  </div>
  <div class="form-group mb-4">
    <label class="input-label">密码</label>
    <input type="password" class="input" name="password" required>
  </div>
  <button type="submit" class="btn btn-primary w-full">登录</button>
</form>

<script type="module">
  import { FormValidation } from './src/js/components.js';
  
  const form = new FormValidation('#login-form');
  
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    if (form.validate()) {
      const data = new FormData(e.target);
      const response = await fetch('/api/login', {
        method: 'POST',
        body: Object.fromEntries(data)
      });
    }
  });
</script>
```

## 🔗 资源

- [OpenAI API 文档](https://platform.openai.com/docs)
- [CSS OKLab 颜色空间](https://oklch.com/)
- [Modern CSS Techniques](https://moderncss.dev/)

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request!

## 🙏 致谢

感谢 OpenAI 提供的设计灵感。
