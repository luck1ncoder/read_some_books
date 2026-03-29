import express from 'express'
import cors from 'cors'
import path from 'path'
import { initDb } from './db/schema'
import pagesRouter from './routes/pages'
import highlightsRouter from './routes/highlights'
import highlightChatRouter from './routes/highlightChat'
import cardsRouter from './routes/cards'
import clusterRouter from './routes/cluster'
import settingsRouter from './routes/settings'
import chatRouter from './routes/chat'
import explainRouter from './routes/explain'
import { cardExportRouter, allExportRouter } from './routes/export'

const PORT = 7749
const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))

initDb(path.join(__dirname, '../data.db'))

app.use('/pages', pagesRouter)
app.use('/highlights', highlightsRouter)
app.use('/highlights', highlightChatRouter) // GET/POST /highlights/:id/messages, POST /highlights/:id/chat
app.use('/cards', clusterRouter)   // GET /cards/topics, POST /cards/cluster, POST /cards/:id/assign-topic
app.use('/cards', cardsRouter)
app.use('/settings', settingsRouter)
app.use('/cards', chatRouter)          // POST /cards/:id/chat
app.use('/ai', explainRouter)          // GET /ai/explain
app.use('/cards', cardExportRouter)    // GET /cards/:id/export
app.use('/export', allExportRouter)    // GET /export (all cards ZIP)

// Serve Web UI static files (built by `cd web && npm run build`)
app.use(express.static(path.join(__dirname, '../public')))
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

app.listen(PORT, () => {
  console.log(`Web Highlighter server running at http://localhost:${PORT}`)
})
