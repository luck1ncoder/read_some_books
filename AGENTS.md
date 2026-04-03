# AGENTS.md — Coding Agent Guidelines

This file describes the repository structure, build/test commands, and code style
conventions for AI coding agents working in this codebase.

---

## Repository Overview

This is a **monorepo with three independent sub-projects** and no root-level
`package.json`. Each sub-project has its own `node_modules` and must be installed
and run independently.

```
website_reader/
├── extension/        # Chrome Extension (Vite + CRXJS + React + TypeScript)
├── server/           # Node.js + Express backend (TypeScript, SQLite)
│   └── web/          # React Web UI (Vite, builds into server/public/)
└── .claude/          # Claude AI skill definitions (do not modify)
```

**The server runs on port 7749 (hardcoded).** Do not change this without updating
all three sub-projects.

---

## Build / Dev / Test Commands

All commands must be run from the correct sub-project directory.

### Server (`server/`)

```bash
npm install            # install dependencies
npm run dev            # start with hot-reload (tsx watch)
npm start              # start in production mode (tsx)
npm test               # run all tests once (vitest run)
npm run build:web      # build the web UI into server/public/
```

### Run a single test file

```bash
# From server/
npx vitest run src/db/queries.test.ts
npx vitest run src/routes/routes.test.ts
```

### Run tests matching a name pattern

```bash
# From server/
npx vitest run --reporter=verbose -t "should save and retrieve highlights"
```

### Web UI (`server/web/`)

```bash
npm install            # install dependencies
npm run dev            # dev server with API proxy to localhost:7749
npm run build          # build into server/public/ (output dir: ../)
```

### Extension (`extension/`)

```bash
npm install            # install dependencies
npm run dev            # Vite dev build with CRXJS HMR
npm run build          # production build → dist/
```

Load the extension in Chrome: open `chrome://extensions`, enable Developer Mode,
click "Load unpacked", select `extension/dist/`.

---

## Testing

- **Framework:** Vitest v2, configured in `server/vitest.config.ts`
- **Environment:** `node` (no jsdom — no browser tests exist)
- **Location:** Co-located with source files, suffix `.test.ts`
  - `server/src/db/schema.test.ts`
  - `server/src/db/queries.test.ts`
  - `server/src/routes/routes.test.ts`
- **No tests** exist for `extension/` or `server/web/`

### Test conventions

- Always import from vitest explicitly — no globals:
  ```ts
  import { describe, it, expect, beforeEach } from 'vitest'
  ```
- Always call `initDb(':memory:')` in `beforeEach` for a fresh in-memory SQLite DB
- Tests are integration-style (real SQLite, real Express app via `supertest`)
- Do NOT mock the database — use in-memory SQLite instead
- HTTP tests use `supertest` against the Express app directly (no live server needed)
- Assertion style: `expect(x).toBe(y)`, `expect(x).toBeTruthy()`,
  `expect(fn).toThrow()`

---

## Code Style

There is **no ESLint or Prettier configured**. Style is enforced by TypeScript
`strict: true` only. Follow the conventions below exactly.

### TypeScript

- `strict: true` is enabled in all tsconfigs — all type errors must be resolved
- `skipLibCheck: true` everywhere
- SQLite row results typed as `any` or `any[]` — this is intentional, do not add
  schema types for DB rows unless specifically asked
- React component props may use `any` for API response shapes — acceptable
- Interfaces defined inline or in a local block near usage; no separate types file
- Use discriminated union literals for constrained string fields:
  ```ts
  role: 'user' | 'assistant'
  ```
- No generics beyond standard usage; no complex utility types

### Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Functions / variables | `camelCase` | `initDb`, `getCardById`, `buildExplainPrompt` |
| React components | `PascalCase` | `CardDetailPage`, `ChatThread` |
| Component files | `PascalCase.tsx` | `HighlightList.tsx`, `StatusBanner.tsx` |
| Utility/module files | `camelCase.ts` | `anchor.ts`, `queries.ts`, `client.ts` |
| DB columns / API fields | `snake_case` | `page_id`, `ai_explanation`, `created_at` |
| Express router instances | `const router = Router()` | always named `router` |
| True constants | `UPPER_SNAKE_CASE` | `PORT`, `CONTEXT_LENGTH`, `MODELS` |

