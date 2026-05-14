'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { SiteListItem } from '@/lib/types'

export default function SiteListClient() {
  const router = useRouter()
  const { data: sites, isLoading, error } = useQuery<SiteListItem[]>({
    queryKey: ['sites'],
    queryFn: () => fetch('/api/sites').then(r => r.json()),
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      {/* Header */}
      <div style={{
        height: 64, borderBottom: '1px solid var(--ca-line)',
        background: '#fff', display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16,
      }}>
        <img src="/assets/coastal-logo-mark.png" alt="" style={{ width: 28 }} />
        <div style={{ width: 1, height: 20, background: 'var(--ca-line)' }} />
        <div style={{ font: '300 18px/1 var(--font-sans)' }}>coastal · monitor</div>
        <div style={{ flex: 1 }} />
        <span className="dim" style={{ font: '300 12px/1 var(--font-sans)' }}>
          {sites?.length ?? '—'} sites
        </span>
      </div>

      {/* Body */}
      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: '32px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="kicker" style={{ marginBottom: 8 }}>monitored sites</div>
          <div style={{ font: '200 28px/1.2 var(--font-sans)', marginBottom: 6 }}>
            select a site to open its dashboard
          </div>
          <div className="eyebrow" style={{ marginBottom: 32 }}>
            shoreline dynamics · 6-year history · 90-day nearcast
          </div>

          {isLoading && (
            <div className="dim" style={{ font: '300 14px/1 var(--font-sans)' }}>loading sites…</div>
          )}
          {error && (
            <div style={{ color: '#ff3b46', font: '300 14px/1 var(--font-sans)' }}>
              failed to load sites — check BigQuery connection
            </div>
          )}

          {sites && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 1,
              background: 'var(--ca-line)',
              border: '1px solid var(--ca-line)',
            }}>
              {sites.map(site => (
                <button
                  key={site.id}
                  onClick={() => router.push(`/site/${site.site_name}`)}
                  style={{
                    appearance: 'none', border: 0, background: '#fff',
                    padding: '20px 20px', textAlign: 'left', cursor: 'pointer',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                    <div style={{ font: '500 14px/1.2 var(--font-sans)' }}>{site.site_name}</div>
                    <span className={`pill pill--${site.periodic ? 'ok' : 'ghost'}`} style={{ fontSize: 10 }}>
                      {site.periodic ? 'periodic' : 'open coast'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div>
                      <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>shorelines</div>
                      <div className="mono" style={{ font: '300 20px/1 var(--font-sans)' }}>
                        {site.shorelineCount.toLocaleString()}
                      </div>
                    </div>
                    {site.lastRun && (
                      <div>
                        <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>last run</div>
                        <div className="mono" style={{ font: '300 20px/1 var(--font-sans)' }}>
                          {site.lastRun.slice(0, 10)}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {sites && sites.length === 0 && (
            <div className="dim" style={{ font: '300 14px/1.5 var(--font-sans)' }}>
              no sites found in the islands table.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
