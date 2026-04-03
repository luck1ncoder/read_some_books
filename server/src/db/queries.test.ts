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
    const card = createCard({ page_id: pageId, highlight_id: null, title: 'My Card', ai_explanation: 'explained', context_interpretation: '', inferred_intent: '', my_note: '', tags: [] })
    const fetched = getCardById(card.id)
    expect(fetched?.title).toBe('My Card')
    expect(fetched?.chat_messages).toHaveLength(0)
  })

  it('getCards filters by url', () => {
    const { id: p1 } = upsertPage({ url: 'https://site1.com', title: 'S1', full_text: 'body' })
    const { id: p2 } = upsertPage({ url: 'https://site2.com', title: 'S2', full_text: 'body' })
    createCard({ page_id: p1, highlight_id: null, title: 'Card1', ai_explanation: '', context_interpretation: '', inferred_intent: '', my_note: '', tags: [] })
    createCard({ page_id: p2, highlight_id: null, title: 'Card2', ai_explanation: '', context_interpretation: '', inferred_intent: '', my_note: '', tags: [] })
    const results = getCards({ url: 'https://site1.com' })
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Card1')
  })

  it('setSetting and getSettings round-trips', () => {
    setSetting('openai_api_key', 'sk-test')
    const settings = getSettings()
    expect(settings['openai_api_key']).toBe('sk-test')
  })

  it('updateCard updates my_note', () => {
    const { id: pageId } = upsertPage({ url: 'https://e.com', title: 'E', full_text: 'body' })
    const card = createCard({ page_id: pageId, highlight_id: null, title: 'Card', ai_explanation: '', context_interpretation: '', inferred_intent: '', my_note: '', tags: [] })
    updateCard(card.id, { my_note: 'my thought' })
    const fetched = getCardById(card.id)
    expect(fetched?.my_note).toBe('my thought')
  })

  it('saveMessage stores message and appears in getCardById', () => {
    const { id: pageId } = upsertPage({ url: 'https://f.com', title: 'F', full_text: 'body' })
    const card = createCard({ page_id: pageId, highlight_id: null, title: 'Card', ai_explanation: '', context_interpretation: '', inferred_intent: '', my_note: '', tags: [] })
    saveMessage({ card_id: card.id, role: 'user', content: 'hello?' })
    saveMessage({ card_id: card.id, role: 'assistant', content: 'hi!' })
    const fetched = getCardById(card.id)
    expect(fetched?.chat_messages).toHaveLength(2)
    expect(fetched?.chat_messages[0].role).toBe('user')
  })

  it('getCardById returns highlight_text via JOIN', () => {
    const { id: pageId } = upsertPage({ url: 'https://g.com', title: 'G', full_text: 'body' })
    const hl = saveHighlight({ page_id: pageId, text: 'key text', color: 'yellow', position: '{}' })
    const card = createCard({ page_id: pageId, highlight_id: hl.id, title: 'Card', ai_explanation: '', context_interpretation: '', inferred_intent: '', my_note: '', tags: [] })
    const fetched = getCardById(card.id)
    expect(fetched?.highlight_text).toBe('key text')
  })

  it('getCards filters by keyword q', () => {
    const { id: p1 } = upsertPage({ url: 'https://h.com', title: 'H', full_text: 'body' })
    createCard({ page_id: p1, highlight_id: null, title: 'React Hooks', ai_explanation: '', context_interpretation: '', inferred_intent: '', my_note: '', tags: [] })
    createCard({ page_id: p1, highlight_id: null, title: 'Vue Composition', ai_explanation: '', context_interpretation: '', inferred_intent: '', my_note: '', tags: [] })
    const results = getCards({ q: 'React' })
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('React Hooks')
  })
})
