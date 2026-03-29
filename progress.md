# 项目进展记录 — 知识书包 (website_reader)

> 下次开始新对话时，直接把这个文件内容贴给 AI，或者说"读一下 progress.md 继续"即可恢复上下文。

---

## 项目概览

个人知识库系统，由三个子项目组成：

| 子项目 | 路径 | 技术栈 | 说明 |
|--------|------|--------|------|
| 服务端 | `server/` | Node.js + Express + SQLite (better-sqlite3) | 端口 7749，tsx watch 热重载 |
| Web UI | `server/web/` | React + Vite | 构建到 `server/public/`，Express 静态托管 |
| Chrome 扩展 | `extension/` | React + Vite + CRXJS + MV3 | 内容脚本 + 后台 SW + Popup + 侧边栏 |

**设计语言：** Digital Atelier / Ivory Arch — 所有样式为内联 `style={{}}`，无 CSS Modules / Tailwind。

---

## 当前功能状态

### ✅ 已完成并正常工作

| 功能 | 说明 |
|------|------|
| 划线保存 | 选中文字 → 点「划线」→ bgFetch 代理 → 服务器存储 → 页面黄色标记 |
| AI 卡片生成 | 划线后后台自动调用 `/ai/explain` SSE 流 → 生成知识卡片 |
| 知识库 Web UI | `localhost:7749` — 卡片列表、按来源视图、设置页 |
| BookView | 有 `doc_structure` 的页面显示排版书页样式，支持展开/折叠 |
| ArticleView | 有 `full_text` 的页面显示阅读器样式，支持展开/折叠 |
| 存为书页 | Popup → 「存为书页」→ content script 提取 DOM 结构 → PATCH `/pages/:id/structure` |
| 划线模式 | Popup → 「划线模式」→ 荧光笔光标，选中即保存，Esc 退出 |
| 批注侧边栏（打开）| 点「批注」→ 侧边栏弹出（修复了 sidePanel.open 系列 bug） |

### 🔧 批注侧边栏 — 最新修复（本次对话核心工作）

**问题：** 点「批注」没反应，侧边栏不弹出；连 Popup 里的「打开批注侧边栏」也不行。

**根本原因（经过大量调试确认）：**

1. **`tabs.onUpdated` 禁用了侧边栏**：每次页面加载时调用 `sidePanel.setOptions({ enabled: false })`，导致后续任何 `sidePanel.open()` 调用都静默失败。
2. **用户手势 token 不跨越 async/await**：content script 里经过两次 `await bgFetch` 之后发送消息，手势上下文已失效，background 里的 `sidePanel.open()` 被 Chrome 拒绝。
3. **`setOptions` 回调里调 `open()` 也不行**：回调是异步的，手势同样过期。

**最终修复方案：**

```
// background/index.ts
// 改用 setPanelBehavior 替代 tabs.onUpdated 禁用
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {})

// onmousedown 里同步发消息（手势仍有效）→ background 立即 open()
// content script 不再需要 setOptions，panel 始终 enabled
```

```
// content/index.ts — onmousedown handler（手势有效时）
if (b.id === 'annotate') {
  chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL_NOW' })  // 同步，手势仍在
}
handleAction(b.id, text, anchor)  // async，手势在第一个 await 后失效

// handleAction 内 await bgFetch 保存完高亮后
chrome.runtime.sendMessage({ type: 'FOCUS_HIGHLIGHT', highlightId: hlId })
// sidepanel 直接收到（不经 background 转发，避免自环）
```

**所有规则已记录到 `AGENTS.md` 的 "Hard-Won Lessons" 章节（5 条规则）。**

### ⏳ 待验证

- [ ] 批注侧边栏弹出后自动定位到对应 highlight（FOCUS_HIGHLIGHT 轮询逻辑）
- [ ] 严格 CSP 网站（x.com 等）上 bgFetch 是否正常工作

---

## 关键文件索引

```
extension/src/
├── background/index.ts       # setPanelBehavior + FETCH代理 + OPEN_SIDEPANEL_NOW
├── content/index.ts          # bgFetch + showBar + handleAction + restoreAll
├── popup/Popup.tsx           # 三个按钮：划线模式 / 存为书页 / 打开侧边栏
└── sidepanel/
    ├── App.tsx               # 加载 highlights + 监听 FOCUS_HIGHLIGHT 轮询
    └── components/
        └── HighlightList.tsx # AnnotationThread: GET/POST /highlights/:id/messages + /chat SSE

server/src/
├── index.ts                  # Express 入口，所有路由注册
├── db/
│   ├── schema.ts             # SQLite schema + 迁移（doc_structure 已加）
│   └── queries.ts            # 所有 SQL helper
└── routes/
    ├── pages.ts              # POST / + GET /:id + PATCH /:id/structure
    ├── highlights.ts         # POST / + GET ?url=
    ├── highlightChat.ts      # GET/POST /:id/messages + POST /:id/chat (SSE)
    ├── explain.ts            # GET /ai/explain (SSE 三段式)
    ├── cards.ts              # CRUD
    ├── cluster.ts            # AI 聚类（已修复 think tag 过滤）
    └── settings.ts           # API key / model / baseURL

server/web/src/
├── api.ts                    # getPageDetail / getHighlightMessages / savePageStructure
├── pages/
│   ├── LibraryPage.tsx       # SiteGroup + SiteView (BookView/ArticleView/CardGrid)
│   ├── CardDetailPage.tsx
│   └── SettingsPage.tsx
└── components/
    ├── BookView.tsx          # doc_structure 排版视图，展开/折叠，AnnotPopover
    └── ArticleView.tsx       # full_text 阅读器视图，展开/折叠，侧边批注面板
```

---

## 重要架构决策与经验

### bgFetch — 所有 content script 服务器请求必须走代理

```ts
// content script 直接 fetch 会被严格 CSP 网站拦截
// 必须通过 bgFetch → background service worker → 真实 fetch
async function bgFetch(url: string, options?: RequestInit): Promise<any> { ... }
```

例外：`/ai/explain` SSE 流无法代理（background 会 JSON 解析），保持直接 fetch，失败静默忽略。

### 按来源视图的三种渲染模式

| 条件 | 组件 |
|------|------|
| `doc_structure` 存在且非空 | `BookView`（羊皮纸背景，书脊，章节 TOC） |
| 无 `doc_structure` 但有 `full_text` | `ArticleView`（行级阅读器，段落高亮） |
| 两者都没有 | `CardGrid`（原始两列卡片网格） |

### 服务器热重载注意事项

`tsx watch` 不可靠，多进程堆积后旧进程拦截请求，表现为路由返回 HTML。
**修改路由后务必杀掉所有 tsx 进程再重启。**

---

## 启动命令速查

```bash
# 启动服务器（从 server/ 目录）
npm run dev

# 构建 Web UI（从 server/web/ 目录）
npm run build

# 构建扩展（从 extension/ 目录）
npm run build
# 然后去 chrome://extensions 重新加载，再刷新目标网页
```

---

## 下次继续的方向

1. **验证批注功能**：加载扩展后测试批注完整链路
2. **可能的后续功能**：
   - 改进 `extractDocStructure()` 对更多网站的支持
   - ArticleView 中划线颜色区分（有批注 vs 仅划线）
   - 其他用户提出的需求
