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
