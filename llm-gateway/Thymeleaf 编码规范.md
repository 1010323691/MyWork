# Thymeleaf 编码规范

## 一、标准目录结构

```
src/
└── main/
    ├── java/
    │   └── com.example/
    │       ├── controller/
    │       ├── service/
    │       └── model/
    └── resources/
        ├── static/
        │   ├── css/
        │   │   ├── base.css          # 全局基础样式
        │   │   ├── layout.css        # 布局样式
        │   │   └── components/       # 组件样式
        │   │       ├── header.css
        │   │       ├── nav.css
        │   │       └── ...
        │   └── js/
        │       ├── common.js         # 通用交互逻辑
        │       └── pages/            # 页面级交互脚本
        │           ├── user-list.js
        │           └── dashboard.js
        └── templates/
            ├── layout/
            │   └── base.html         # 基础布局（主框架）
            ├── fragments/            # 可复用组件
            │   ├── header.html
            │   ├── nav.html
            │   ├── footer.html
            │   └── xxxx.html
            └── pages/                # 页面模板
                ├── index.html
                ├── dashboard.html    # 管理员、用户 共用面板
                ├── xxxx.html         # 其他公用页面
                ├── admin/            # 管理员
                │   ├── list.html
                │   └── xxxx.html
                └── user/             # 用户
                    ├── list.html
                    └── xxxx.html
```

---

## 二、布局分层规范

### 2.1 base layout（基础布局）

`templates/layout/base.html` — 定义全局 HTML 骨架，统一引入公共资源。

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org"
      th:fragment="layout(title, content)">
<head>
  <meta charset="UTF-8"/>
  <title th:replace="${title}">默认标题</title>
  <link rel="stylesheet" th:href="@{/css/base.css}"/>
  <link rel="stylesheet" th:href="@{/css/layout.css}"/>
  <!-- 页面自定义样式插槽 -->
  <th:block th:replace="${styles}"></th:block>
</head>
<body>
  <header th:insert="~{fragments/header :: header}"></header>
  <nav th:insert="~{fragments/nav :: nav}"></nav>

  <main>
    <th:block th:replace="${content}"></th:block>
  </main>

  <footer th:insert="~{fragments/footer :: footer}"></footer>

  <script th:src="@{/js/common.js}"></script>
  <!-- 页面自定义脚本插槽 -->
  <th:block th:replace="${scripts}"></th:block>
</body>
</html>
```

### 2.2 page template（页面模板）

`templates/pages/user/list.html` — 使用 layout，只填充本页内容。

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org"
      th:replace="~{layout/base :: layout(
        ~{::title},
        ~{::main-content},
        ~{::page-styles},
        ~{::page-scripts}
      )}">
<head>
  <title th:fragment="title">用户列表</title>
  <!-- 本页样式 -->
  <th:block th:fragment="page-styles">
    <link rel="stylesheet" th:href="@{/css/components/user-card.css}"/>
  </th:block>
</head>
<body>
  <main th:fragment="main-content">
    <!-- 页面独有内容 -->
    <div class="page-header">
      <h1>用户管理</h1>
    </div>
    <div class="user-list">
      <div th:each="user : ${users}"
           th:insert="~{fragments/user-card :: user-card(${user})}">
      </div>
    </div>
  </main>

  <!-- 本页脚本 -->
  <th:block th:fragment="page-scripts">
    <script th:src="@{/js/pages/user-list.js}"></script>
  </th:block>
</body>
</html>
```

---

## 三、Fragment 组件规范

**定义**：使用 `th:fragment`，支持参数传入。

```html
<!-- fragments/user-card.html -->
<div th:fragment="user-card(user)" class="user-card">
  <img th:src="${user.avatar}" th:alt="${user.name}"/>
  <span th:text="${user.name}">用户名</span>
  <span th:text="${user.role}">角色</span>
  <a th:href="@{/user/{id}(id=${user.id})}">查看详情</a>
</div>
```

**引入方式**：

| 方式 | 说明 |
|---|---|
| `th:insert` | 将 fragment 插入当前标签内部 |
| `th:replace` | 用 fragment 替换当前标签 |

```html
<!-- 推荐：replace 方式，避免多余标签层 -->
<div th:replace="~{fragments/user-card :: user-card(${user})}"></div>
```

---

## 四、Thymeleaf 使用规范

### 条件与循环

```html
<!-- 条件渲染 -->
<div th:if="${user.isAdmin}">管理员菜单</div>
<div th:unless="${user.isAdmin}">普通菜单</div>

<!-- 列表渲染 -->
<tr th:each="item, stat : ${items}">
  <td th:text="${stat.index + 1}">1</td>
  <td th:text="${item.name}">名称</td>
</tr>

<!-- 表单绑定 -->
<form th:object="${userForm}" th:action="@{/user/save}" method="post">
  <input th:field="*{name}" type="text"/>
  <input th:field="*{email}" type="email"/>
</form>
```

### 禁止写法

```html
<!-- ❌ 禁止：页面内写复杂逻辑 -->
<span th:text="${user.orders.stream().filter(o -> o.status == 1).count()}"></span>

<!-- ✅ 正确：逻辑放 Controller/Service，Model 传入结果 -->
<span th:text="${activeOrderCount}"></span>
```

---

## 五、CSS / JS 解耦规范

- **禁止** 在 HTML 中写 `<style>` 块（内联 `style=""` 仅用于动态值，如宽度/颜色变量）
- **禁止** 在 HTML 中写 `<script>` 内联逻辑代码
- 所有样式 → `/static/css/`，所有脚本 → `/static/js/`
- JS 仅处理**交互行为**（点击、Ajax、动画），禁止用 `innerHTML` 拼接页面结构

```javascript
// ✅ 允许：Ajax 请求后更新数据（非结构）
fetch('/api/user/1')
  .then(res => res.json())
  .then(data => {
    document.getElementById('username').textContent = data.name;
  });

// ❌ 禁止：用 JS 拼接 HTML 结构 (必要情况除外)
container.innerHTML = `<div class="user-card"><span>${data.name}</span></div>`;
```

---

## 六、命名规范

| 类型 | 命名规则 | 示例 |
|---|---|---|
| Fragment 文件 | 语义化 kebab-case | `user-card.html` |
| Fragment 名称 | 与文件名一致 | `th:fragment="user-card"` |
| CSS 文件 | 按组件/页面命名 | `header.css` / `user-list.css` |
| JS 文件 | 按页面功能命名 | `user-list.js` |
| CSS 类名 | BEM 或语义化 | `.user-card__avatar` |

---

## 七、开发检查清单

- [ ] 页面是否通过 `layout/base.html` 统一结构？
- [ ] 可复用 UI 是否已拆分为 fragment？
- [ ] HTML 中无内联 `<style>` 和 `<script>` 逻辑？
- [ ] 无 `innerHTML` 拼接 DOM？
- [ ] 复杂逻辑是否已移至后端 Model？
- [ ] 命名是否语义化？