### Imports

- Use named imports everywhere; avoid default exports except for Express routers
- No barrel files (`index.ts` re-exports) — import directly from source files
- No path aliases — use relative paths only:
  ```ts
  import { getCardById } from '../db/queries'
  import { App } from './components/App'
  ```
- Omit file extensions in imports (TypeScript convention)
- Group: external packages first, then internal relative imports (no blank line
  required between groups, but keep it consistent within a file)

### Error Handling — Server Routes

- Validate inputs at the top of the handler with early returns:
  ```ts
  if (!req.body.url) return res.status(400).json({ error: 'url required' })
  if (!card) return res.status(404).json({ error: 'Card not found' })
  ```
- Wrap async AI/streaming handlers in `try/catch`; on error, write an SSE error
  event and end the response:
  ```ts
  catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
  ```
- Database query helpers do NOT use try/catch — errors propagate to route handlers
- No global error middleware

### Error Handling — Extension / Content Script

- All `fetch` calls in content scripts wrapped in `try/catch`
- Silent failures (`catch {}`) are acceptable when the server may be offline
- Never show unhandled promise rejections in the browser console

### React / UI

- **Inline styles only** — do not introduce CSS modules, Tailwind, or any CSS-in-JS
  library. All styling uses `style={{ ... }}` objects.
- No component library — all UI is hand-rolled
- Dark theme for the web UI (`#0f0f11` background) and extension toolbar (`#1e1e2e`)
- All user-facing copy is in **Simplified Chinese** (zh-CN)
- Timestamps stored as Unix ms integers (`Date.now()`), displayed with:
  ```ts
  new Date(ts).toLocaleString('zh-CN')
  ```
- Loading states use simple inline conditional rendering:
  ```tsx
  if (!card) return <div>加载中...</div>
  ```
- No error boundaries

### SSE Streaming Pattern

All AI responses use Server-Sent Events with this exact format:

```
data: {"delta":"chunk text"}\n\n
data: [DONE]\n\n
```

- Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
  `Connection: keep-alive`
- Strip `<think>...</think>` blocks from the stream (already handled in
  `server/src/ai/client.ts`) — do not duplicate this logic
- Client-side: use `EventSource` or manual `fetch` + `ReadableStream` parsing

---

## Architecture Notes

- **Database:** SQLite file at `server/data.db` (WAL mode, opened once at startup
  via `better-sqlite3`). No ORM — raw SQL only.
- **Highlights anchoring:** Highlights stored as `{ v, text, prefix, suffix }` with
  a 50-char context window (`CONTEXT_LENGTH = 50`). Do not switch to XPath/CSS
  selectors without updating the `anchor.ts` deserialization.
- **Settings in DB:** API key, model, and base URL are stored in the `settings`
  table — not in `.env`. Configured via the web UI settings page.
- **Web UI deployment:** `server/web` builds into `server/public/`; Express serves
  it as static files. There is no separate deployment.
- **AI provider:** OpenAI SDK with configurable `baseURL` (supports MiniMax and
  other compatible APIs). Model list is in `server/src/ai/client.ts`.
- **CORS:** Open (`origin: '*'`) — the extension fetches localhost directly.
- **Extension permissions:** `host_permissions` includes `http://localhost:7749/*`
  so content scripts can fetch the API directly.

---

## What NOT to Do

- Do not add ESLint, Prettier, or any formatter — none are configured
- Do not add CSS modules, Tailwind, or styled-components to any UI project
- Do not add an ORM (Prisma, Drizzle, etc.) over the SQLite layer
- Do not change port 7749 without updating all three sub-projects
- Do not add barrel `index.ts` re-export files
- Do not mock the database in tests — use `initDb(':memory:')` instead
- Do not run `npm install` at the repo root — there is no root `package.json`
- Do not modify files under `.claude/` unless specifically working on Claude skills

---

## Hard-Won Lessons: Chrome Extension Side Panel

These rules were discovered after extensive debugging of `sidePanel.open()` silently
failing. Violating any of them causes the side panel to never open, with no error.

