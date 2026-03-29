import { useNavigate } from 'react-router-dom'

export function CardItem({ card }: { card: any }) {
  const navigate = useNavigate()
  const tags: string[] = JSON.parse(card.tags || '[]')
  const preview = (card.ai_explanation || card.my_note || '').trim()
  const domain = card.page_url ? (() => { try { return new URL(card.page_url).hostname.replace('www.', '') } catch { return card.page_url } })() : ''
  const dateStr = new Date(card.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  return (
    <div
      onClick={() => navigate(`/cards/${card.id}`)}
      style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: '20px 22px',
        cursor: 'pointer',
        /* ambient shadow only — no border per Atelier system */
        boxShadow: '0 1px 3px rgba(45,51,56,0.06)',
        transition: 'box-shadow 0.15s, transform 0.12s',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(45,51,56,0.10)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(45,51,56,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Tag — ALL CAPS badge */}
      {(tags.length > 0 || domain) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {tags.slice(0, 2).map(t => (
            <span key={t} style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#596065',
              background: '#ebeef2', borderRadius: 4, padding: '2px 7px',
            }}>
              #{t}
            </span>
          ))}
          {!tags.length && domain && (
            <span style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#596065',
              background: '#ebeef2', borderRadius: 4, padding: '2px 7px',
              maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {domain}
            </span>
          )}
        </div>
      )}

      {/* Highlight quote */}
      {card.highlight_text && (
        <div style={{
          fontSize: 12, color: '#9aa3ab',
          marginBottom: 8, lineHeight: 1.55, fontStyle: 'italic',
          borderLeft: '2px solid #d4d9de', paddingLeft: 10,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {card.highlight_text}
        </div>
      )}

      {/* Title */}
      <p style={{
        fontSize: 15, fontWeight: 600, color: '#2d3338',
        margin: '0 0 8px', lineHeight: 1.4, letterSpacing: '-0.2px',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {card.title || '无标题'}
      </p>

      {/* Preview snippet */}
      {preview && (
        <p style={{
          fontSize: 13, color: '#596065', margin: '0 0 14px', lineHeight: 1.6,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {preview}
        </p>
      )}

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: preview ? 0 : 12, display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9aa3ab" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span style={{ fontSize: 11.5, color: '#9aa3ab' }}>{dateStr}</span>
      </div>
    </div>
  )
}
