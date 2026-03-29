import { Router } from 'express'
import { saveHighlight, getHighlightsByUrl } from '../db/queries'

const router = Router()

router.post('/', (req, res) => {
  const { page_id, text, color = 'yellow', position } = req.body
  if (!page_id || !text || !position) {
    return res.status(400).json({ error: 'page_id, text, position are required' })
  }
  const result = saveHighlight({ page_id, text, color, position })
  res.json(result)
})

router.get('/', (req, res) => {
  const url = req.query.url as string
  if (!url) return res.status(400).json({ error: 'url query param is required' })
  const highlights = getHighlightsByUrl(url)
  res.json(highlights)
})

export default router