### Rule 1 — Never disable the side panel per-tab

**Do NOT** use `tabs.onUpdated` to call `sidePanel.setOptions({ enabled: false })`.
When the panel is disabled, `sidePanel.open()` silently fails regardless of whether
a user gesture is present. This was the root cause of the annotate feature being
completely broken.

**Correct approach:** Use `setPanelBehavior` once at service worker startup to
prevent the panel from auto-opening on action icon click:

```ts
// background/index.ts — run once at startup, not per-tab
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {})
```

This keeps the panel always enabled (so `open()` always works) while preventing
unsolicited auto-open.

### Rule 2 — `sidePanel.open()` requires a live user gesture token

Chrome's user gesture token does **not** survive `async/await`. The token is
invalidated at the first `await` in the call stack.

**This means:** If content script calls `await fetch(...)` or `await bgFetch(...)`
before triggering `sidePanel.open()`, the gesture is gone and `open()` will fail.

**Correct pattern:** Send the open message **synchronously**, before any `await`,
directly in the `mousedown` / `click` handler:

```ts
// content/index.ts — inside onmousedown, BEFORE handleAction (which is async)
if (b.id === 'annotate') {
  chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL_NOW' })  // synchronous, gesture still live
}
handleAction(b.id, text, anchor)  // async, gesture dies at first await inside here
```

```ts
// background/index.ts — in onMessage handler, call open() immediately, no awaits before it
if (message.type === 'OPEN_SIDEPANEL_NOW') {
  const tabId = sender.tab?.id
  if (!tabId) return false
  chrome.sidePanel.open({ tabId }).catch(() => {})  // called before any await — works
  return false
}
```

### Rule 3 — Do not call `sidePanel.open()` inside a `setOptions()` callback

`setOptions()` is asynchronous. Its callback runs after the current event loop tick,
which means the user gesture token has expired by then. `open()` inside a
`setOptions` callback will fail silently.

**Wrong:**
```ts
chrome.sidePanel.setOptions({ tabId, enabled: true }, () => {
  chrome.sidePanel.open({ tabId })  // gesture already gone — fails silently
})
```

**Correct:** With `setPanelBehavior` (Rule 1), the panel is always enabled, so
`setOptions` is not needed at all before `open()`.

### Rule 4 — Do not use `runtime.sendMessage` to forward messages from background to sidepanel

`chrome.runtime.sendMessage` in the background service worker broadcasts to all
extension pages **including itself**, causing the background's own `onMessage`
listener to re-trigger — an infinite message loop.

To communicate from background to sidepanel, either:
- Have the **content script** broadcast directly (sidepanel receives it too), or
- Use `chrome.tabs.sendMessage` targeting the specific tab's sidepanel port (complex)

In practice, `FOCUS_HIGHLIGHT` is sent by the content script directly via
`runtime.sendMessage` after saving the highlight — the sidepanel receives it without
background involvement.

### Rule 5 — Content scripts are subject to page CSP; background is not

Direct `fetch()` calls in content scripts are blocked by the host page's
Content-Security-Policy on strict sites (e.g. `x.com`, `openai.com`).

**All server requests from content scripts must go through `bgFetch`**, which
proxies through the background service worker via `chrome.runtime.sendMessage`:

```ts
// content/index.ts
async function bgFetch(url: string, options?: RequestInit): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'FETCH', url, options }, (resp) => {
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return }
      if (resp?.ok) resolve(resp.data)
      else reject(new Error(resp?.error ?? 'bgFetch failed'))
    })
  })
}
```

```ts
// background/index.ts — FETCH handler, return true for async sendResponse
if (message.type === 'FETCH') {
  fetch(message.url, message.options)
    .then(res => res.json())
    .then(data => sendResponse({ ok: true, data }))
    .catch(err => sendResponse({ ok: false, error: err.message }))
  return true  // REQUIRED — keeps the message channel open
}
```

Exception: SSE streaming responses (`/ai/explain`) cannot be proxied through
`bgFetch` (background parses to JSON). These remain as direct `fetch()` calls and
will silently fail on strict-CSP pages — acceptable since card generation is
non-critical.
