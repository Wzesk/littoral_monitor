'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { C, TransectTimeSeries } from '@/components/charts'
import * as Icons from '@/components/Icons'
import { EventGlyph } from '@/components/views/NowView'
import type { SiteData, ShorelineRecord } from '@/lib/types'
import { timeSeriesAt } from '@/lib/synthetic'

// Leaflet cannot render server-side
const SiteMap = dynamic(() => import('./SiteMap'), { ssr: false, loading: () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'rgba(255,255,255,0.4)', font: '300 13px/1 var(--font-sans)' }}>
    loading map…
  </div>
) })

interface SelectedSegment { idx: number; segment: string; avg: number }

const SEGMENT_LABELS = ['west arc', 'north-west', 'north', 'north-east', 'east tip', 'south-east', 'south', 'south-west']
function getSegmentLabel(idx: number) {
  return SEGMENT_LABELS[Math.floor(idx / 4) % SEGMENT_LABELS.length]
}

const OVERLAY_DEFS = [
  { k: 'trends', label: 'shoreline history', color: 'linear-gradient(90deg,#440154,#35b779,#fde725)' },
  { k: 'hotspots', label: 'urgent hotspots', color: C.erosion },
  { k: 'baseline', label: 'AOI bounds', color: 'rgba(255,255,255,0.6)', dash: true },
]

