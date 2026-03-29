import { Router } from 'express'
import { getPageById } from '../db/queries'
import { getOpenAIClient, getOpenAIModel } from '../ai/client'
import { buildExplainPrompt, SECTION_SEPARATOR } from '../ai/prompts'
import { initSSE, stripThinkTags } from '../ai/stream'

const router = Router()

// GET /explain — streaming explain with three sections:
//   section 0 → ai_explanation, section 1 → context_interpretation, section 2 → inferred_intent
router.get('/explain', async (req, res) => {
  const { highlight, page_id } = req.query as { highlight: string; page_id: string }
  if (!highlight) return res.status(400).json({ error: 'highlight is required' })

  const page = page_id ? getPageById(page_id) : null

  initSSE(res)

  try {
    const client = getOpenAIClient()
    const model = getOpenAIModel()
    const prompt = buildExplainPrompt({ full_text: page?.full_text ?? '', highlight })

    const stream = await client.chat.completions.create({
      model, stream: true,
      messages: [{ role: 'user', content: prompt }],
    })

    res.write(`data: ${JSON.stringify({ section: 0 })}\n\n`)

    let buffer = ''
    let inThink = false
    let currentSection = 0

    function flushBuffer(force = false) {
      // First strip think tags
      const result = stripThinkTags(buffer, inThink)
      inThink = result.inThink
      // Work with cleaned text + remaining buffer
      let text = result.emit
      buffer = result.buffer

      while (text.length > 0) {
        const sepIdx = text.indexOf(SECTION_SEPARATOR)
        if (sepIdx !== -1) {
          const before = text.slice(0, sepIdx).replace(/\n+$/, '')
          if (before) res.write(`data: ${JSON.stringify({ delta: before })}\n\n`)
          currentSection++
          res.write(`data: ${JSON.stringify({ section: currentSection })}\n\n`)
          text = text.slice(sepIdx + SECTION_SEPARATOR.length).replace(/^\n+/, '')
        } else if (force) {
          if (text) res.write(`data: ${JSON.stringify({ delta: text })}\n\n`)
          text = ''
        } else {
          // Keep tail in case separator is split across chunks
          const safe = Math.max(0, text.length - SECTION_SEPARATOR.length)
          if (safe > 0) {
            res.write(`data: ${JSON.stringify({ delta: text.slice(0, safe) })}\n\n`)
            text = text.slice(safe)
          }
          // Put unprocessed text back into buffer
          buffer = text + buffer
          break
        }
      }
    }

    for await (const chunk of stream) {
      const raw = chunk.choices[0]?.delta?.content ?? ''
      if (!raw) continue
      buffer += raw
      flushBuffer(false)
    }

    flushBuffer(true)
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

export default router
