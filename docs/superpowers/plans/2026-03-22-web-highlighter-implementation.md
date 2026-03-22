# Web Highlighter & Knowledge Base — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension + local Node.js server that lets users highlight text on any webpage, save it to a local knowledge base, and interact with it via AI.

**Architecture:** Chrome extension (content-script + background + sidepanel) communicates with a local Express server over HTTP on port 7749. The server stores data in SQLite and serves a React Web UI for the full knowledge library.

**Tech Stack:** TypeScript, React 18, Vite, CRXJS (extension build), Node.js, Express, better-sqlite3, OpenAI API (SSE streaming)

**Spec:** `docs/superpowers/specs/2026-03-22-web-highlighter-knowledge-base-design.md`

---

## File Map

```
website_reader/
├── extension/
│   ├── manifest.json
│   ├── vite.config.ts
│   ├── package.json
│   └── src/
│       ├── content/
│       │   ├── index.ts           — entry, mouseup listener, highlight restoration
│       │   ├── toolbar.ts         — floating toolbar DOM logic
│       │   ├── anchor.ts          — position serialization/deserialization
│       │   └── style.css          — toolbar + highlight underline styles
│       ├── background/
│       │   └── index.ts           — service worker, message proxy
│       └── sidepanel/
│           ├── index.html
│           ├── main.tsx
│           ├── App.tsx
│           └── components/
│               ├── HighlightList.tsx
│               └── StatusBanner.tsx
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── start.command              — macOS one-click launcher
    └── src/
        ├── index.ts               — Express entry, static files, port 7749
        ├── db/
        │   ├── schema.ts          — CREATE TABLE statements + db init
        │   └── queries.ts         — all SQL query helpers (pages, highlights, cards, chat, settings)
        ├── routes/
        │   ├── pages.ts           — POST /pages
        │   ├── highlights.ts      — POST /highlights, GET /highlights
        │   ├── cards.ts           — POST/GET/PATCH /cards, GET /cards/:id
        │   ├── chat.ts            — POST /cards/:id/chat (SSE)
        │   ├── explain.ts         — GET /ai/explain (SSE, called directly by content-script)
        │   ├── export.ts          — GET /cards/:id/export, GET /export
        │   └── settings.ts        — GET/PATCH /settings
        ├── ai/
        │   ├── client.ts          — OpenAI SDK wrapper, streaming helper
        │   └── prompts.ts         — system prompt builders
        └── web/                   — React Web UI (separate Vite project)
            ├── package.json
            ├── vite.config.ts
            └── src/
                ├── main.tsx
                ├── App.tsx
                ├── api.ts         — typed fetch helpers for all API routes
                ├── pages/
                │   ├── LibraryPage.tsx    — card list + filters
                │   ├── CardDetailPage.tsx — card detail + AI chat
                │   └── SettingsPage.tsx   — API key configuration
                └── components/
                    ├── Sidebar.tsx
                    ├── CardList.tsx
                    ├── CardItem.tsx
                    ├── ChatThread.tsx
                    └── ExportButton.tsx
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `extension/package.json`
- Create: `extension/vite.config.ts`
- Create: `extension/manifest.json`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/web/package.json`
- Create: `server/web/vite.config.ts`

- [ ] **Step 1: Init extension package**

```bash
mkdir -p extension/src/content extension/src/background extension/src/sidepanel
cd extension && npm init -y
npm install -D vite @crxjs/vite-plugin typescript react react-dom @types/react @types/react-dom
```

- [ ] **Step 2: Create extension `manifest.json`**

Create `extension/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "Web Highlighter",
  "version": "0.1.0",
  "description": "Highlight text on any page and save to your knowledge base",
  "permissions": ["activeTab", "storage", "sidePanel", "scripting", "tabs"],
  "host_permissions": ["http://localhost:7749/*"],
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"],
      "css": ["src/content/style.css"]
    }
  ],
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "action": {
    "default_title": "Open Web Highlighter"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 3: Create extension `vite.config.ts`**

Create `extension/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
})
```

- [ ] **Step 4: Init server package**

```bash
mkdir -p server/src/db server/src/routes server/src/ai
cd server && npm init -y
npm install express better-sqlite3 openai uuid archiver cors
npm install -D typescript @types/express @types/better-sqlite3 @types/node @types/uuid @types/archiver tsx
```

Create `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Add to `server/package.json` scripts:
```json
{
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts"
  }
}
```

- [ ] **Step 5: Init web UI package**

```bash
mkdir -p server/web/src/pages server/web/src/components
cd server/web && npm create vite@latest . -- --template react-ts
npm install react-router-dom
```

Create `server/web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',  // server serves from here
    emptyOutDir: true,
  },
})
```

- [ ] **Step 6: Create macOS one-click launcher**

Create `server/start.command`:
```bash
#!/bin/bash
cd "$(dirname "$0")"
npm start
```
```bash
chmod +x server/start.command
```

- [ ] **Step 7: Commit scaffolding**

```bash
git add .
git commit -m "chore: scaffold extension and server project structure"
```

---

## Task 2: Database Schema & Query Helpers

**Files:**
- Create: `server/src/db/schema.ts`
- Create: `server/src/db/queries.ts`

- [ ] **Step 1: Write schema tests**

Create `server/src/db/schema.test.ts`:
```typescript
import { initDb, getDb } from './schema'
import { describe, it, expect, beforeEach } from 'vitest'

describe('database schema', () => {
  beforeEach(() => {
    initDb(':memory:')
  })

  it('creates all required tables', () => {
    const db = getDb()
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all() as { name: string }[]
    const names = tables.map(t => t.name)
    expect(names).toContain('pages')
    expect(names).toContain('highlights')
    expect(names).toContain('cards')
    expect(names).toContain('chat_messages')
    expect(names).toContain('settings')
  })

  it('pages has unique url constraint', () => {
    const db = getDb()
    const insert = db.prepare('INSERT INTO pages (id, url, title, full_text, saved_at) VALUES (?, ?, ?, ?, ?)')
    insert.run('id1', 'https://example.com', 'Test', 'text', Date.now())
    expect(() => {
      insert.run('id2', 'https://example.com', 'Test2', 'text2', Date.now())
    }).toThrow()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd server && npx vitest run src/db/schema.test.ts
```
Expected: FAIL with "Cannot find module './schema'"

- [ ] **Step 3: Implement `schema.ts`**

Create `server/src/db/schema.ts`:
```typescript
import Database from 'better-sqlite3'

let db: Database.Database

export function initDb(path: string = './data.db') {
  db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      full_text TEXT NOT NULL,
      saved_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES pages(id),
      text TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'yellow',
      position TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      highlight_id TEXT REFERENCES highlights(id),
      page_id TEXT REFERENCES pages(id),
      title TEXT NOT NULL DEFAULT '',
      ai_explanation TEXT NOT NULL DEFAULT '',
      my_note TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id),
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `)
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.')
  return db
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd server && npx vitest run src/db/schema.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 5: Write query helper tests**

