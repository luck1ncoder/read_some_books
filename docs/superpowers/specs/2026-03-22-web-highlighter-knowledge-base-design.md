# Web Highlighter & Knowledge Base — Design Spec

**Date:** 2026-03-22  
**Status:** Approved

---

## 1. Overview

A Chrome extension that brings the experience of underlining text in a book to the browser. When a user selects text on any webpage, a floating toolbar appears with AI-powered actions. All highlights, AI explanations, and personal notes are saved to a local knowledge base accessible via a local web UI.

**Core user flows:**
1. Select text on any page → floating toolbar appears → take action (explain, save, note, card)
2. Open SidePanel → see all highlights on current page
3. Open `localhost:7749` → full knowledge library with AI chat per card
4. Export cards as Markdown for Obsidian

---

## 2. Architecture

The system consists of two independent subsystems communicating over HTTP on `localhost:7749`.

```
Chrome Extension
├── content-script.ts     — detects text selection, renders floating toolbar, restores highlights
├── background.ts         — service worker, proxies requests to local server
└── sidepanel/            — React UI, shows highlights for current page

Local Server (Node.js + Express)
├── REST API              — CRUD for highlights, cards, pages, notes, AI chat
├── SQLite (better-sqlite3) — local persistent storage
└── Web UI (React)        — full knowledge library at localhost:7749
```

**Port:** `7749` (shared by API and Web UI static files)

---

## 3. Data Model

### pages
Stores the full content of any page where the user has highlighted text.

| Column     | Type    | Notes                          |
|------------|---------|--------------------------------|
| id         | TEXT PK | uuid                           |
| url        | TEXT    | UNIQUE — one record per URL    |
| title      | TEXT    | page `<title>`                 |
| full_text  | TEXT    | entire article as plain text   |
| saved_at   | INTEGER | unix timestamp                 |

Note: `html` field is excluded (YAGNI — storing raw HTML brings large file sizes and XSS risk with no clear v1 use case).

### highlights
One row per selection made by the user.

| Column     | Type    | Notes                                      |
|------------|---------|--------------------------------------------|
| id         | TEXT PK | uuid                                       |
| page_id    | TEXT FK | references pages.id                        |
| text       | TEXT    | the selected text                          |
| color      | TEXT    | DEFAULT 'yellow' — reserved for future     |
| position   | TEXT    | serialized anchor (see Position Strategy)  |
| created_at | INTEGER | unix timestamp                             |

**Position Strategy:** DOM Range objects are fragile across page re-renders. We use a text-anchor approach:
- Store `{ text, prefix, suffix }` — the highlighted text plus exactly 50 chars of surrounding context
- On restore, search `document.body.innerText` for the anchor string and apply highlight
- Fallback: if anchor not found (e.g. dynamic page), skip re-highlighting silently — highlight still exists in DB
- This is simpler and more robust than XPath/CSS-selector approaches for most static/article pages

Example JSON stored in `position`:
```json
{ "v": 1, "text": "划线的内容", "prefix": "前面最多50个字符", "suffix": "后面最多50个字符" }
```
`v` is a version field to support future anchor strategy migrations without breaking existing records.
`prefix` / `suffix` are at most 50 chars — if the surrounding text is shorter, store whatever is available (no padding). Server validates on write; client truncates before sending.

### cards
A knowledge card, optionally linked to a highlight.

| Column         | Type    | Notes                                  |
|----------------|---------|----------------------------------------|
| id             | TEXT PK | uuid                                   |
| highlight_id   | TEXT FK | nullable — can be standalone card      |
| page_id        | TEXT FK | nullable — directly links card to page |
| title          | TEXT    |                                        |
| ai_explanation | TEXT    | AI-generated explanation               |
| my_note        | TEXT    | user's personal note/opinion           |
| tags           | TEXT    | JSON array of strings                  |
| created_at     | INTEGER | unix timestamp                         |
| updated_at     | INTEGER | unix timestamp                         |

Note: `page_id` is denormalized here so that standalone cards (no highlight) can still be grouped by source page, and "按网站" filtering works correctly.

### chat_messages
Per-card AI conversation history.

| Column     | Type    | Notes                    |
|------------|---------|--------------------------|
| id         | TEXT PK | uuid                     |
| card_id    | TEXT FK | references cards.id      |
| role       | TEXT    | 'user' or 'assistant'    |
| content    | TEXT    |                          |
| created_at | INTEGER | unix timestamp           |

### settings
Key-value store for user configuration.

| Column | Type    | Notes                                |
|--------|---------|--------------------------------------|
| key    | TEXT PK | e.g. `openai_api_key`, `openai_model`|
| value  | TEXT    | stored as plain text in local SQLite |

