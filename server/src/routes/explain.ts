import { Router } from 'express'
import { getPageById } from '../db/queries'
import { getOpenAIClient, getOpenAIModel } from '../ai/client'
import { buildExplainPrompt, SECTION_SEPARATOR } from '../ai/prompts'

const router = Router()

// GET /explain — streaming explain with three sections:
//   section 0 → ai_explanation (local meaning)
//   section 1 → context_interpretation
//   section 2 → inferred_intent
// SSE events:
//   data: {"section": N}          — switches active section (N = 0|1|2)
//   data: {"delta": "..."}        — text chunk for current section
//   data: [DONE]
router.get('/explain', async (req, res) => {
  const { highlight, page_id } = req.query as { highlight: string; page_id: string }
  if (!highlight) return res.status(400).json({ error: 'highlight is required' })

  const page = page_id ? getPageById(page_id) : null

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const client = getOpenAIClient()
    const model = getOpenAIModel()
    const prompt = buildExplainPrompt({ full_text: page?.full_text ?? '', highlight })
    console.log('\n=== EXPLAIN PROMPT ===')
    console.log('highlight:', highlight)
    console.log('page_id:', page_id, '| full_text length:', page?.full_text?.length ?? 0)
    console.log('prompt length:', prompt.length)
    console.log(prompt.slice(0, 500) + '...')
    console.log('=== END PROMPT ===\n')

    const stream = await client.chat.completions.create({
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    })

    // Announce section 0 at the start
    res.write(`data: ${JSON.stringify({ section: 0 })}\n\n`)

    let buffer = ''
    let inThink = false
    let currentSection = 0

    // Helper: flush text, detecting SECTION_SEPARATOR transitions
    function flushBuffer(force = false) {
      while (buffer.length > 0) {
        if (inThink) {
          const endIdx = buffer.indexOf('</think>')
          if (endIdx === -1) return // wait for more
          buffer = buffer.slice(endIdx + 8)
          inThink = false
          continue
        }

        // Check for think block
        const thinkStart = buffer.indexOf('<think>')
        const sepIdx = buffer.indexOf(SECTION_SEPARATOR)

        if (thinkStart !== -1 && (sepIdx === -1 || thinkStart < sepIdx)) {
          // Emit text before <think>
          if (thinkStart > 0) {
            res.write(`data: ${JSON.stringify({ delta: buffer.slice(0, thinkStart) })}\n\n`)
          }
          buffer = buffer.slice(thinkStart + 7)
          inThink = true
          continue
        }

        if (sepIdx !== -1) {
          // There's a separator — check if it's fully in the buffer
          const afterSep = sepIdx + SECTION_SEPARATOR.length
          if (afterSep <= buffer.length || force) {
            // Emit text before separator (trimmed)
            const before = buffer.slice(0, sepIdx).replace(/\n+$/, '')
            if (before) res.write(`data: ${JSON.stringify({ delta: before })}\n\n`)
            // Advance section
            currentSection++
            res.write(`data: ${JSON.stringify({ section: currentSection })}\n\n`)
            buffer = buffer.slice(afterSep).replace(/^\n+/, '')
            continue
          } else {
            // Separator might be incomplete — don't flush beyond safe point
            const safeEnd = sepIdx
            if (safeEnd > 0) {
              res.write(`data: ${JSON.stringify({ delta: buffer.slice(0, safeEnd) })}\n\n`)
              buffer = buffer.slice(safeEnd)
            }
            return
          }
        }

        // No separator, no think block — safe to flush, but keep tail in case separator is split
        const safe = force ? buffer.length : Math.max(0, buffer.length - SECTION_SEPARATOR.length)
        if (safe > 0) {
          res.write(`data: ${JSON.stringify({ delta: buffer.slice(0, safe) })}\n\n`)
          buffer = buffer.slice(safe)
        }
        return
      }
    }

    for await (const chunk of stream) {
      const raw = chunk.choices[0]?.delta?.content ?? ''
      if (!raw) continue
      buffer += raw
      flushBuffer(false)
    }

    // Flush remaining buffer
    flushBuffer(true)

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

export default router