Create `server/src/db/queries.test.ts`:
```typescript
import { initDb } from './schema'
import { upsertPage, getPageByUrl, saveHighlight, getHighlightsByUrl, createCard, getCards, getCardById, updateCard, saveMessage, getSettings, setSetting } from './queries'
import { describe, it, expect, beforeEach } from 'vitest'

describe('query helpers', () => {
  beforeEach(() => { initDb(':memory:') })

  it('upsertPage creates then returns same id on second call', () => {
    const r1 = upsertPage({ url: 'https://a.com', title: 'A', full_text: 'hello' })
    const r2 = upsertPage({ url: 'https://a.com', title: 'A2', full_text: 'updated' })
    expect(r1.id).toBe(r2.id)
    expect(r1.created).toBe(true)
    expect(r2.created).toBe(false)
  })

  it('saveHighlight and getHighlightsByUrl round-trips', () => {
    const { id: pageId } = upsertPage({ url: 'https://b.com', title: 'B', full_text: 'body' })
    saveHighlight({ page_id: pageId, text: 'selected', color: 'yellow', position: '{"v":1,"text":"selected","prefix":"","suffix":""}' })
    const results = getHighlightsByUrl('https://b.com')
    expect(results).toHaveLength(1)
    expect(results[0].text).toBe('selected')
  })

  it('createCard and getCardById returns card with empty chat', () => {
    const { id: pageId } = upsertPage({ url: 'https://c.com', title: 'C', full_text: 'body' })
    const card = createCard({ page_id: pageId, highlight_id: null, title: 'My Card', ai_explanation: 'explained', my_note: '', tags: [] })
    const fetched = getCardById(card.id)
    expect(fetched?.title).toBe('My Card')
    expect(fetched?.chat_messages).toHaveLength(0)
  })

  it('getCards filters by url', () => {
    const { id: p1 } = upsertPage({ url: 'https://site1.com', title: 'S1', full_text: 'body' })
    const { id: p2 } = upsertPage({ url: 'https://site2.com', title: 'S2', full_text: 'body' })
    createCard({ page_id: p1, highlight_id: null, title: 'Card1', ai_explanation: '', my_note: '', tags: [] })
    createCard({ page_id: p2, highlight_id: null, title: 'Card2', ai_explanation: '', my_note: '', tags: [] })
    const results = getCards({ url: 'https://site1.com' })
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Card1')
  })

  it('setSetting and getSettings round-trips', () => {
    setSetting('openai_api_key', 'sk-test')
    const settings = getSettings()
    expect(settings['openai_api_key']).toBe('sk-test')
  })
})
```

- [ ] **Step 6: Run test — expect FAIL**

```bash
cd server && npx vitest run src/db/queries.test.ts
```
Expected: FAIL with "Cannot find module './queries'"

- [ ] **Step 7: Implement `queries.ts`**

Create `server/src/db/queries.ts`:
```typescript
import { v4 as uuid } from 'uuid'
import { getDb } from './schema'

// --- Pages ---

export function upsertPage(data: { url: string; title: string; full_text: string }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM pages WHERE url = ?').get(data.url) as { id: string } | undefined
  if (existing) {
    db.prepare('UPDATE pages SET title = ?, full_text = ?, saved_at = ? WHERE id = ?')
      .run(data.title, data.full_text, Date.now(), existing.id)
    return { id: existing.id, created: false }
  }
  const id = uuid()
  db.prepare('INSERT INTO pages (id, url, title, full_text, saved_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, data.url, data.title, data.full_text, Date.now())
  return { id, created: true }
}

export function getPageByUrl(url: string) {
  return getDb().prepare('SELECT * FROM pages WHERE url = ?').get(url) as any
}

export function getPageById(id: string) {
  return getDb().prepare('SELECT * FROM pages WHERE id = ?').get(id) as any
}

// --- Highlights ---

export function saveHighlight(data: { page_id: string; text: string; color: string; position: string }) {
  const id = uuid()
  getDb().prepare('INSERT INTO highlights (id, page_id, text, color, position, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, data.page_id, data.text, data.color, data.position, Date.now())
  return { id }
}

export function getHighlightsByUrl(url: string) {
  return getDb().prepare(`
    SELECT h.* FROM highlights h
    JOIN pages p ON h.page_id = p.id
    WHERE p.url = ?
    ORDER BY h.created_at ASC
  `).all(url) as any[]
}

// --- Cards ---

export function createCard(data: {
  page_id: string | null
  highlight_id: string | null
  title: string
  ai_explanation: string
  my_note: string
  tags: string[]
}) {
  const id = uuid()
  const now = Date.now()
  getDb().prepare(`
    INSERT INTO cards (id, highlight_id, page_id, title, ai_explanation, my_note, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.highlight_id, data.page_id, data.title, data.ai_explanation, data.my_note, JSON.stringify(data.tags), now, now)
  return { id }
}

export function getCards(filters: { url?: string; tag?: string; date_from?: number; date_to?: number; q?: string } = {}) {
  const db = getDb()
  let sql = `SELECT c.*, p.url as page_url, p.title as page_title FROM cards c LEFT JOIN pages p ON c.page_id = p.id WHERE 1=1`
  const params: any[] = []
  if (filters.url) { sql += ' AND p.url = ?'; params.push(filters.url) }
  if (filters.tag) { sql += ' AND c.tags LIKE ?'; params.push(`%"${filters.tag}"%`) }
  if (filters.date_from) { sql += ' AND c.created_at >= ?'; params.push(filters.date_from) }
  if (filters.date_to) { sql += ' AND c.created_at <= ?'; params.push(filters.date_to) }
  if (filters.q) { sql += ' AND (c.title LIKE ? OR c.ai_explanation LIKE ? OR c.my_note LIKE ?)'; params.push(`%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`) }
  sql += ' ORDER BY c.created_at DESC'
  return db.prepare(sql).all(...params) as any[]
}

export function getCardById(id: string) {
  const db = getDb()
  // JOIN highlights to get highlight_text (the original selected text)
  const card = db.prepare(`
    SELECT c.*, p.url as page_url, p.title as page_title,
           h.text as highlight_text
    FROM cards c
    LEFT JOIN pages p ON c.page_id = p.id
    LEFT JOIN highlights h ON c.highlight_id = h.id
    WHERE c.id = ?
  `).get(id) as any
  if (!card) return null
  const chat_messages = db.prepare('SELECT * FROM chat_messages WHERE card_id = ? ORDER BY created_at ASC').all(id)
  return { ...card, chat_messages }
}

export function updateCard(id: string, data: { title?: string; my_note?: string; tags?: string[] }) {
  const db = getDb()
  const fields: string[] = []
  const params: any[] = []
  if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title) }
  if (data.my_note !== undefined) { fields.push('my_note = ?'); params.push(data.my_note) }
  if (data.tags !== undefined) { fields.push('tags = ?'); params.push(JSON.stringify(data.tags)) }
  fields.push('updated_at = ?'); params.push(Date.now())
  params.push(id)
  db.prepare(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`).run(...params)
}

// --- Chat Messages ---

export function saveMessage(data: { card_id: string; role: 'user' | 'assistant'; content: string }) {
  const id = uuid()
  getDb().prepare('INSERT INTO chat_messages (id, card_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, data.card_id, data.role, data.content, Date.now())
  return { id }
}

// --- Settings ---

export function getSettings(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export function setSetting(key: string, value: string) {
  getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value)
}
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
cd server && npx vitest run src/db/
```
Expected: PASS (all tests)

- [ ] **Step 9: Commit**

```bash
git add server/src/db/
git commit -m "feat: implement database schema and query helpers"
```

---

## Task 3: Server Entry + API Routes

**Files:**
- Create: `server/src/index.ts`
- Create: `server/src/routes/pages.ts`
- Create: `server/src/routes/highlights.ts`
- Create: `server/src/routes/cards.ts`
- Create: `server/src/routes/settings.ts`

- [ ] **Step 1: Create Express entry point**

Create `server/src/index.ts`:
```typescript
import express from 'express'
import cors from 'cors'
import path from 'path'
import { initDb } from './db/schema'
import pagesRouter from './routes/pages'
import highlightsRouter from './routes/highlights'
import cardsRouter from './routes/cards'
import settingsRouter from './routes/settings'

const PORT = 7749
const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))

initDb(path.join(__dirname, '../data.db'))

app.use('/pages', pagesRouter)
app.use('/highlights', highlightsRouter)
app.use('/cards', cardsRouter)
app.use('/settings', settingsRouter)

// Serve Web UI static files (built by `cd web && npm run build`)
app.use(express.static(path.join(__dirname, '../public')))
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

app.listen(PORT, () => {
  console.log(`Web Highlighter server running at http://localhost:${PORT}`)
})
```

- [ ] **Step 2: Create `routes/pages.ts`**

Create `server/src/routes/pages.ts`:
```typescript
import { Router } from 'express'
import { upsertPage } from '../db/queries'

