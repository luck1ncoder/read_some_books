# 书籍动画方案设计

> 日期：2026-03-29
> 状态：已确认

---

## 目标

将知识库的「按来源」视图从当前的竖向列表改造为完整的书架 → 阅读体验，包含：

1. **书架页面** — 实木书架上竖立的书籍
2. **打开过渡** — 书从书架上抽出放大到阅读器
3. **翻页阅读** — CSS 3D 翻页，响应式单页/双页
4. **书感装饰** — 纸张质感、书脊、页码、边缘泛黄

---

## 数据映射

| 概念 | 系统实体 |
|------|----------|
| 一本书 | 一个 page（一个 URL） |
| 封面信息 | 域名 + page_title + 划线数 |
| 书页内容 | `doc_structure`（DocNode[]）或 `full_text`（段落拆分） |
| 章节 | DocNode 中的 h2（fallback h3） |

---

## 组件架构

```
LibraryPage (filter=site)
└── Bookshelf              ← 新组件，替代现有 SiteView
    ├── BookCover × N       ← 新组件，书架上的每本书
    └── BookReader           ← 新组件，打开后的阅读器
        ├── BookPage × 2     ← 新组件，单页内容渲染
        ├── PageFlipper       ← 新组件，翻页动画控制
        ├── BookNode          ← 复用现有（BookView.tsx）
        └── AnnotPopover      ← 复用现有（BookView.tsx）
```

### 文件规划

| 文件 | 说明 |
|------|------|
| `server/web/src/components/Bookshelf.tsx` | 书架 + 书封面 + 打开动画 |
| `server/web/src/components/BookReader.tsx` | 阅读器 + 分页 + 翻页 + 书感装饰 |
| `server/web/src/components/BookView.tsx` | 保留 BookNode、AnnotPopover、DocNode 接口供复用 |

---

## 1. 书架 (Bookshelf)

### 视觉

- **木纹横板**：CSS 渐变模拟，不用图片
  - 横板颜色：`linear-gradient(to bottom, #8B7355, #6B5B45, #7A6A52)` 叠加细条纹
  - 横板高度：约 16-20px，每排书下方一条
  - 横板投影：`box-shadow: 0 4px 8px rgba(0,0,0,0.2)` 给书架立体感
- **背景**：深色木纹或暗色墙壁 `#2a2318`，衬托书架
- **每排 4-5 本书**，响应式 — 用 CSS grid `repeat(auto-fill, minmax(140px, 1fr))`

### BookCover

- **尺寸**：约 140×195px，竖向矩形
- **封面配色**：从域名 hash 生成柔和色系（6 种预设暖色，取 hash % 6）
  - 预设色板：`['#8B4513','#2F4F4F','#4A3728','#1B3A4B','#3C2415','#2D4A3E']`
- **封面内容**（自上而下）：
  - 域名（顶部小字，10px，浅色，letterSpacing）
  - 页面标题（居中，13-14px，最多 3 行，ellipsis）
  - 底部装饰线 + 「N 处划线」（10px）
- **书脊效果**：左侧 4px 渐变条，模拟书脊厚度
- **3D 微倾斜**：`transform: perspective(800px) rotateY(-5deg)`，给书竖立感
- **投影**：`box-shadow: 4px 4px 12px rgba(0,0,0,0.3)`

### 悬停效果

- 书向上抽出 8-12px：`translateY(-10px)`
- 投影加深加大
- 过渡 200ms ease-out

---

## 2. 打开过渡动画

### 流程

1. 记录被点击书封面的 DOM 位置（`getBoundingClientRect()`）
2. 创建一个「飞行中」的封面副本，fixed 定位在原始位置
3. 书架内容开始淡出（opacity 0，300ms）
4. 副本 transition 到阅读器目标位置 + 尺寸（400-500ms，cubic-bezier(0.4,0,0.2,1)）
5. 副本淡出，阅读器淡入
6. 清理副本 DOM

### 返回动画

- 逆向执行：阅读器淡出 → 副本从阅读器位置缩回书架位置 → 书架淡入

### 实现

- 纯 CSS transition + JS 计算坐标
- 使用 React state 管理动画阶段：`'shelf' | 'opening' | 'reading' | 'closing'`
- 不引入任何动画库

---

## 3. 阅读器 (BookReader)

### 分页逻辑