export default function SiteView({ data, selectedSegment, drawerOpen, onSelectSegment, onCloseDrawer, overlays, onToggleOverlay, timeOverride }: {
  data: SiteData
  selectedSegment: SelectedSegment | null
  drawerOpen: boolean
  onSelectSegment: (s: SelectedSegment) => void
  onCloseDrawer: () => void
  overlays: Record<string, boolean>
  onToggleOverlay: (k: string) => void
  timeOverride: string | null
}) {
  const { site } = data
  const [selectedObs, setSelectedObs] = useState<ShorelineRecord | null>(null)

  // Fetch all shoreline records for the map
  const { data: shorelines = [] } = useQuery<ShorelineRecord[]>({
    queryKey: ['shorelines', site.site_name],
    queryFn: () => fetch(`/api/site/${encodeURIComponent(site.site_name)}/shorelines`).then(r => r.json()),
    staleTime: 10 * 60 * 1000,
  })

  function handleSelectShoreline(rec: ShorelineRecord | null) {
    setSelectedObs(rec)
    if (rec) {
      // Map shoreline index to a synthetic segment for the drawer
      const obsIdx = shorelines.findIndex(s => s.geojsonPath === rec.geojsonPath)
      const segIdx = shorelines.length > 1 ? Math.floor(obsIdx / shorelines.length * (data.N - 1)) : 0
      onSelectSegment({ idx: segIdx, segment: getSegmentLabel(segIdx), avg: 0 })
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
      {/* Map fills all available space */}
      <div style={{ flex: 1, position: 'relative' }}>
        <SiteMap
          data={data}
          shorelines={shorelines}
          overlays={overlays}
          onSelectShoreline={handleSelectShoreline}
        />

        {/* Site label overlay */}
        <div style={{ position: 'absolute', top: 16, left: 60, zIndex: 1000, color: '#fff', pointerEvents: 'none', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          <div className="kicker" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4, fontSize: 9 }}>{site.location}</div>
          <div style={{ font: '300 18px/1 var(--font-sans)' }}>{site.site_name}</div>
          <div style={{ font: '300 11px/1 var(--font-sans)', color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
            {site.coords && `${site.coords} · `}{site.shorelineM.toLocaleString()} m perimeter
            {timeOverride && <span style={{ color: C.present, marginLeft: 8 }}> · viewing {timeOverride}</span>}
          </div>
        </div>

        {/* Overlay panel */}
        <div style={{
          position: 'absolute', top: 16, right: 16, zIndex: 1000,
          background: 'rgba(10,16,24,0.88)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.12)', minWidth: 210,
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="kicker" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9 }}>overlays</div>
          </div>
          <div style={{ padding: '4px 0' }}>
            {OVERLAY_DEFS.map(it => (
              <button key={it.k} onClick={() => onToggleOverlay(it.k)}
                style={{
                  appearance: 'none', background: overlays[it.k] ? 'rgba(255,255,255,0.04)' : 'transparent',
                  border: 0, cursor: 'pointer', color: '#fff', width: '100%', padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  font: '400 12px/1 var(--font-sans)', textAlign: 'left',
                  opacity: overlays[it.k] ? 1 : 0.45,
                }}>
                <span style={{
                  width: 14, height: 14, border: '1px solid rgba(255,255,255,0.4)',
                  background: overlays[it.k] ? '#fff' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {overlays[it.k] && <span style={{ color: '#000', fontSize: 11, lineHeight: 1 }}>✓</span>}
                </span>
                <span style={{
                  width: 18, height: 6, flexShrink: 0,
                  background: it.color.startsWith('linear') ? undefined : it.color,
                  backgroundImage: it.color.startsWith('linear') ? it.color : undefined,
                  borderTop: it.dash ? `1px dashed ${it.color}` : 'none',
                }} />
                <span style={{ flex: 1 }}>{it.label}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', font: '300 italic 11px/1.4 var(--font-sans)', color: 'rgba(255,255,255,0.45)' }}>
            {shorelines.length > 0
              ? `${shorelines.length} observations · click a shoreline to inspect`
              : 'loading shorelines…'}
          </div>
        </div>

        {/* Viridis legend */}
        {overlays.trends && (
          <div style={{ position: 'absolute', bottom: 40, right: 16, zIndex: 1000, background: 'rgba(0,0,0,0.65)', padding: '10px 14px', color: '#fff' }}>
            <div className="kicker" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontSize: 9 }}>shoreline age</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 80, height: 6, background: 'linear-gradient(to right, #440154, #35b779, #fde725)' }} />
              <div style={{ width: 12, height: 12, background: '#fff', border: '1px solid rgba(255,255,255,0.3)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              <span>oldest</span>
              <span style={{ marginLeft: 42 }}>latest</span>
            </div>
          </div>
        )}

        {/* Selected observation info bar */}
        {selectedObs && (
          <div style={{
            position: 'absolute', bottom: 40, left: 60, zIndex: 1000,
            background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '10px 16px',
            font: '300 12px/1.4 var(--font-sans)', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div>
              <span className="kicker" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>selected · </span>
              {selectedObs.date}
            </div>
            <div>
              <span className="kicker" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>perimeter · </span>
              {selectedObs.lengthM.toLocaleString()} m
            </div>
            {selectedObs.tideCorrected && (
              <div style={{ color: '#35b779', fontSize: 11 }}>✓ tide corrected</div>
            )}
            <button onClick={() => { setSelectedObs(null); onCloseDrawer() }}
              style={{ appearance: 'none', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
              ×
            </button>
          </div>
        )}
      </div>

      {/* Segment drawer */}
      <div className={`drawer ${drawerOpen ? 'drawer--open' : ''}`}>
        {selectedSegment && (
          <SegmentDrawer segment={selectedSegment} data={data} selectedObs={selectedObs} onClose={onCloseDrawer} />
        )}
      </div>
    </div>
  )
}

function SegmentDrawer({ segment, data, selectedObs, onClose }: {
  segment: SelectedSegment
  data: SiteData
  selectedObs: ShorelineRecord | null
  onClose: () => void
}) {
  const { N, longTermM, seasonalM, events } = data
  const tIdx = Math.min(N - 1, Math.max(0, segment.idx))
  const series = timeSeriesAt(data, tIdx)
  const longterm = longTermM[tIdx] ?? 0
  const seasonal = seasonalM[tIdx] ?? 0
  const driver = Math.abs(seasonal) > 1.2 ? 'storm-driven · seasonal signal dominant' :
    longterm > 2 ? 'intervention performing · accreting' :
    longterm < -2 ? 'persistent erosion · drift loss' : 'background variability'
  const relevantEvents = events.filter(e =>
    e.transect && tIdx >= e.transect[0] && tIdx <= e.transect[1]
  )
  const left = longTermM[Math.max(0, tIdx - 12)] ?? 0
  const right = longTermM[Math.min(N - 1, tIdx + 12)] ?? 0

  return (
    <>
      <div className="drawer__h">
        <div style={{ flex: 1 }}>
          <div className="kicker" style={{ marginBottom: 2 }}>
            {selectedObs ? `observation · ${selectedObs.date}` : `shoreline · transect ${tIdx}`}
          </div>
          <div style={{ font: '500 14px/1.2 var(--font-sans)' }}>
            {selectedObs ? `${selectedObs.lengthM.toLocaleString()} m perimeter` : `${segment.segment} · t${tIdx}`}
          </div>
        </div>
        <button className="btn btn--ghost" onClick={onClose} aria-label="close"><Icons.X /></button>
      </div>
      <div className="drawer__body">
        {selectedObs && (
          <div style={{ padding: '12px 0', borderBottom: '1px solid var(--ca-line)', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>date</div>
                <div style={{ font: '400 13px/1 var(--font-sans)' }}>{selectedObs.date}</div>
              </div>
              <div>
                <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>perimeter</div>
                <div style={{ font: '400 13px/1 var(--font-sans)' }}>{selectedObs.lengthM.toLocaleString()} m</div>
              </div>
              <div>
                <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>tide corrected</div>
                <div style={{ font: '400 13px/1 var(--font-sans)', color: selectedObs.tideCorrected ? '#1f7a5a' : C.erosion }}>
                  {selectedObs.tideCorrected ? '✓ yes' : '— no'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--ca-line)', border: '1px solid var(--ca-line)' }}>
          <div style={{ padding: '12px 14px', background: '#fff' }}>
            <div className="kicker" style={{ fontSize: 9 }}>net change · 5 yr <span style={{ color: C.erosion, fontStyle: 'italic' }}>est.</span></div>
            <div className="mono" style={{ font: '300 24px/1.1 var(--font-sans)', color: longterm < 0 ? C.erosion : '#1f7a5a', marginTop: 6 }}>
              {longterm > 0 ? '+' : ''}{longterm.toFixed(1)} <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>m</span>
            </div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>rate {(longterm / 5).toFixed(1)} m/yr</div>
          </div>
          <div style={{ padding: '12px 14px', background: '#fff' }}>
            <div className="kicker" style={{ fontSize: 9 }}>this season <span style={{ color: C.erosion, fontStyle: 'italic' }}>est.</span></div>
            <div className="mono" style={{ font: '300 24px/1.1 var(--font-sans)', color: seasonal < 0 ? C.erosion : '#1f7a5a', marginTop: 6 }}>
              {seasonal > 0 ? '+' : ''}{seasonal.toFixed(1)} <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>m</span>
            </div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>vs 6-yr seasonal mean</div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="kicker" style={{ marginBottom: 6 }}>estimated driver</div>
          <div style={{ font: '400 14px/1.4 var(--font-sans)' }}>{driver}</div>
          <div className="dim" style={{ fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
            ⚠ estimates are synthetic — wire in littoral_infer decomposition to replace
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="kicker" style={{ marginBottom: 8 }}>cross-shore position · synthetic forecast</div>
          <TransectTimeSeries series={series} w={420} h={140} events={relevantEvents} />
          <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>
            relative to baseline · now = {data.now}
          </div>
        </div>

        {relevantEvents.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>events at this segment</div>
            {relevantEvents.map(e => (
              <div key={e.id} style={{ padding: '10px 0', borderTop: '1px solid var(--ca-line)', display: 'flex', gap: 10 }}>
                <EventGlyph kind={e.kind} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: '500 12px/1.2 var(--font-sans)' }}>{e.title}</div>
                  <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>{e.date} · {e.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <div className="kicker" style={{ marginBottom: 8 }}>compared to neighbors · synthetic</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
            <NeighborBar v={left} label="−12 t" />
            <NeighborBar v={longterm} label={`t${tIdx}`} highlight />
            <NeighborBar v={right} label="+12 t" />
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
          <button className="btn btn--ink" style={{ flex: 1, justifyContent: 'center' }}>add to report</button>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }}>flag for action</button>
        </div>
      </div>
    </>
  )
}

function NeighborBar({ v, label, highlight }: { v: number; label: string; highlight?: boolean }) {
  const max = 8
  const t = Math.min(1, Math.abs(v) / max)
  const h = 50 * t
  const color = v < 0 ? C.erosion : C.accretion
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
        <div style={{ width: '70%', height: Math.max(h, 1), background: color, opacity: highlight ? 1 : 0.4 }} />
      </div>
      <div className="mono" style={{ fontSize: 10, color: highlight ? C.ink : 'var(--fg-muted)' }}>
        {v > 0 ? '+' : ''}{v.toFixed(1)}m
      </div>
      <div className="dim" style={{ fontSize: 9 }}>{label}</div>
    </div>
  )
}