const router = Router()

router.post('/', (req, res) => {
  const { url, title, full_text } = req.body
  if (!url || !title || !full_text) {
    return res.status(400).json({ error: 'url, title, full_text are required' })
  }
  const result = upsertPage({ url, title, full_text })
  res.json(result)
})

export default router
```

- [ ] **Step 3: Create `routes/highlights.ts`**

Create `server/src/routes/highlights.ts`:
```typescript
import { Router } from 'express'
import { saveHighlight, getHighlightsByUrl } from '../db/queries'

const router = Router()

router.post('/', (req, res) => {
  const { page_id, text, color = 'yellow', position } = req.body
  if (!page_id || !text || !position) {
    return res.status(400).json({ error: 'page_id, text, position are required' })
  }
  const result = saveHighlight({ page_id, text, color, position })
  res.json(result)
})

router.get('/', (req, res) => {
  const url = req.query.url as string
  if (!url) return res.status(400).json({ error: 'url query param is required' })
  const highlights = getHighlightsByUrl(url)
  res.json(highlights)
})

export default router
```

- [ ] **Step 4: Create `routes/cards.ts`**

Create `server/src/routes/cards.ts`:
```typescript
import { Router } from 'express'
import { createCard, getCards, getCardById, updateCard } from '../db/queries'

const router = Router()

router.post('/', (req, res) => {
  const { page_id, highlight_id, title, ai_explanation, my_note, tags } = req.body
  const card = createCard({ page_id: page_id ?? null, highlight_id: highlight_id ?? null, title: title ?? '', ai_explanation: ai_explanation ?? '', my_note: my_note ?? '', tags: tags ?? [] })
  res.json(card)
})

router.get('/', (req, res) => {
  const { url, tag, date_from, date_to, q } = req.query
  const cards = getCards({
    url: url as string | undefined,
    tag: tag as string | undefined,
    date_from: date_from ? Number(date_from) : undefined,
    date_to: date_to ? Number(date_to) : undefined,
    q: q as string | undefined,
  })
  res.json(cards)
})

router.get('/:id', (req, res) => {
  const card = getCardById(req.params.id)
  if (!card) return res.status(404).json({ error: 'Card not found' })
  res.json(card)
})

router.patch('/:id', (req, res) => {
  const { title, my_note, tags } = req.body
  updateCard(req.params.id, { title, my_note, tags })
  res.json({ ok: true })
})

export default router
```

- [ ] **Step 5: Create `routes/settings.ts`**

Create `server/src/routes/settings.ts`:
```typescript
import { Router } from 'express'
import { getSettings, setSetting } from '../db/queries'

const router = Router()

router.get('/', (_req, res) => {
  res.json(getSettings())
})

router.patch('/', (req, res) => {
  const updates = req.body as Record<string, string>
  for (const [key, value] of Object.entries(updates)) {
    setSetting(key, value)
  }
  res.json({ ok: true })
})

export default router
```

- [ ] **Step 6: Add route integration tests**

Install supertest:
```bash
cd server && npm install -D supertest @types/supertest
```

Create `server/src/routes/routes.test.ts`:
```typescript
import request from 'supertest'
import express from 'express'
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb } from '../db/schema'
import pagesRouter from './pages'
import highlightsRouter from './highlights'
import cardsRouter from './cards'
import settingsRouter from './settings'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/pages', pagesRouter)
  app.use('/highlights', highlightsRouter)
  app.use('/cards', cardsRouter)
  app.use('/settings', settingsRouter)
  return app
}

describe('routes integration', () => {
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    initDb(':memory:')
    app = buildApp()
  })

  it('POST /pages creates page and returns id', async () => {
    const res = await request(app).post('/pages').send({ url: 'https://a.com', title: 'A', full_text: 'hello' })
    expect(res.status).toBe(200)
    expect(res.body.id).toBeTruthy()
    expect(res.body.created).toBe(true)
  })

  it('POST /pages returns 400 if fields missing', async () => {
    const res = await request(app).post('/pages').send({ url: 'https://a.com' })
    expect(res.status).toBe(400)
  })

  it('POST /highlights saves and GET retrieves by url', async () => {
    const page = await request(app).post('/pages').send({ url: 'https://b.com', title: 'B', full_text: 'body' })
    await request(app).post('/highlights').send({
      page_id: page.body.id, text: 'selected', color: 'yellow',
      position: JSON.stringify({ v: 1, text: 'selected', prefix: '', suffix: '' })
    })
    const res = await request(app).get('/highlights?url=https://b.com')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].text).toBe('selected')
  })

  it('POST /cards creates card, GET /cards lists it, GET /cards/:id returns detail', async () => {
    const page = await request(app).post('/pages').send({ url: 'https://c.com', title: 'C', full_text: 'body' })
    const card = await request(app).post('/cards').send({ page_id: page.body.id, title: 'Test Card', ai_explanation: 'explained' })
    expect(card.status).toBe(200)

    const list = await request(app).get('/cards')
    expect(list.body).toHaveLength(1)

    const detail = await request(app).get(`/cards/${card.body.id}`)
    expect(detail.body.title).toBe('Test Card')
    expect(detail.body.chat_messages).toHaveLength(0)
  })

  it('PATCH /cards/:id updates note', async () => {
    const page = await request(app).post('/pages').send({ url: 'https://d.com', title: 'D', full_text: 'body' })
    const card = await request(app).post('/cards').send({ page_id: page.body.id, title: 'T' })
    await request(app).patch(`/cards/${card.body.id}`).send({ my_note: 'my thought' })
    const detail = await request(app).get(`/cards/${card.body.id}`)
    expect(detail.body.my_note).toBe('my thought')
  })

  it('GET/PATCH /settings round-trips', async () => {
    await request(app).patch('/settings').send({ openai_api_key: 'sk-test' })
    const res = await request(app).get('/settings')
    expect(res.body.openai_api_key).toBe('sk-test')
  })
})
```

- [ ] **Step 7: Run route tests — expect PASS**

```bash
cd server && npx vitest run src/routes/routes.test.ts
```
Expected: PASS (all tests)

- [ ] **Step 8: Smoke-test server starts**

```bash
cd server && npm start
```
Expected: `Web Highlighter server running at http://localhost:7749`

In another terminal:
```bash
curl -X POST http://localhost:7749/pages \
  -H "Content-Type: application/json" \
  -d '{"url":"https://test.com","title":"Test","full_text":"hello world"}'
```
Expected: `{"id":"<uuid>","created":true}`

- [ ] **Step 9: Commit**

```bash
git add server/src/
git commit -m "feat: add Express server with pages, highlights, cards, settings routes and integration tests"
```

---

## Task 4: AI Routes (SSE Streaming)

