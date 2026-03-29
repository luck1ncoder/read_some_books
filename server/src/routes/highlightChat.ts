import { Router } from 'express'
import { getHighlightWithPage, getHighlightMessages, saveHighlightMessage } from '../db/queries'
import { getOpenAIClient, getOpenAIModel } from '../ai/client'
import { buildAnnotationSystemPrompt } from '../ai/prompts'

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

  // Save user message first
  saveHighlightMessage({ highlight_id: req.params.id, role: 'user', content })

  // Build conversation history for AI
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

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const client = getOpenAIClient()
    const model = getOpenAIModel()
    const stream = await client.chat.completions.create({ model, stream: true, messages })

    let buffer = ''
    let inThink = false
    let fullResponse = ''

    for await (const chunk of stream) {
      const raw = chunk.choices[0]?.delta?.content ?? ''
      if (!raw) continue
      buffer += raw

      while (true) {
        if (inThink) {
          const endIdx = buffer.indexOf('</think>')
          if (endIdx === -1) break
          buffer = buffer.slice(endIdx + 8)
          inThink = false
        } else {
          const startIdx = buffer.indexOf('<think>')
          if (startIdx === -1) {
            if (buffer) {
              fullResponse += buffer
              res.write(`data: ${JSON.stringify({ delta: buffer })}\n\n`)
              buffer = ''
            }
            break
          } else {
            if (startIdx > 0) {
              fullResponse += buffer.slice(0, startIdx)
              res.write(`data: ${JSON.stringify({ delta: buffer.slice(0, startIdx) })}\n\n`)
            }
            buffer = buffer.slice(startIdx + 7)
            inThink = true
          }
        }
      }
    }

    if (buffer && !inThink) {
      fullResponse += buffer
      res.write(`data: ${JSON.stringify({ delta: buffer })}\n\n`)
    }

    // Save assistant response to DB
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
