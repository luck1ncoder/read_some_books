import { Router } from 'express'
import { createCard, getCards, getCardById, updateCard } from '../db/queries'

const router = Router()

router.post('/', (req, res) => {
  const { page_id, highlight_id, title, ai_explanation, context_interpretation, inferred_intent, my_note, tags } = req.body
  const card = createCard({
    page_id: page_id ?? null,
    highlight_id: highlight_id ?? null,
    title: title ?? '',
    ai_explanation: ai_explanation ?? '',
    context_interpretation: context_interpretation ?? '',
    inferred_intent: inferred_intent ?? '',
    my_note: my_note ?? '',
    tags: tags ?? [],
  })
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
  const { title, my_note, tags, inferred_intent } = req.body
  updateCard(req.params.id, { title, my_note, tags, inferred_intent })
  res.json({ ok: true })
})

export default router