Note: API key is stored in local SQLite (same trust boundary as the user's machine). No encryption needed for v1 — the file is not exposed to the network.

**Key decisions:**
- `pages.full_text` is sent as AI context — the whole article, not a snippet
- `highlights` and `cards` are decoupled — a card can exist without a highlight
- `cards.page_id` denormalized for efficient "group by site" queries
- No ORM; use `better-sqlite3` directly for simplicity and reliability

---

## 4. Chrome Extension

### 4.1 Content Script (`content-script.ts`)

**Floating toolbar:**
- Listens to `mouseup` events
- On text selection, renders a floating toolbar above the selection
- 4 action buttons: [解释这段话] [生成知识卡片] [记录我的看法] [加入知识库]
- Clicking outside dismisses the toolbar
- [解释这段话]: calls AI, streams response inline within the toolbar bubble
- [生成知识卡片]: saves highlight + page + AI explanation as a card; shows "已保存" confirmation
- [记录我的看法]: expands a `textarea` in the bubble; Enter submits, Esc cancels
- [加入知识库]: saves highlight + page only, no AI call

**Page highlight restoration:**
- On page load, fetches all highlights for the current URL from local server
- Restores visual highlights (yellow underline) using saved `position` data
- On hover, shows a small preview bubble with the note/explanation

### 4.2 Background (`background.ts`)

- Service Worker
- Receives messages from content-script and sidepanel via `chrome.runtime.sendMessage`
- Proxies all non-streaming HTTP requests to `localhost:7749` using `fetch`
- **SSE streaming:** For [解释这段话], content-script directly fetches `localhost:7749/ai/explain` (not proxied through background). `manifest.json` must include `"host_permissions": ["http://localhost:7749/*"]` to allow content-script cross-origin requests to localhost.
- Handles first-time page save: receives page content from content-script, sends to `POST /pages`

### 4.3 SidePanel

- Opens when user clicks the extension toolbar icon
- Shows all highlights for the current tab's URL
- Each highlight is expandable: AI explanation, personal note, "Open Card" link
- Bottom button: "打开知识库" → opens `localhost:7749` in a new tab

---

## 5. Local Server

### 5.1 API Routes

| Method | Path                    | Description                            |
|--------|-------------------------|----------------------------------------|
| POST   | /pages                  | Upsert a page by `url` (UNIQUE key); returns `{ id, created: bool }` — content-script uses returned `id` as `page_id` for subsequent highlight saves |
| POST   | /highlights             | Save a new highlight                   |
| GET    | /highlights?url=        | Get all highlights for a URL; server resolves URL → page_id via JOIN on pages table |
| POST   | /cards                  | Create a card (optionally from highlight) |
| GET    | /cards                  | List cards; query params: `url`, `tag`, `date_from`, `date_to`, `q` (full-text keyword) |
| GET    | /cards/:id              | Get a single card with chat history    |
| PATCH  | /cards/:id              | Update my_note, tags, title            |
| POST   | /cards/:id/chat         | Send a message to AI in card context   |
| GET    | /cards/:id/export       | Export card as Markdown                |
| GET    | /export                 | Export all cards as Markdown ZIP       |
| GET    | /settings               | Get all settings (key-value pairs)     |
| PATCH  | /settings               | Update settings (e.g. set API key)     |

### 5.2 Server Startup

The local server must be running for the extension to function. v1 startup approach:
- User runs `npm start` in the `server/` directory (documented in README)
- A `start.sh` / `start.command` one-click script is provided for macOS
- The extension SidePanel shows a warning banner if `localhost:7749` is unreachable

### 5.3 AI Integration

- Provider: OpenAI (configurable via Settings page — user enters API key stored in `settings` table)
- For explanations: system prompt includes `pages.full_text` + highlight text
- For card chat: system prompt includes full article + highlight + previous `chat_messages`
- Streaming via SSE (`text/event-stream`) for all AI responses
- If API key is not set, AI actions show a prompt directing user to Settings page

### 5.4 Web UI (`localhost:7749`)

**Layout:**
```
┌─────────────┬──────────────────────────────┐
│  Left Sidebar│  Main Content Area           │
│             │                              │
│  [全部]      │  Card List / Card Detail     │
│  [按网站]    │                              │
│  [按标签]    │                              │
│  [按日期]    │                              │
│             │                              │
│  Search Box  │                              │
└─────────────┴──────────────────────────────┘
```

**Card list:** favicon + source title, truncated highlight text, tags, timestamp

**Card detail:**
- Source link (page title → original URL)
- Highlighted original text
- AI explanation section
- Editable "我的看法" textarea (auto-saves on blur)
- AI chat section: message thread + input box, full article context always included

**Settings page:** accessible via sidebar link; fields for OpenAI API Key and model selection (e.g. gpt-4o).

**Export:** single card → `.md` file; all cards → `.zip` of Markdown files

---

## 6. Tech Stack

| Layer            | Technology                        |
|------------------|-----------------------------------|
| Extension UI     | React 18 + TypeScript             |
| Content Script   | TypeScript (no framework)         |
| Extension Build  | Vite + CRXJS plugin               |
| Local Server     | Node.js + Express + TypeScript    |
| Database         | SQLite via better-sqlite3         |
| Web UI           | React 18 + TypeScript + Vite      |
| AI               | OpenAI API (user-supplied key)    |
| Streaming        | Server-Sent Events (SSE)          |

---

## 7. Project Structure

```
website_reader/
├── extension/               — Chrome extension
│   ├── src/
│   │   ├── content/         — content-script.ts + toolbar component
│   │   ├── background/      — background.ts
│   │   └── sidepanel/       — React SidePanel app
│   ├── manifest.json
│   └── vite.config.ts
└── server/                  — Local server
    ├── src/
    │   ├── db/              — SQLite schema + query helpers
    │   ├── routes/          — Express route handlers
    │   ├── ai/              — AI client + prompt builders
    │   └── index.ts         — Entry point
    └── web/                 — Knowledge library React app
        └── src/
```

---

## 8. Out of Scope (v1)

- Firefox support
- Cloud sync / multi-device
- Vector search / semantic retrieval
- Obsidian plugin (export to Markdown is the bridge for now)
- Mobile
