import { v4 as uuid } from 'uuid'
import { getDb } from './schema'

// --- Pages ---

export function upsertPage(data: { url: string; title: string; full_text: string }) {
  const db = getDb()
  // Use INSERT ... ON CONFLICT for atomic upsert
  const now = Date.now()
  const tempId = uuid()

  // Try to insert first
  db.prepare(`
    INSERT INTO pages (id, url, title, full_text, saved_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      full_text = excluded.full_text,
      saved_at = excluded.saved_at
  `).run(tempId, data.url, data.title, data.full_text, now)

  // Get the actual id (could be tempId if newly inserted, or existing id)
  const row = db.prepare('SELECT id FROM pages WHERE url = ?').get(data.url) as { id: string }
  const created = row.id === tempId
  return { id: row.id, created }
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
