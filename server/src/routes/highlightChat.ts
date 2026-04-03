import { Router } from 'express'
import { getHighlightWithPage, getHighlightMessages, saveHighlightMessage } from '../db/queries'
import { getOpenAIClient, getOpenAIModel } from '../ai/client'
import { buildAnnotationSystemPrompt } from '../ai/prompts'
import { initSSE, streamCompletion } from '../ai/stream'

const router = Router()

// GET /highlights/:id/messages — fetch annotation chat history
router.get('/:id/messages', (req, res) => {
  const hl = getHighlightWithPage(req.params.id)
  if (!hl) return res.status(404).json({ error: 'Highlight not found' })
  const messages = getHighlightMessages(req.params.id)
  res.json(messages)
})

// POST /highlights/:id/messages — save a user message only (no AI)
router.post('/:id/messages', (req, res) => {
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'content is required' })
  const hl = getHighlightWithPage(req.params.id)
  if (!hl) return res.status(404).json({ error: 'Highlight not found' })
  const result = saveHighlightMessage({ highlight_id: req.params.id, role: 'user', content })
  res.json(result)
})

// POST /highlights/:id/chat — save user message + stream AI response
router.post('/:id/chat', async (req, res) => {
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'content is required' })

  const hl = getHighlightWithPage(req.params.id)
  if (!hl) return res.status(404).json({ error: 'Highlight not found' })

  saveHighlightMessage({ highlight_id: req.params.id, role: 'user', content })

  const history = getHighlightMessages(req.params.id)
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    {
      role: 'system',
      content: buildAnnotationSystemPrompt({
        full_text: hl.page_full_text ?? '',
        highlight: hl.text,
      }),
    },
    ...history.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  initSSE(res)

  try {
    const client = getOpenAIClient()
    const model = getOpenAIModel()
    const stream = await client.chat.completions.create({ model, stream: true, messages })

    const fullResponse = await streamCompletion(res, stream)

    if (fullResponse) {
      saveHighlightMessage({ highlight_id: req.params.id, role: 'assistant', content: fullResponse })
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

export default router