**Files:**
- Create: `server/src/ai/client.ts`
- Create: `server/src/ai/prompts.ts`
- Create: `server/src/routes/chat.ts` — POST /cards/:id/chat only
- Create: `server/src/routes/explain.ts` — GET /ai/explain only (separate router to avoid double-registration)
- Modify: `server/src/index.ts` — register chat under /cards, explain under /ai

- [ ] **Step 1: Create AI client**

Create `server/src/ai/client.ts`:
```typescript
import OpenAI from 'openai'
import { getSettings } from '../db/queries'

export function getOpenAIClient(): OpenAI {
  const settings = getSettings()
  const apiKey = settings['openai_api_key']
  if (!apiKey) throw new Error('OpenAI API key not configured. Go to Settings.')
  return new OpenAI({ apiKey })
}

export function getOpenAIModel(): string {
  const settings = getSettings()
  return settings['openai_model'] ?? 'gpt-4o'
}
```

- [ ] **Step 2: Create prompt builders**

Create `server/src/ai/prompts.ts`:
```typescript
export function buildExplainPrompt(params: { full_text: string; highlight: string }): string {
  return `You are a knowledgeable reading assistant. The user is reading an article and has highlighted a passage. Your job is to explain the highlighted text clearly and concisely, using the full article as context.

FULL ARTICLE:
${params.full_text}

HIGHLIGHTED TEXT:
"${params.highlight}"

Explain what this means in plain language. Be concise (2-4 sentences). Focus on the meaning in context of this article.`
}

export function buildChatSystemPrompt(params: { full_text: string; highlight: string }): string {
  return `You are a knowledgeable reading assistant. The user is reading an article and has saved a highlighted passage as a knowledge card. They want to discuss and understand it better.

FULL ARTICLE:
${params.full_text}

HIGHLIGHTED TEXT:
"${params.highlight}"

Answer the user's questions clearly. Use the article as your primary source of context.`
}
```

- [ ] **Step 3: Create chat route (card chat only)**

Create `server/src/routes/chat.ts` — handles only `POST /cards/:id/chat`:
```typescript
import { Router } from 'express'
import { getCardById, getPageById, saveMessage } from '../db/queries'
import { getOpenAIClient, getOpenAIModel } from '../ai/client'
import { buildChatSystemPrompt } from '../ai/prompts'

const router = Router()

// POST /cards/:id/chat — streaming chat
router.post('/:id/chat', async (req, res) => {
  const card = getCardById(req.params.id)
  if (!card) return res.status(404).json({ error: 'Card not found' })

  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'message is required' })

  const page = card.page_id ? getPageById(card.page_id) : null
  saveMessage({ card_id: card.id, role: 'user', content: message })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const client = getOpenAIClient()
    const model = getOpenAIModel()
    const systemPrompt = buildChatSystemPrompt({
      full_text: page?.full_text ?? '',
      highlight: card.highlight_text ?? '',
    })
    const history = (card.chat_messages as any[]).map((m: any) => ({ role: m.role, content: m.content }))

    const stream = await client.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
    })

    let fullContent = ''
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) {
        fullContent += delta
        res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      }
    }
    saveMessage({ card_id: card.id, role: 'assistant', content: fullContent })
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

export default router
```

- [ ] **Step 4: Create explain route (separate router)**

Create `server/src/routes/explain.ts` — handles only `GET /ai/explain`:
```typescript
import { Router } from 'express'
import { getPageById } from '../db/queries'
import { getOpenAIClient, getOpenAIModel } from '../ai/client'
import { buildExplainPrompt } from '../ai/prompts'

const router = Router()

