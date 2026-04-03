import { Router } from 'express'
import { upsertPage, getPageById, updatePageStructure } from '../db/queries'
import { getDb } from '../db/schema'

const router = Router()

router.post('/', (req, res) => {
  const { url, title, full_text } = req.body
  if (!url || !title || !full_text) {
    return res.status(400).json({ error: 'url, title, full_text are required' })
  }
  const result = upsertPage({ url, title, full_text })
  res.json(result)
})

// GET /pages/:id — returns page detail with highlights and their message counts
router.get('/:id', (req, res) => {
  const page = getPageById(req.params.id)
  if (!page) return res.status(404).json({ error: 'Page not found' })

  const highlights = getDb().prepare(`
    SELECT h.*, COUNT(hm.id) as message_count
    FROM highlights h
    LEFT JOIN highlight_messages hm ON hm.highlight_id = h.id
    WHERE h.page_id = ?
    GROUP BY h.id
    ORDER BY h.created_at ASC
  `).all(req.params.id) as any[]

  res.json({ ...page, highlights })
})

// PATCH /pages/:id/structure — save extracted doc structure from content script
router.patch('/:id/structure', (req, res) => {
  const page = getPageById(req.params.id)
  if (!page) return res.status(404).json({ error: 'Page not found' })
  const { doc_structure } = req.body
  if (typeof doc_structure !== 'string') {
    return res.status(400).json({ error: 'doc_structure must be a string' })
  }
  updatePageStructure(req.params.id, doc_structure)
  res.json({ ok: true })
})

export default router
