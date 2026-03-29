import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCards, getTopicGroups, reclusterCards, getPageDetail } from '../api'
import { CardItem } from '../components/CardItem'
import { ArticleView } from '../components/ArticleView'
import { BookView } from '../components/BookView'
import { getDomain } from '../components/shared'

function groupBySite(cards: any[]) {
  const map = new Map<string, { domain: string; page_title: string; page_url: string; cards: any[] }>()
  for (const c of cards) {
    const key = c.page_url || '__no_url__'
    if (!map.has(key)) {
      const domain = c.page_url ? getDomain(c.page_url) : '未知来源'
      map.set(key, { domain, page_title: c.page_title || domain, page_url: c.page_url || '', cards: [] })
    }
    map.get(key)!.cards.push(c)
  }
  return Array.from(map.values()).sort((a, b) => b.cards[0].created_at - a.cards[0].created_at)
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 3px rgba(45,51,56,0.06)' }}>
          <div style={{ height: 10, background: '#ebeef2', borderRadius: 4, width: '30%', marginBottom: 12 }} />
          <div style={{ height: 14, background: '#ebeef2', borderRadius: 4, width: '75%', marginBottom: 8 }} />
          <div style={{ height: 11, background: '#f2f4f6', borderRadius: 4, width: '90%', marginBottom: 5 }} />
          <div style={{ height: 11, background: '#f2f4f6', borderRadius: 4, width: '65%', marginBottom: 16 }} />
          <div style={{ height: 10, background: '#f2f4f6', borderRadius: 4, width: '25%' }} />
        </div>
      ))}
    </div>
  )
}

// ── Group header ──────────────────────────────────────────────────────────────
function GroupHeader({ icon, title, subtitle, href }: { icon: React.ReactNode; title: string; subtitle: string; href?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(45,51,56,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 600, color: '#2d3338', textDecoration: 'none', letterSpacing: '-0.2px' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >{title}</a>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: '#2d3338', letterSpacing: '-0.2px' }}>{title}</span>
        )}
      </div>
      <span style={{ fontSize: 12, color: '#9aa3ab' }}>{subtitle}</span>
    </div>
  )
}

