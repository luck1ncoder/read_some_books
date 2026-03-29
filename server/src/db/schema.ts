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
      context_interpretation TEXT NOT NULL DEFAULT '',
      inferred_intent TEXT NOT NULL DEFAULT '',
      topic TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS highlight_messages (
      id TEXT PRIMARY KEY,
      highlight_id TEXT NOT NULL REFERENCES highlights(id),
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `)

  // Migration: add new columns to existing DBs (SQLite has no ADD COLUMN IF NOT EXISTS)
  const existingPageCols = (db.prepare(`PRAGMA table_info(pages)`).all() as any[]).map(r => r.name)
  if (!existingPageCols.includes('doc_structure')) {
    db.exec(`ALTER TABLE pages ADD COLUMN doc_structure TEXT NOT NULL DEFAULT ''`)
  }

  const existingCols = (db.prepare(`PRAGMA table_info(cards)`).all() as any[]).map(r => r.name)
  if (!existingCols.includes('context_interpretation')) {
    db.exec(`ALTER TABLE cards ADD COLUMN context_interpretation TEXT NOT NULL DEFAULT ''`)
  }
  if (!existingCols.includes('inferred_intent')) {
    db.exec(`ALTER TABLE cards ADD COLUMN inferred_intent TEXT NOT NULL DEFAULT ''`)
  }
  if (!existingCols.includes('topic')) {
    db.exec(`ALTER TABLE cards ADD COLUMN topic TEXT NOT NULL DEFAULT ''`)
  }
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.')
  return db
}
