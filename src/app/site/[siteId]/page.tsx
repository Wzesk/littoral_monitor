'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import * as Icons from '@/components/Icons'
import NowView from '@/components/views/NowView'
import SiteView from '@/components/views/SiteView'
import TrendsView from '@/components/views/TrendsView'
import AnalyticsView from '@/components/views/AnalyticsView'
import DataView from '@/components/views/DataView'
import ChatView from '@/components/views/ChatView'
import type { SiteData, Hotspot } from '@/lib/types'

const TABS = [
  { id: 'now',       label: 'now',       Icon: Icons.Activity,  desc: 'operator dashboard' },
  { id: 'site',      label: 'site',      Icon: Icons.SiteMap,   desc: 'live shoreline · overlays' },
  { id: 'trends',    label: 'trends',    Icon: Icons.Trends,    desc: 'island dynamics over time' },
  { id: 'analytics', label: 'analytics', Icon: Icons.Analytics, desc: 'drivers · scenarios · interventions' },
  { id: 'data',      label: 'data',      Icon: Icons.Data,      desc: 'observations · sources · quality' },
  { id: 'chat',      label: 'chat',      Icon: Icons.Chat,      desc: 'analyst agent · grounded in this site' },
]

type TabId = 'now' | 'site' | 'trends' | 'analytics' | 'data' | 'chat'

export default function SiteDashboard() {
  const { siteId } = useParams<{ siteId: string }>()
  const decodedId = decodeURIComponent(siteId)

  const [tab, setTab] = useState<TabId>('now')
  const [selectedSegment, setSelectedSegment] = useState<{ idx: number; segment: string; avg: number } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [overlays, setOverlays] = useState({
    trends: true, seasonal: false, events: true, baseline: true, hotspots: true,
  })
  const [scrubDate, setScrubDate] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery<SiteData>({
    queryKey: ['site', decodedId],
    queryFn: () => fetch(`/api/site/${encodeURIComponent(decodedId)}`).then(r => {
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    }),
    staleTime: 10 * 60 * 1000,
  })

  function jumpToHotspot(h: Hotspot) {
    setTab('site')
    const segs = (data?.shorelinePoints.length ?? 30) - 1
    const segIdx = Math.floor((h.transect[0] + h.transect[1]) / 2 / (data?.N ?? 256) * segs)
    setSelectedSegment({ idx: segIdx, segment: h.label, avg: h.sinceM })
    setDrawerOpen(true)
  }

  const activeTab = TABS.find(t => t.id === tab)!

  return (
    <div className="app">
      {/* Left rail */}
      <aside className="rail">
        <div className="rail__brand">
          <a href="/" style={{ display: 'flex' }}>
            <img src="/assets/coastal-logo-mark.png" alt="coastal assembly" />
          </a>
        </div>
        <nav className="rail__nav">
          {TABS.map(t => (
            <button key={t.id}
              className={`rail__btn ${t.id === tab ? 'rail__btn--active' : ''}`}
              onClick={() => { setTab(t.id as TabId); setDrawerOpen(false) }}
              title={t.desc}>
              <t.Icon size={20} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="rail__foot">
          <button className="rail__btn" style={{ height: 40 }} title="settings">
            <Icons.Settings size={18} />
          </button>
          <div className="rail__avatar">LI</div>
        </div>
      </aside>

      {/* Workspace */}
      <main className="workspace">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <div className="topbar__title">coastal · {activeTab.label}</div>
            <div className="topbar__sub">
              {data ? `${data.site.site_name} · ${data.site.location}` : decodedId}
            </div>
          </div>
          <div className="topbar__divider" />
          {data && (
            <span className={`pill pill--${data.health.status === 'ok' ? 'ok' : data.health.status === 'monitor' ? 'watch' : 'urgent'}`}>
              <span className="pill__dot" /> {data.health.status}
            </span>
          )}
          <div className="topbar__spacer" />
          {data && (
            <span className="dim mono" style={{ fontSize: 11 }}>
              last sync · {data.now}
            </span>
          )}
          <button className="topbar__chip">
            <Icons.Calendar size={13} /> {data?.now.slice(0, 7) ?? '—'}
          </button>
          <button className="topbar__chip">
            <Icons.Bell size={13} /> {data?.events.length ?? '—'}
          </button>
          <button className="topbar__chip topbar__chip--ink">
            <Icons.Download size={13} /> export report
          </button>
        </header>

        {/* Loading / error states */}
        {isLoading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', font: '300 14px/1 var(--font-sans)' }}>
            loading site data…
          </div>
        )}
        {error && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '300 16px/1 var(--font-sans)', color: '#ff3b46', marginBottom: 8 }}>
                failed to load site data
              </div>
              <div className="dim" style={{ font: '300 13px/1 var(--font-sans)' }}>
                check BigQuery connection and site id: {decodedId}
              </div>
            </div>
          </div>
        )}

        {/* Views */}
        {data && (
          <>
            {tab === 'now' && (
              <NowView data={data} onJumpToHotspot={jumpToHotspot} />
            )}
            {tab === 'site' && (
              <SiteView
                data={data}
                selectedSegment={selectedSegment}
                drawerOpen={drawerOpen}
                onSelectSegment={s => { setSelectedSegment(s); setDrawerOpen(true) }}
                onCloseDrawer={() => setDrawerOpen(false)}
                overlays={overlays}
                onToggleOverlay={k => setOverlays(o => ({ ...o, [k]: !o[k as keyof typeof o] }))}
                timeOverride={scrubDate}
              />
            )}
            {tab === 'trends' && (
              <TrendsView data={data} onScrubToDate={setScrubDate} />
            )}
            {tab === 'analytics' && (
              <AnalyticsView data={data} />
            )}
            {tab === 'data' && (
              <DataView data={data} />
            )}
            {tab === 'chat' && (
              <ChatView data={data} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
