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
