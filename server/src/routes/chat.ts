import { Router } from 'express'
import { getCardById, getPageById, saveMessage } from '../db/queries'
import { getOpenAIClient, getOpenAIModel } from '../ai/client'
import { buildChatSystemPrompt } from '../ai/prompts'
import { initSSE, streamCompletion } from '../ai/stream'

const router = Router()

// POST /cards/:id/chat — streaming chat
router.post('/:id/chat', async (req, res) => {
  const card = getCardById(req.params.id)
  if (!card) return res.status(404).json({ error: 'Card not found' })

  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'message is required' })

  const page = card.page_id ? getPageById(card.page_id) : null
  saveMessage({ card_id: card.id, role: 'user', content: message })

  initSSE(res)

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

    const fullContent = await streamCompletion(res, stream)
    saveMessage({ card_id: card.id, role: 'assistant', content: fullContent })
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

export default router
