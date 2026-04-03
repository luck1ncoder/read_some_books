import { Router } from 'express'
import { getCards, getTopics, bulkUpdateTopics, updateCard } from '../db/queries'
import { getOpenAIClient, getOpenAIModel } from '../ai/client'
import { buildClusterPrompt, buildAssignTopicPrompt } from '../ai/prompts'
import { stripThinkTagsFromString } from '../ai/stream'

const router = Router()

// GET /cards/topics — returns existing topics grouped with their cards
router.get('/topics', (req, res) => {
  const allCards = getCards()
  const map = new Map<string, any[]>()
  for (const card of allCards) {
    const topic = card.topic || ''
    if (!map.has(topic)) map.set(topic, [])
    map.get(topic)!.push(card)
  }
  const groups: { name: string; cards: any[] }[] = []
  for (const [topic, cards] of map.entries()) {
    if (topic) groups.push({ name: topic, cards })
  }
  groups.sort((a, b) => b.cards.length - a.cards.length)
  const uncategorized = map.get('') ?? []
  if (uncategorized.length > 0) groups.push({ name: '未分类', cards: uncategorized })
  res.json({ groups, total: allCards.length })
})

// POST /cards/cluster — full recluster all cards, persist results
router.post('/cluster', async (req, res) => {
  const allCards = getCards()
  if (allCards.length === 0) return res.json({ groups: [] })

  try {
    const client = getOpenAIClient()
    const model = getOpenAIModel()
    const prompt = buildClusterPrompt(allCards.map(c => ({
      id: c.id, title: c.title, ai_explanation: c.ai_explanation, context_interpretation: c.context_interpretation,
    })))

    const response = await client.chat.completions.create({
      model, stream: false,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const stripped = stripThinkTagsFromString(raw)
    const jsonStr = stripped.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    let parsed: { groups: { name: string; card_ids: string[] }[] }
    try { parsed = JSON.parse(jsonStr) }
    catch { return res.status(500).json({ error: 'AI 返回格式错误', raw }) }

    const assignments: { id: string; topic: string }[] = []
    for (const g of parsed.groups) {
      for (const id of g.card_ids) assignments.push({ id, topic: g.name })
    }
    bulkUpdateTopics(assignments)

    const cardMap = new Map(allCards.map(c => [c.id, c]))
    const groups = parsed.groups.map(g => ({
      name: g.name,
      cards: g.card_ids.map(id => cardMap.get(id)).filter(Boolean),
    }))
    res.json({ groups })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /cards/:id/assign-topic — assign topic to a single card (incremental)
router.post('/:id/assign-topic', async (req, res) => {
  const allCards = getCards()
  const card = allCards.find(c => c.id === req.params.id)
  if (!card) return res.status(404).json({ error: 'Card not found' })

  const existingTopics = getTopics().map(t => t.topic)
  if (existingTopics.length === 0) return res.json({ topic: '' })

  try {
    const client = getOpenAIClient()
    const model = getOpenAIModel()
    const prompt = buildAssignTopicPrompt({
      title: card.title, ai_explanation: card.ai_explanation, context_interpretation: card.context_interpretation,
    }, existingTopics)

    const response = await client.chat.completions.create({
      model, stream: false,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawTopic = stripThinkTagsFromString(response.choices[0]?.message?.content ?? '')
    const topic = rawTopic.replace(/^["「]|["」]$/g, '')
    if (topic) updateCard(req.params.id, { topic })
    res.json({ topic })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