// GET /explain — streaming explain (called directly from content-script via /ai/explain)
router.get('/explain', async (req, res) => {
  const { highlight, page_id } = req.query as { highlight: string; page_id: string }
  if (!highlight) return res.status(400).json({ error: 'highlight is required' })

  const page = page_id ? getPageById(page_id) : null

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const client = getOpenAIClient()
    const model = getOpenAIModel()
    const prompt = buildExplainPrompt({ full_text: page?.full_text ?? '', highlight })
    const stream = await client.chat.completions.create({
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    })
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

export default router
```

- [ ] **Step 5: Register routes in `index.ts`**

Edit `server/src/index.ts` — add after existing route registrations:
```typescript
import chatRouter from './routes/chat'
import explainRouter from './routes/explain'
// ...
app.use('/cards', chatRouter)    // POST /cards/:id/chat
app.use('/ai', explainRouter)    // GET /ai/explain
```

- [ ] **Step 6: Commit**

```bash
git add server/src/ai/ server/src/routes/chat.ts server/src/routes/explain.ts server/src/index.ts
git commit -m "feat: add AI streaming routes (explain + card chat, separate routers)"
```

---

## Task 5: Export Routes

**Files:**
- Create: `server/src/routes/export.ts`
- Modify: `server/src/index.ts` — register export router

- [ ] **Step 1: Implement export route**

Create `server/src/routes/export.ts`:
```typescript
import { Router } from 'express'
import archiver from 'archiver'
import { getCardById, getCards } from '../db/queries'

// Shared helper — used by both routers below
export function cardToMarkdown(card: any): string {
  const tags = JSON.parse(card.tags || '[]').map((t: string) => `#${t}`).join(' ')
  return `# ${card.title || 'Untitled'}

**Source:** [${card.page_title || card.page_url}](${card.page_url})

**Highlighted text:**
> ${card.highlight_text || ''}

## AI Explanation
${card.ai_explanation || '_No explanation yet_'}

## My Note
${card.my_note || '_No note yet_'}

${tags ? `**Tags:** ${tags}` : ''}

---
_Created: ${new Date(card.created_at).toISOString()}_
`
}

// Router A: handles GET /cards/:id/export — registered under /cards
export const cardExportRouter = Router()
cardExportRouter.get('/:id/export', (req, res) => {
  const card = getCardById(req.params.id)
  if (!card) return res.status(404).json({ error: 'Card not found' })
  const md = cardToMarkdown(card)
  const filename = `${(card.title || 'card').replace(/[^a-z0-9]/gi, '_')}.md`
  res.setHeader('Content-Type', 'text/markdown')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(md)
})

// Router B: handles GET / (all cards ZIP) — registered under /export
export const allExportRouter = Router()
allExportRouter.get('/', (_req, res) => {
  const cards = getCards()
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', 'attachment; filename="knowledge-base.zip"')
  const archive = archiver('zip')
  archive.pipe(res)
  for (const card of cards) {
    const md = cardToMarkdown(card)
    const filename = `${(card.title || card.id).replace(/[^a-z0-9]/gi, '_')}.md`
    archive.append(md, { name: filename })
  }
  archive.finalize()
})
```

- [ ] **Step 2: Register in `index.ts`**

Add to `server/src/index.ts` after existing route registrations:
```typescript
import { cardExportRouter, allExportRouter } from './routes/export'
// ...
app.use('/cards', cardExportRouter)   // GET /cards/:id/export
app.use('/export', allExportRouter)   // GET /export (all cards ZIP)
```

Note: Two separate router instances prevent Express from matching `/cards/` against the all-export route.

- [ ] **Step 3: Smoke-test export**

```bash
curl http://localhost:7749/export --output test.zip
unzip -l test.zip
```
Expected: ZIP file listed (may be empty if no cards yet, which is fine)

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/export.ts server/src/index.ts
git commit -m "feat: add markdown and ZIP export routes"
```

---

## Task 6: Content Script — Anchor Utilities

**Files:**
- Create: `extension/src/content/anchor.ts`

- [ ] **Step 1: Implement anchor serialization**

Create `extension/src/content/anchor.ts`:
```typescript
export interface Anchor {
  v: 1
  text: string
  prefix: string
  suffix: string
}

const CONTEXT_LENGTH = 50

// Build a flat text string from DOM text nodes using TreeWalker.
// This is used consistently in both serialize and restore to avoid
// mismatches between innerText normalization and raw textContent offsets.
function getBodyTextAndOffsets(): { text: string; nodes: Array<{ node: Text; start: number }> } {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let text = ''
  const nodes: Array<{ node: Text; start: number }> = []
  let node: Text | null
  while ((node = walker.nextNode() as Text)) {
    nodes.push({ node, start: text.length })
    text += node.textContent ?? ''
  }
  return { text, nodes }
}

export function serializeSelection(selection: Selection): Anchor | null {
  if (selection.rangeCount === 0) return null
  const text = selection.toString().trim()
  if (!text) return null

  // Use TreeWalker-based flat text (consistent with restoreHighlight)
  const { text: bodyText } = getBodyTextAndOffsets()
  const startOffset = bodyText.indexOf(text)
  if (startOffset === -1) return null

  const prefix = bodyText.slice(Math.max(0, startOffset - CONTEXT_LENGTH), startOffset)
  const suffix = bodyText.slice(startOffset + text.length, startOffset + text.length + CONTEXT_LENGTH)

  return { v: 1, text, prefix, suffix }
}

export function restoreHighlight(anchor: Anchor): Range | null {
  const { text: bodyText, nodes } = getBodyTextAndOffsets()

  // Use prefix+text for more accurate disambiguation
  const searchStr = anchor.prefix + anchor.text
  const idx = bodyText.indexOf(searchStr)
  if (idx === -1) return null

  const textStart = idx + anchor.prefix.length
  const textEnd = textStart + anchor.text.length

  // Find start node
  let startNode: Text | null = null
  let startOffset = 0
  let endNode: Text | null = null
  let endOffset = 0

  for (const { node, start } of nodes) {
    const nodeEnd = start + (node.textContent?.length ?? 0)
    if (startNode === null && nodeEnd > textStart) {
      startNode = node
      startOffset = textStart - start
    }
    if (endNode === null && nodeEnd >= textEnd) {
      endNode = node
      endOffset = textEnd - start
      break
    }
  }

  if (!startNode || !endNode) return null

  try {
    const range = document.createRange()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    return range
  } catch {
    return null  // surroundContents can throw on cross-node boundaries; handled by caller
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/src/content/anchor.ts
git commit -m "feat: add text-anchor serialization for highlight position"
```

---

## Task 7: Content Script — Toolbar & Core Logic

**Files:**
- Create: `extension/src/content/style.css`
- Create: `extension/src/content/toolbar.ts`
- Create: `extension/src/content/index.ts`

- [ ] **Step 1: Create toolbar styles**

Create `extension/src/content/style.css`:
```css
.wh-highlight {
  background-color: rgba(255, 220, 0, 0.35);
  border-bottom: 2px solid rgba(255, 180, 0, 0.8);
  cursor: pointer;
  border-radius: 2px;
}

.wh-toolbar {
  position: absolute;
  z-index: 2147483647;
  background: #1e1e2e;
  border-radius: 10px;
  padding: 6px 8px;
  display: flex;
  gap: 4px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.wh-btn {
  background: transparent;
  border: none;
  color: #cdd6f4;
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.wh-btn:hover { background: rgba(255,255,255,0.1); }

.wh-output {
  position: absolute;
  z-index: 2147483646;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 10px;
  padding: 12px 16px;
  max-width: 380px;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.wh-note-input {
  width: 280px;
  background: #313244;
  color: #cdd6f4;
  border: 1px solid #45475a;
  border-radius: 6px;
  padding: 8px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
  margin-top: 6px;
}
```

- [ ] **Step 2: Create toolbar logic**

Create `extension/src/content/toolbar.ts`:
```typescript
const SERVER = 'http://localhost:7749'

let toolbarEl: HTMLElement | null = null
let outputEl: HTMLElement | null = null

export function showToolbar(x: number, y: number, onAction: (action: string) => void) {
  removeToolbar()
  toolbarEl = document.createElement('div')
  toolbarEl.className = 'wh-toolbar'
  toolbarEl.style.left = `${x}px`
  toolbarEl.style.top = `${window.scrollY + y - 48}px`

  const buttons = [
    { id: 'explain', label: '解释这段话' },
    { id: 'card', label: '生成知识卡片' },
    { id: 'note', label: '记录我的看法' },
    { id: 'save', label: '加入知识库' },
  ]

  for (const btn of buttons) {
    const el = document.createElement('button')
    el.className = 'wh-btn'
    el.textContent = btn.label
    el.addEventListener('click', (e) => { e.stopPropagation(); onAction(btn.id) })
    toolbarEl.appendChild(el)
  }

  document.body.appendChild(toolbarEl)
}

export function showOutput(x: number, y: number, content: string) {
  removeOutput()
  outputEl = document.createElement('div')
  outputEl.className = 'wh-output'
  outputEl.style.left = `${x}px`
  outputEl.style.top = `${window.scrollY + y - 48}px`
  outputEl.textContent = content
  document.body.appendChild(outputEl)
}

export function showNoteInput(x: number, y: number, onSubmit: (note: string) => void) {
  removeOutput()
  outputEl = document.createElement('div')
  outputEl.className = 'wh-output'
  outputEl.style.left = `${x}px`
  outputEl.style.top = `${window.scrollY + y - 48}px`

  const label = document.createElement('div')
  label.textContent = '记录你的看法'
  label.style.marginBottom = '4px'
  label.style.fontWeight = '600'

  const textarea = document.createElement('textarea')
  textarea.className = 'wh-note-input'
  textarea.placeholder = 'Enter 提交，Esc 取消'

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(textarea.value.trim())
    } else if (e.key === 'Escape') {
      removeOutput()
    }
  })

  outputEl.appendChild(label)
  outputEl.appendChild(textarea)
  document.body.appendChild(outputEl)
  setTimeout(() => textarea.focus(), 50)
}

export function removeToolbar() {
  toolbarEl?.remove(); toolbarEl = null
}

export function removeOutput() {
  outputEl?.remove(); outputEl = null
}

export async function streamExplain(
  highlight: string,
  pageId: string,
  x: number,
  y: number
) {
  removeOutput()
  outputEl = document.createElement('div')
  outputEl.className = 'wh-output'
  outputEl.style.left = `${x}px`
  outputEl.style.top = `${window.scrollY + y - 48}px`
  outputEl.textContent = '思考中...'
  document.body.appendChild(outputEl)

  const url = `${SERVER}/ai/explain?highlight=${encodeURIComponent(highlight)}&page_id=${encodeURIComponent(pageId)}`
  const response = await fetch(url)
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let text = ''
  outputEl.textContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const { delta } = JSON.parse(data)
        if (delta) { text += delta; outputEl.textContent = text }
      } catch {}
    }
  }
}
```

- [ ] **Step 3: Create content script entry**

Create `extension/src/content/index.ts`:
```typescript
import { serializeSelection, restoreHighlight, Anchor } from './anchor'
import { showToolbar, showOutput, showNoteInput, removeToolbar, removeOutput, streamExplain } from './toolbar'

const SERVER = 'http://localhost:7749'

let currentPageId: string | null = null
let selectionRect: DOMRect | null = null

// Save page content and get page_id on load
async function initPage() {
  try {
    const res = await fetch(`${SERVER}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: location.href,
        title: document.title,
        full_text: document.body.innerText,
      }),
    })
    const data = await res.json()
    currentPageId = data.id
    await restoreAllHighlights()
  } catch {
    // Server not running — silently skip
  }
}

