import { Router } from 'express'
import archiver from 'archiver'
import { getCardById, getCards } from '../db/queries'

// Shared helper — used by both routers below
export function cardToMarkdown(card: any): string {
  const tags = JSON.parse(card.tags || '[]').map((t: string) => `#${t}`).join(' ')
  return `# ${card.title || 'Untitled'}

**Source:** [${card.page_title || card.page_url}](${card.page_url})

**Highlighted text:**
> ${card.highlight_text || ''}

## AI Explanation
${card.ai_explanation || '_No explanation yet_'}

## My Note
${card.my_note || '_No note yet_'}

${tags ? `**Tags:** ${tags}` : ''}

---
_Created: ${new Date(card.created_at).toISOString()}_
`
}

// Router A: handles GET /cards/:id/export — registered under /cards
export const cardExportRouter = Router()
cardExportRouter.get('/:id/export', (req, res) => {
  const card = getCardById(req.params.id)
  if (!card) return res.status(404).json({ error: 'Card not found' })
  const md = cardToMarkdown(card)
  const filename = `${(card.title || 'card').replace(/[^a-z0-9]/gi, '_')}.md`
  res.setHeader('Content-Type', 'text/markdown')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(md)
})

// Router B: handles GET / (all cards ZIP) — registered under /export
export const allExportRouter = Router()
allExportRouter.get('/', (_req, res) => {
  const cards = getCards()
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', 'attachment; filename="knowledge-base.zip"')
  const archive = archiver('zip')
  archive.pipe(res)
  for (const card of cards) {
    const md = cardToMarkdown(card)
    const filename = `${(card.title || card.id).replace(/[^a-z0-9]/gi, '_')}.md`
    archive.append(md, { name: filename })
  }
  archive.finalize()
})