// ── Cluster view ──────────────────────────────────────────────────────────────
function ClusterView() {
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading')
  const [reclusterState, setReclusterState] = useState<'idle' | 'running'>('idle')
  const [groups, setGroups] = useState<{ name: string; cards: any[] }[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  function load() {
    setLoadState('loading')
    getTopicGroups()
      .then(data => { setGroups(data.groups ?? []); setTotal(data.total ?? 0); setLoadState('done') })
      .catch(e => { setError(e.message); setLoadState('error') })
  }

  useEffect(() => { load() }, [])

  async function handleRecluster() {
    setReclusterState('running')
    try {
      await reclusterCards()
      await load()
    } catch {}
    setReclusterState('idle')
  }

  const topicIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa3ab" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.3-6.7-2.1 2.1M8.4 15.6l-2.1 2.1m0-11.4 2.1 2.1m7.2 7.2 2.1 2.1"/>
    </svg>
  )

  const reclusterBtn = (
    <button
      onClick={handleRecluster}
      disabled={reclusterState === 'running'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12.5, color: reclusterState === 'running' ? '#9aa3ab' : '#596065',
        background: '#fff', border: '1px solid rgba(45,51,56,0.15)',
        borderRadius: 8, padding: '6px 14px', cursor: reclusterState === 'running' ? 'default' : 'pointer',
        fontFamily: 'inherit', transition: 'all 0.12s',
      }}
      onMouseEnter={e => { if (reclusterState === 'idle') (e.currentTarget.style.borderColor = 'rgba(45,51,56,0.3)') }}
      onMouseLeave={e => { (e.currentTarget.style.borderColor = 'rgba(45,51,56,0.15)') }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
      </svg>
      {reclusterState === 'running' ? 'AI 重新分组中...' : '重新分组'}
    </button>
  )

  if (loadState === 'loading') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '14px 18px', background: '#fff', borderRadius: 12, border: '1px solid rgba(45,51,56,0.08)', boxShadow: '0 1px 3px rgba(45,51,56,0.06)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5f5e60' }} />
        <span style={{ fontSize: 13, color: '#596065' }}>加载分组中...</span>
      </div>
      <SkeletonGrid />
    </div>
  )

  if (loadState === 'error') return (
    <div style={{ paddingTop: 60, textAlign: 'center' }}>
      <p style={{ fontSize: 14, color: '#9aa3ab' }}>加载失败：{error}</p>
    </div>
  )

  // No cards at all
  if (total === 0) return (
    <div style={{ paddingTop: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.15 }}>◻</div>
      <p style={{ fontSize: 15, color: '#2d3338', fontWeight: 500, margin: '0 0 6px' }}>还没有卡片</p>
      <p style={{ fontSize: 14, color: '#9aa3ab', margin: 0 }}>在网页上划线，知识卡片会自动生成并归类</p>
    </div>
  )

  // Has cards but none with topics yet — prompt first cluster
  const hasTopics = groups.some(g => g.name !== '未分类')
  if (!hasTopics) return (
    <div style={{ paddingTop: 40, textAlign: 'center' }}>
      <p style={{ fontSize: 15, color: '#2d3338', fontWeight: 500, margin: '0 0 8px' }}>
        共 {total} 张卡片，尚未分组
      </p>
      <p style={{ fontSize: 13, color: '#9aa3ab', margin: '0 0 24px' }}>点击「重新分组」让 AI 一次性归类所有卡片</p>
      {reclusterBtn}
    </div>
  )

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        {reclusterBtn}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {groups.map(group => (
          <div key={group.name}>
            <GroupHeader
              icon={topicIcon}
              title={group.name}
              subtitle={`${group.cards.length} 张卡片`}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {group.cards.map((c: any) => <CardItem key={c.id} card={c} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Site group: auto-selects BookView > ArticleView > CardGrid ────────────────
function SiteGroup({ group, siteIcon }: { group: ReturnType<typeof groupBySite>[number]; siteIcon: React.ReactNode }) {
  const pageId = group.cards[0]?.page_id ?? null
  const [mode, setMode] = useState<'loading' | 'book' | 'article' | 'grid'>('loading')

  useEffect(() => {
    if (!pageId) { setMode('grid'); return }
    getPageDetail(pageId).then(data => {
      if (data?.doc_structure && data.doc_structure.length > 2) setMode('book')
      else if (data?.full_text && data.full_text.length > 0) setMode('article')
      else setMode('grid')
    }).catch(() => setMode('grid'))
  }, [pageId])

  return (
    <div>
      <GroupHeader
        icon={siteIcon}
        title={group.page_title || group.domain}
        subtitle={`${group.cards.length} 张卡片`}
        href={group.page_url || undefined}
      />
      {mode === 'loading' ? (
        <div style={{ height: 80, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(45,51,56,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: '#9aa3ab' }}>加载中...</span>
        </div>
      ) : mode === 'book' ? (
        <BookView pageId={pageId!} />
      ) : mode === 'article' ? (
        <ArticleView pageId={pageId!} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {group.cards.map(c => <CardItem key={c.id} card={c} />)}
        </div>
      )}
    </div>
  )
}

function SiteView({ cards }: { cards: any[] }) {
  const siteIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa3ab" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
      {groupBySite(cards).map(group => (
        <SiteGroup key={group.page_url} group={group} siteIcon={siteIcon} />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function LibraryPage() {
  const [params] = useSearchParams()
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const filter = params.get('filter')
  const isSiteView = filter === 'site'
  const isTopicView = filter === 'topic'
  const q = params.get('q')

  useEffect(() => {
    if (isTopicView) { setLoading(false); return }
    setLoading(true)
    const filters: Record<string, string> = {}
    if (params.get('q')) filters.q = params.get('q')!
    if (params.get('url')) filters.url = params.get('url')!
    if (params.get('tag')) filters.tag = params.get('tag')!
    getCards(filters).then(data => { setCards(data); setLoading(false) })
  }, [params.toString()])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px 80px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        {q && <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 8 }}>搜索结果</div>}
        <h1 style={{ fontSize: 36, fontWeight: 600, color: '#2d3338', margin: '0 0 10px', letterSpacing: '-0.8px', lineHeight: 1.15 }}>
          {q ? `"${q}"` : isSiteView ? '按来源' : isTopicView ? '按话题' : '全部卡片'}
        </h1>
        {!loading && !isTopicView && (
          <p style={{ fontSize: 14, color: '#596065', margin: 0 }}>
            共 {cards.length} 张知识卡片
            {isSiteView && cards.length > 0 ? `，来自 ${groupBySite(cards).length} 个来源` : ''}
          </p>
        )}
        {isTopicView && (
          <p style={{ fontSize: 14, color: '#596065', margin: 0 }}>新卡片自动归类，可手动重新分组</p>
        )}
      </div>

      {/* Topic view — handled separately */}
      {isTopicView ? <ClusterView /> : loading ? <SkeletonGrid /> : cards.length === 0 ? (
        <div style={{ paddingTop: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.15 }}>◻</div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#2d3338', margin: '0 0 6px' }}>
            {q ? `没有找到"${q}"相关的卡片` : '还没有卡片'}
          </p>
          <p style={{ fontSize: 14, color: '#9aa3ab', margin: 0 }}>
            {q ? '换个关键词试试' : '在网页上划线，知识卡片会自动生成'}
          </p>
        </div>
      ) : isSiteView ? (
        <SiteView cards={cards} />
      
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {cards.map(c => <CardItem key={c.id} card={c} />)}
        </div>
      )}
    </div>
  )
}