// Restore saved highlights on page load
async function restoreAllHighlights() {
  if (!currentPageId) return
  try {
    const res = await fetch(`${SERVER}/highlights?url=${encodeURIComponent(location.href)}`)
    const highlights = await res.json()
    for (const hl of highlights) {
      const anchor: Anchor = JSON.parse(hl.position)
      const range = restoreHighlight(anchor)
      if (!range) continue
      const mark = document.createElement('mark')
      mark.className = 'wh-highlight'
      mark.title = hl.text
      range.surroundContents(mark)
    }
  } catch {}
}

// Handle toolbar actions
async function handleAction(action: string, selectedText: string, anchor: Anchor) {
  if (action === 'explain') {
    removeToolbar()
    await streamExplain(selectedText, currentPageId ?? '', selectionRect!.left, selectionRect!.top)
    return
  }

  if (action === 'save' || action === 'card') {
    // Save highlight first
    const hlRes = await fetch(`${SERVER}/highlights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: currentPageId, text: selectedText, color: 'yellow', position: JSON.stringify(anchor) }),
    })
    const { id: highlightId } = await hlRes.json()

    if (action === 'card') {
      // Generate AI explanation then create card
      showOutput(selectionRect!.left, selectionRect!.top, '生成知识卡片中...')
      const explainRes = await fetch(`${SERVER}/ai/explain?highlight=${encodeURIComponent(selectedText)}&page_id=${encodeURIComponent(currentPageId ?? '')}`)
      const reader = explainRes.body!.getReader()
      const decoder = new TextDecoder()
      let explanation = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
            try { explanation += JSON.parse(line.slice(6)).delta ?? '' } catch {}
          }
        }
      }
      await fetch(`${SERVER}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: currentPageId, highlight_id: highlightId, title: selectedText.slice(0, 60), ai_explanation: explanation, my_note: '', tags: [] }),
      })
      showOutput(selectionRect!.left, selectionRect!.top, '知识卡片已保存 ✓')
      setTimeout(removeOutput, 2000)
    } else {
      showOutput(selectionRect!.left, selectionRect!.top, '已加入知识库 ✓')
      setTimeout(removeOutput, 1500)
    }
    removeToolbar()
    return
  }

  if (action === 'note') {
    removeToolbar()
    showNoteInput(selectionRect!.left, selectionRect!.top, async (note) => {
      removeOutput()
      // Save highlight with note
      const hlRes = await fetch(`${SERVER}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: currentPageId, text: selectedText, color: 'yellow', position: JSON.stringify(anchor) }),
      })
      const { id: highlightId } = await hlRes.json()
      // Create card with just the note (no AI)
      await fetch(`${SERVER}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: currentPageId, highlight_id: highlightId, title: selectedText.slice(0, 60), ai_explanation: '', my_note: note, tags: [] }),
      })
      showOutput(selectionRect!.left, selectionRect!.top, '看法已记录 ✓')
      setTimeout(removeOutput, 1500)
    })
  }
}

// Main mouseup listener
document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) { removeToolbar(); removeOutput(); return }

  const text = selection.toString().trim()
  if (!text || text.length < 2) { removeToolbar(); return }

  const anchor = serializeSelection(selection)
  if (!anchor) return

  selectionRect = selection.getRangeAt(0).getBoundingClientRect()
  showToolbar(selectionRect.left, selectionRect.top, (action) => {
    handleAction(action, text, anchor)
  })
})

// Dismiss on outside click
document.addEventListener('mousedown', (e) => {
  const target = e.target as HTMLElement
  if (!target.closest('.wh-toolbar') && !target.closest('.wh-output')) {
    removeToolbar()
    removeOutput()
  }
})

// Init on page load
initPage()
```

- [ ] **Step 4: Load extension in Chrome and test manually**

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" → select `extension/` folder
4. Open any article page
5. Select some text → verify toolbar appears
6. Click "加入知识库" → verify "已加入知识库 ✓" appears

- [ ] **Step 5: Commit**

```bash
git add extension/src/content/
git commit -m "feat: implement content script with floating toolbar and highlight restoration"
```

---

## Task 8: Background Service Worker

**Files:**
- Create: `extension/src/background/index.ts`

- [ ] **Step 1: Create background service worker**

Create `extension/src/background/index.ts`:
```typescript
// Open SidePanel on extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id! })
})

