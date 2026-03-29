import { Router } from 'express'
import { getSettings, setSetting } from '../db/queries'

const router = Router()

router.get('/', (_req, res) => {
  res.json(getSettings())
})

router.patch('/', (req, res) => {
  const updates = req.body as Record<string, string>
  for (const [key, value] of Object.entries(updates)) {
    setSetting(key, value)
  }
  res.json({ ok: true })
})

export default router