1. 将 DocNode[] 渲染到一个 `visibility: hidden` 的测量容器中
2. 逐个累加节点高度，当累计高度接近页面容器高度（约 500px）时断页
3. 得到 `pages: DocNode[][]` 数组
4. 测量在 `useEffect` 中执行一次，结果缓存到 state
5. 对于 `full_text`（无 doc_structure）的页面：先按 `\n` 拆段落，每段包装为 `{type:'p', text}` 的 DocNode，再走同样的分页流程

### 响应式布局

- **宽屏（≥900px）**：双页展开
  - 左页：偶数页（0, 2, 4...）
  - 右页：奇数页（1, 3, 5...）
  - 中间书脊：4-6px 渐变阴影分隔
  - 总宽度约 800-900px
- **窄屏（<900px）**：单页
  - 居中显示当前页
  - 宽度约 400-450px

### 翻页控制

- **键盘**：← → 翻页
- **点击区域**：页面左 1/3 向前翻，右 1/3 向后翻
- **底部页码**：「第 3 / 12 页」居中显示，可点击跳转
- **目录**：沿用现有的 TOC dots（右侧小圆点），点击跳到对应章节所在页

---

## 4. CSS 3D 翻页动画 (PageFlipper)

### 原理

```
perspective: 1200px 在容器上
当前页 rotateY(0deg) → rotateY(-180deg)  transform-origin: left center
下一页从 rotateY(180deg) → rotateY(0deg)  同理
```

### 细节

- `backface-visibility: hidden` 隐藏背面
- 翻页时长 600ms，`cubic-bezier(0.645, 0.045, 0.355, 1)` — 模拟纸张阻力
- 翻页过程中加 `box-shadow` 在翻动页的边缘，模拟纸张厚度投影
- 翻页方向：右页向左翻（下一页），左页向右翻（上一页）

### 状态管理

```ts
type FlipState = 'idle' | 'flipping-forward' | 'flipping-backward'

// 翻页流程
// 1. 设置 flipState = 'flipping-forward'
// 2. CSS transition 执行 600ms
// 3. onTransitionEnd → 更新 currentPage，设置 flipState = 'idle'
```

---

## 5. 书感装饰

| 元素 | 实现方式 |
|------|----------|
| 纸张底色 | `#fffef9`（保持现有） |
| 纸张纹理 | 极细微的 CSS noise — 多层 `radial-gradient` 随机点，opacity 0.03 |
| 右侧泛黄 | `linear-gradient(to right, transparent 85%, rgba(200,190,170,0.15))` |
| 书脊阴影（双页中缝）| `linear-gradient` 左页右边缘 + 右页左边缘各 8px 内阴影 |
| 页面投影 | `box-shadow: 0 2px 20px rgba(0,0,0,0.1)` |
| 页码 | 底部居中，10px，色 `#b0a693`，页面页脚区域 |
| 页眉 | 域名左上 + 日期右上，沿用现有 BookView 样式 |
| 翻页阴影 | 翻页动画期间 `box-shadow` 随 rotateY 角度变化 |

---

## 6. 与现有代码的关系

### 保留

- `BookNode` — 渲染单个 DocNode，支持高亮和批注弹窗
- `AnnotPopover` — 点击高亮弹出批注对话
- `DocNode` 接口 — 不变
- `shared.tsx` 所有共享组件 — 不变
- `ArticleView` — 不变，用于无 doc_structure 的页面在书架内的降级显示

### 修改

- `LibraryPage.tsx` 的 `SiteView` — 替换为 `Bookshelf` 组件
- `BookView.tsx` — 导出 `BookNode`、`AnnotPopover`、`DocNode` 供 `BookReader` 复用，`BookView` 本身仍可作为 fallback

### 新建

- `Bookshelf.tsx` — 书架 + BookCover + 打开/关闭动画
- `BookReader.tsx` — 阅读器 + 分页 + 翻页

---

## 7. 降级策略

| 情况 | 处理 |
|------|------|
| 页面无 doc_structure 也无 full_text | 书架上仍显示封面，打开后显示卡片网格（现有 CardGrid 行为） |
| 页面有 full_text 无 doc_structure | 将 full_text 按段落拆为 DocNode[]，走翻页阅读 |
| doc_structure 节点极少（<3） | 单页显示，不分页 |
| 浏览器不支持 CSS 3D | perspective 不生效时退化为滑动切换 |