// Generic message proxy for sidepanel → server (non-streaming requests)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH') {
    fetch(message.url, message.options)
      .then(res => res.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true // keep channel open for async response
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add extension/src/background/index.ts
git commit -m "feat: add background service worker with sidepanel open + message proxy"
```

---

## Task 9: SidePanel UI

**Files:**
- Create: `extension/src/sidepanel/index.html`
- Create: `extension/src/sidepanel/main.tsx`
- Create: `extension/src/sidepanel/App.tsx`
- Create: `extension/src/sidepanel/components/HighlightList.tsx`
- Create: `extension/src/sidepanel/components/StatusBanner.tsx`

- [ ] **Step 1: Create SidePanel HTML entry**

Create `extension/src/sidepanel/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>Web Highlighter</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f8f9fa; color: #212529; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create StatusBanner component**

Create `extension/src/sidepanel/components/StatusBanner.tsx`:
```tsx
export function StatusBanner({ online }: { online: boolean }) {
  if (online) return null
  return (
    <div style={{ background: '#dc3545', color: '#fff', padding: '8px 12px', fontSize: 12 }}>
      本地服务未运行。请在 server/ 目录执行 <code>npm start</code>
    </div>
  )
}
```

- [ ] **Step 3: Create HighlightList component**

Create `extension/src/sidepanel/components/HighlightList.tsx`:
```tsx
interface Highlight { id: string; text: string; color: string; created_at: number }

export function HighlightList({ highlights }: { highlights: Highlight[] }) {
  if (highlights.length === 0) {
    return <p style={{ padding: 16, color: '#6c757d', fontSize: 13 }}>当前页面暂无划线</p>
  }
  return (
    <ul style={{ listStyle: 'none', padding: '8px 0' }}>
      {highlights.map(hl => (
        <li key={hl.id} style={{ padding: '10px 16px', borderBottom: '1px solid #e9ecef' }}>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: '#212529' }}>
            <span style={{ background: 'rgba(255,220,0,0.4)', borderRadius: 2 }}>{hl.text}</span>
          </p>
          <p style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
            {new Date(hl.created_at).toLocaleString('zh-CN')}
          </p>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Create SidePanel App**

Create `extension/src/sidepanel/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { StatusBanner } from './components/StatusBanner'
import { HighlightList } from './components/HighlightList'

const SERVER = 'http://localhost:7749'

export function App() {
  const [online, setOnline] = useState(true)
  const [highlights, setHighlights] = useState<any[]>([])
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs[0]?.url ?? ''
      setCurrentUrl(url)
      try {
        const res = await fetch(`${SERVER}/highlights?url=${encodeURIComponent(url)}`)
        const data = await res.json()
        setHighlights(data)
        setOnline(true)
      } catch {
        setOnline(false)
      }
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>
      <StatusBanner online={online} />
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ecef' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>当前页面划线</h2>
        <p style={{ fontSize: 11, color: '#6c757d', marginTop: 2, wordBreak: 'break-all' }}>{currentUrl}</p>
      </div>
      <HighlightList highlights={highlights} />
      <div style={{ padding: 16, borderTop: '1px solid #e9ecef', position: 'fixed', bottom: 0, width: '100%', background: '#fff' }}>
        <button
          onClick={() => chrome.tabs.create({ url: SERVER })}
          style={{ width: '100%', padding: '8px 0', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
        >
          打开知识库
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create SidePanel main entry**

Create `extension/src/sidepanel/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)
```

- [ ] **Step 6: Reload extension and test SidePanel**

1. Reload extension in `chrome://extensions/`
2. Click extension icon → SidePanel should open
3. Verify it shows highlights for the current page (or empty state)
4. Verify "打开知识库" button opens `localhost:7749`

- [ ] **Step 7: Commit**

```bash
git add extension/src/sidepanel/
git commit -m "feat: implement SidePanel UI with highlight list and server status"
```

---

## Task 10: Web UI — Library Page & Routing

**Files:**
- Create: `server/web/src/api.ts`
- Create: `server/web/src/App.tsx`
- Create: `server/web/src/components/Sidebar.tsx`
- Create: `server/web/src/pages/LibraryPage.tsx`
- Create: `server/web/src/components/CardList.tsx`
- Create: `server/web/src/components/CardItem.tsx`

- [ ] **Step 1: Create typed API client**

Create `server/web/src/api.ts`:
```typescript
const BASE = 'http://localhost:7749'

export async function getCards(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters).toString()
  const res = await fetch(`${BASE}/cards${params ? '?' + params : ''}`)
  return res.json()
}

export async function getCard(id: string) {
  const res = await fetch(`${BASE}/cards/${id}`)
  return res.json()
}

export async function updateCard(id: string, data: Record<string, any>) {
  await fetch(`${BASE}/cards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function getSettings() {
  const res = await fetch(`${BASE}/settings`)
  return res.json()
}

export async function updateSettings(data: Record<string, string>) {
  await fetch(`${BASE}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export function exportCardUrl(id: string) { return `${BASE}/cards/${id}/export` }
export function exportAllUrl() { return `${BASE}/export` }
```

- [ ] **Step 2: Create Sidebar**

Create `server/web/src/components/Sidebar.tsx`:
```tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export function Sidebar() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <aside style={{ width: 220, borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', padding: '16px 0', minHeight: '100vh' }}>
      <div style={{ padding: '0 16px 16px' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700 }}>知识库</h1>
      </div>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && navigate(`/?q=${encodeURIComponent(q)}`)}
        placeholder="搜索..."
        style={{ margin: '0 12px 12px', padding: '6px 10px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 13 }}
      />
      <nav style={{ flex: 1 }}>
        {[
          { to: '/', label: '全部' },
          { to: '/?filter=site', label: '按网站' },
          { to: '/?filter=tag', label: '按标签' },
          { to: '/?filter=date', label: '按日期' },
        ].map(item => (
          <NavLink key={item.to} to={item.to}
            style={({ isActive }) => ({ display: 'block', padding: '8px 16px', fontSize: 13, color: isActive ? '#0d6efd' : '#495057', textDecoration: 'none', background: isActive ? '#e7f1ff' : 'transparent' })}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/settings" style={{ padding: '8px 16px', fontSize: 13, color: '#6c757d', textDecoration: 'none' }}>
        设置
      </NavLink>
    </aside>
  )
}
```

- [ ] **Step 3: Create CardItem**

Create `server/web/src/components/CardItem.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'

export function CardItem({ card }: { card: any }) {
  const navigate = useNavigate()
  const tags: string[] = JSON.parse(card.tags || '[]')
  return (
    <div onClick={() => navigate(`/cards/${card.id}`)}
      style={{ padding: '14px 16px', borderBottom: '1px solid #e9ecef', cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{card.title || '无标题'}</p>
      <p style={{ fontSize: 12, color: '#6c757d', marginBottom: 6, lineHeight: 1.4 }}>{(card.ai_explanation || card.my_note || '').slice(0, 80)}...</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#6c757d' }}>{card.page_title}</span>
        {tags.map(t => <span key={t} style={{ fontSize: 11, background: '#e7f1ff', color: '#0d6efd', borderRadius: 4, padding: '1px 6px' }}>{t}</span>)}
        <span style={{ fontSize: 11, color: '#adb5bd', marginLeft: 'auto' }}>{new Date(card.created_at).toLocaleDateString('zh-CN')}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create LibraryPage**

Create `server/web/src/pages/LibraryPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCards } from '../api'
import { CardItem } from '../components/CardItem'

export function LibraryPage() {
  const [params] = useSearchParams()
  const [cards, setCards] = useState<any[]>([])

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (params.get('q')) filters.q = params.get('q')!
    if (params.get('url')) filters.url = params.get('url')!
    if (params.get('tag')) filters.tag = params.get('tag')!
    getCards(filters).then(setCards)
  }, [params.toString()])

  return (
    <div>
      <div style={{ padding: '16px', borderBottom: '1px solid #e9ecef' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>
          {params.get('q') ? `搜索: "${params.get('q')}"` : '全部卡片'}
          <span style={{ fontSize: 13, color: '#6c757d', marginLeft: 8, fontWeight: 400 }}>({cards.length})</span>
        </h2>
      </div>
      {cards.length === 0
        ? <p style={{ padding: 24, color: '#6c757d', fontSize: 13 }}>暂无卡片</p>
        : cards.map(c => <CardItem key={c.id} card={c} />)
      }
    </div>
  )
}
```

- [ ] **Step 5: Wire up App with routing**

Create `server/web/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { LibraryPage } from './pages/LibraryPage'

// Lazy placeholders — implemented in next tasks
const CardDetailPage = () => <div style={{ padding: 24 }}>卡片详情（即将完成）</div>
const SettingsPage = () => <div style={{ padding: 24 }}>设置（即将完成）</div>

export function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/cards/:id" element={<CardDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 6: Build and test Web UI**

```bash
cd server/web && npm run build
cd ../ && npm start
```
Open `http://localhost:7749` — verify library page loads with card list.

- [ ] **Step 7: Commit**

```bash
git add server/web/src/
git commit -m "feat: implement web UI library page with card list and sidebar"
```

---

## Task 11: Web UI — Card Detail & AI Chat

**Files:**
- Create: `server/web/src/pages/CardDetailPage.tsx`
- Create: `server/web/src/components/ChatThread.tsx`
- Modify: `server/web/src/App.tsx` — replace placeholder with real page

- [ ] **Step 1: Create ChatThread component**

Create `server/web/src/components/ChatThread.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react'

const SERVER = 'http://localhost:7749'

interface Message { role: 'user' | 'assistant'; content: string }

export function ChatThread({ cardId, initialMessages }: { cardId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const res = await fetch(`${SERVER}/cards/${cardId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg }),
    })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let content = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') { setLoading(false); break }
        try {
          const { delta } = JSON.parse(data)
          if (delta) {
            content += delta
            setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content }])
          }
        } catch {}
      }
    }
  }

  return (
    <div>
      <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ padding: '8px 16px', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#6c757d', display: 'block', marginBottom: 2 }}>
              {m.role === 'user' ? '你' : 'AI'}
            </span>
            <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</p>
          </div>
        ))}
        {loading && <p style={{ padding: '8px 16px', fontSize: 12, color: '#6c757d' }}>思考中...</p>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderTop: '1px solid #e9ecef' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="继续问 AI..."
          style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 13 }}
        />
        <button onClick={send} disabled={loading}
          style={{ padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
          发送
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create CardDetailPage**

Create `server/web/src/pages/CardDetailPage.tsx`:
```tsx
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getCard, updateCard, exportCardUrl } from '../api'
import { ChatThread } from '../components/ChatThread'

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [card, setCard] = useState<any>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (id) getCard(id).then(setCard) }, [id])

  if (!card) return <div style={{ padding: 24, color: '#6c757d' }}>加载中...</div>

  const tags: string[] = JSON.parse(card.tags || '[]')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      {/* Source */}
      <p style={{ fontSize: 12, color: '#6c757d', marginBottom: 8 }}>
        来源：<a href={card.page_url} target="_blank" rel="noreferrer" style={{ color: '#0d6efd' }}>{card.page_title || card.page_url}</a>
      </p>

      {/* Highlighted text */}
      <blockquote style={{ borderLeft: '3px solid #ffd700', paddingLeft: 12, margin: '12px 0', fontSize: 14, color: '#495057', lineHeight: 1.6 }}>
        {card.highlight_text}
      </blockquote>

      {/* AI Explanation */}
      {card.ai_explanation && (
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6c757d', marginBottom: 8 }}>AI 解释</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7 }}>{card.ai_explanation}</p>
        </section>
      )}

      {/* My Note */}
      <section style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6c757d', marginBottom: 8 }}>我的看法</h3>
        <textarea
          ref={noteRef}
          defaultValue={card.my_note}
          onBlur={async () => { await updateCard(card.id, { my_note: noteRef.current?.value ?? '' }) }}
          placeholder="记录你的想法..."
          style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 13, lineHeight: 1.6, resize: 'vertical' }}
        />
      </section>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {tags.map(t => <span key={t} style={{ fontSize: 12, background: '#e7f1ff', color: '#0d6efd', borderRadius: 4, padding: '2px 8px' }}>{t}</span>)}
      </div>

      {/* Export */}
      <div style={{ marginBottom: 20 }}>
        <a href={exportCardUrl(card.id)} download style={{ fontSize: 13, color: '#0d6efd' }}>导出为 Markdown</a>
      </div>

      {/* AI Chat */}
      <section style={{ border: '1px solid #e9ecef', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600 }}>继续问 AI</h3>
        </div>
        <ChatThread cardId={card.id} initialMessages={card.chat_messages} />
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Update App.tsx to use real CardDetailPage**

Edit `server/web/src/App.tsx` — replace lazy placeholder:
```tsx
import { CardDetailPage } from './pages/CardDetailPage'
// Remove: const CardDetailPage = () => <div ...>
```

- [ ] **Step 4: Build and test**

```bash
cd server/web && npm run build && cd .. && npm start
```
- Create a card via extension, then open `localhost:7749`
- Click on a card → verify detail page shows with AI explanation and chat

- [ ] **Step 5: Commit**

```bash
git add server/web/src/
git commit -m "feat: implement card detail page with AI chat thread"
```

---

## Task 12: Web UI — Settings Page

**Files:**
- Create: `server/web/src/pages/SettingsPage.tsx`
- Modify: `server/web/src/App.tsx` — replace placeholder

- [ ] **Step 1: Create SettingsPage**

Create `server/web/src/pages/SettingsPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { getSettings, updateSettings } from '../api'

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']

export function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4o')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings().then((s: Record<string, string>) => {
      setApiKey(s['openai_api_key'] ?? '')
      setModel(s['openai_model'] ?? 'gpt-4o')
    })
  }, [])

  async function save() {
    await updateSettings({ openai_api_key: apiKey, openai_model: model })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 24px' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>设置</h2>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          OpenAI API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 13 }}
        />
        <p style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
          存储在本地 SQLite，不会上传到任何服务器。
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>模型</label>
        <select value={model} onChange={e => setModel(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 13 }}>
          {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <button onClick={save}
        style={{ padding: '8px 20px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
        {saved ? '已保存 ✓' : '保存'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update App.tsx**

Edit `server/web/src/App.tsx` — replace placeholder with real SettingsPage:
```tsx
import { SettingsPage } from './pages/SettingsPage'
// Remove: const SettingsPage = () => <div ...>
```

- [ ] **Step 3: Build and verify**

```bash
cd server/web && npm run build && cd .. && npm start
```
- Open `localhost:7749/settings`
- Enter API key, click Save, refresh page — key should persist

- [ ] **Step 4: Verify model is read dynamically (already done in Task 4)**

`getOpenAIModel()` was added to `server/src/ai/client.ts` in Task 4, and both `routes/chat.ts` and `routes/explain.ts` already call `getOpenAIModel()`. No further changes needed — verify by checking that neither file contains a hardcoded `'gpt-4o'` string:

```bash
grep -r "model: 'gpt-4o'" server/src/routes/
```
Expected: no output (all uses go through `getOpenAIModel()`)

- [ ] **Step 5: Commit**

```bash
git add server/web/src/pages/SettingsPage.tsx server/web/src/App.tsx server/src/ai/client.ts server/src/routes/chat.ts
git commit -m "feat: implement settings page with API key and model configuration"
```

---

## Task 13: End-to-End Smoke Test & README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Full E2E manual test**

Run through all core flows:

1. Start server: `cd server && npm start`
2. Build Web UI: `cd server/web && npm run build`
3. Load extension in Chrome (`chrome://extensions/` → Load unpacked → `extension/`)
4. Open any article page
5. Select text → toolbar appears ✓
6. Click "解释这段话" → streaming AI explanation ✓
7. Click "生成知识卡片" → card saved ✓
8. Click "记录我的看法" → note textarea ✓
9. Click "加入知识库" → highlight saved ✓
10. Reload page → highlights restored ✓
11. Open SidePanel → highlights listed ✓
12. Click "打开知识库" → `localhost:7749` opens ✓
13. Open card detail → explanation + my note + chat ✓
14. Send a message in chat → streaming AI response ✓
15. Auto-save my_note on blur ✓
16. Export single card → `.md` file downloads ✓
17. Export all → `.zip` downloads ✓
18. Settings page → API key saves and persists ✓

- [ ] **Step 2: Create README**

Create `README.md`:
```markdown
# Web Highlighter & Knowledge Base

Highlight text on any webpage and save to your local knowledge base. Powered by OpenAI.

## Setup

### 1. Start the local server

```bash
cd server
npm install
npm start
```

Or on macOS, double-click `server/start.command`.

Server runs at `http://localhost:7749`.

### 2. Build the Web UI (first time only)

```bash
cd server/web
npm install
npm run build
```

### 3. Load the Chrome extension

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder

### 4. Configure API Key

Open `http://localhost:7749/settings` and enter your OpenAI API key.

## Usage

- **Select text** on any page → floating toolbar appears
- **解释这段话** — AI explains the selection (streaming)
- **生成知识卡片** — saves highlight + AI explanation as a card
- **记录我的看法** — adds your personal note to the highlight
- **加入知识库** — saves the highlight without AI

Click the **extension icon** to open the SidePanel with all highlights on the current page.

Open **http://localhost:7749** for the full knowledge library.
```

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: add README with setup and usage instructions"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | Project scaffolding (extension + server + web) |
| 2 | Database schema + query helpers |
| 3 | Express server + all API routes |
| 4 | AI streaming routes (explain + chat) |
| 5 | Export routes (Markdown + ZIP) |
| 6 | Content script anchor utilities |
| 7 | Content script toolbar + core logic |
| 8 | Background service worker |
| 9 | SidePanel UI |
| 10 | Web UI — library page + routing |
| 11 | Web UI — card detail + AI chat |
| 12 | Web UI — settings page |
| 13 | E2E smoke test + README |
