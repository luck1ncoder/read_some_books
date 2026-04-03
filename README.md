# 知识书包 — Web Highlighter & Knowledge Base

在任何网页上划线，AI 自动生成知识卡片，构建你的个人知识库。

## 功能概览

### 网页划线 & AI 卡片生成
- **选中文字** → 浮动工具栏出现 → 点「划线」或「批注」
- AI 自动生成三层解读：局部含义、上下文解读、划线意图
- 卡片自动归入话题分组

### 划线模式
- 点击扩展图标 → 开启「划线模式」→ 光标变荧光笔
- 选中即保存，Esc 退出

### 批注对话
- 点「批注」→ 侧边栏弹出，与 AI 深度讨论划线内容
- AI 扮演阅读伙伴：提问、找矛盾、拓展思考

### 存为书页
- 点击扩展图标 → 「存为书页」→ 提取页面结构
- 在知识库中以书页排版展示，支持翻页阅读

### 知识库 Web UI (`localhost:7749`)
- **全部卡片** — 网格布局，支持全文搜索
- **按来源** — 实木书架 UI，按网页分组，支持 BookView / ArticleView / 翻页阅读器
- **按话题** — AI 自动聚类分组，支持一键重新分组
- **卡片详情** — 三层 AI 解读 + 个人笔记 + AI 对话 + Markdown 导出
- **设置** — 配置 API Key、模型、自定义 API 地址

### 数据导出
- 单张卡片导出为 Markdown
- 全部卡片一键导出为 ZIP

---

## 快速开始

### 1. 安装依赖

```bash
cd server && npm install
cd server/web && npm install
cd extension && npm install
```

### 2. 构建

```bash
# 构建 Web UI（输出到 server/public/）
cd server/web && npm run build

# 构建 Chrome 扩展（输出到 extension/dist/）
cd extension && npm run build
```

### 3. 启动服务器

```bash
cd server
npm start
```

服务器运行在 `http://localhost:7749`。macOS 也可双击 `server/start.command`。

### 4. 加载 Chrome 扩展

1. 打开 `chrome://extensions/`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序** → 选择 `extension/dist` 目录

### 5. 配置 AI

打开 `http://localhost:7749/settings`，填入：
- **API Key** — OpenAI API Key（或兼容服务商的 Key）
- **Base URL**（可选）— 兼容 OpenAI 接口的服务地址（如 MiniMax: `https://api.minimax.chat/v1`）
- **模型** — 选择模型（默认 `gpt-4o`，也可填自定义模型名）

---

## 使用方法

### 日常使用

1. 在任意网页上 **选中文字**，浮动工具栏出现
2. 点 **「划线」** — 保存高亮，后台自动生成知识卡片
3. 点 **「批注」** — 保存高亮 + 打开侧边栏，与 AI 讨论
4. 打开 `http://localhost:7749` 查看知识库

### 扩展弹窗功能

点击浏览器工具栏的扩展图标：

| 按钮 | 功能 |
|------|------|
| **划线模式** | 光标变荧光笔，选中即保存，Esc 退出 |
| **存为书页** | 提取当前页面结构，在知识库中以书页形式展示 |
| **打开批注侧边栏** | 查看当前页面所有划线和批注 |
| **打开知识库** | 跳转到 `localhost:7749` |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 服务端 | Node.js + Express + TypeScript |
| 数据库 | SQLite (better-sqlite3, WAL mode) |
| Web 前端 | React 18 + TypeScript + React Router + Vite |
| Chrome 扩展 | Manifest V3 + React + CRXJS + Vite |
| AI | OpenAI API（可配置兼容服务商） |
| 流式传输 | Server-Sent Events (SSE) |
| 导出 | Markdown + ZIP (Archiver) |

## 项目结构

```
├── extension/                 # Chrome 扩展
│   └── src/
│       ├── background/        # Service Worker（CSP 代理、侧边栏管理）
│       ├── content/           # 内容脚本（划线、工具栏、页面提取）
│       ├── popup/             # 弹窗 UI
│       └── sidepanel/         # 批注侧边栏
├── server/                    # 后端服务
│   ├── src/
│   │   ├── ai/               # AI 客户端、Prompt、流式工具
│   │   ├── db/               # SQLite schema 与查询
│   │   └── routes/           # API 路由
│   └── web/                   # Web UI 前端
│       └── src/
│           ├── pages/         # 页面组件（知识库、卡片详情、设置）
│           └── components/    # UI 组件（书架、阅读器、卡片等）
└── data.db                    # SQLite 数据库（自动创建）
```

## 开发

```bash
# 服务端热重载
cd server && npm run dev

# Web UI 开发服务器
cd server/web && npm run dev

# 扩展开发构建（HMR）
cd extension && npm run dev

# 运行测试
cd server && npm test
```

---

## License

MIT
