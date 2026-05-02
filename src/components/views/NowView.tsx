'use client'

import { C, Sparkline, TimeSeriesChart, type TsPoint } from '@/components/charts'
import * as Icons from '@/components/Icons'
import type { SiteData, ShorelineEvent, Hotspot } from '@/lib/types'

export default function NowView({ data, onJumpToHotspot }: {
  data: SiteData
  onJumpToHotspot?: (h: Hotspot) => void
}) {
  const { health, site, events, hotspots, timeseries, drift } = data
  const recent = timeseries.slice(-15)
  const statusColor = health.status === 'ok' ? '#7fd9b4' : health.status === 'monitor' ? C.accretion : C.erosion
  const statusTextColor = health.status === 'ok' ? '#1f7a5a' : health.status === 'monitor' ? '#1a1a1a' : '#fff'

  return (
    <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: '#fafafa' }}>
      {/* Hero */}
      <section style={{ padding: '28px 28px 20px', background: '#fff', borderBottom: '1px solid var(--ca-line)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className="pill" style={{ background: statusColor, color: statusTextColor }}>
                <span className="pill__dot" /> {health.status}
              </span>
              <span className="kicker">today · {data.now}</span>
            </div>
            <h2 style={{ font: '300 28px/1.2 var(--font-sans)', margin: '0 0 8px', textWrap: 'balance' }}>
              {health.headline}
            </h2>
            <p style={{ font: '200 15px/1.5 var(--font-sans)', color: 'var(--fg-muted)', margin: 0, maxWidth: 720 }}>
              {health.subhead}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn"><Icons.Share size={13} /> share</button>
            <button className="btn btn--ink"><Icons.FileText size={13} /> draft report</button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 24, borderTop: '1px solid var(--ca-line)' }}>
          <KPI
            label="net change · this season"
            value={`${health.netSeasonM2 > 0 ? '+' : ''}${health.netSeasonM2.toLocaleString()} m²`}
            sub={`${health.netSeasonPct}% of total area`}
            trend={health.netSeasonM2}
            spark={recent.filter(d => d.observed).map(d => d.area)}
          />
          <KPI
            label="90-day nearcast"
            value={`${health.forecast90M2 > 0 ? '+' : ''}${health.forecast90M2.toLocaleString()} m²`}
            sub={`${health.forecast90Pct}% projected`}
            trend={health.forecast90M2}
            forecast
          />
          <KPI
            label="net drift"
            value={drift.netDirection}
            sub={`${drift.netRateMPerYr} m/yr · ${drift.sedimentBudgetM3PerYr.toLocaleString()} m³/yr`}
            compass
          />
          <KPI
            label="active hotspots"
            value={`${hotspots.filter(h => h.priority === 'urgent').length} urgent · ${hotspots.filter(h => h.priority === 'watch').length} watch`}
            sub={`${hotspots.length} segments tracked`}
            bars={hotspots}
          />
        </div>
      </section>

      {/* Two-column: chart + events */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 1, background: 'var(--ca-line)' }}>
        <div style={{ padding: '20px 28px', background: '#fff' }}>
          <div className="card__h" style={{ marginBottom: 14 }}>
            <div>
              <div className="kicker">shoreline area · 6 yr + 90-day nearcast</div>
              <div className="eyebrow" style={{ marginTop: 6 }}>
                solid = observed · dashed = forecast · band = 80% confidence
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Legend swatch={C.erosion} label="storm" />
              <Legend swatch={C.accretion} label="intervention" />
            </div>
          </div>
          <TimeSeriesChart
            series={timeseries.slice(-30) as TsPoint[]}
            w={640}
            h={220}
            showEvents={events.filter(e => ['storm', 'intervention'].includes(e.kind))}
          />
        </div>

        <div style={{ background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div className="card__h" style={{ marginBottom: 8 }}>
            <div className="kicker">recent events</div>
            <button className="btn btn--ghost" style={{ height: 24, padding: '0 6px', fontSize: 11 }}>
              view all <Icons.ChevronRight size={11} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {events.slice(0, 5).map(e => (
              <div key={e.id}
                style={{
                  borderTop: '1px solid var(--ca-line)',
                  padding: '12px 0', display: 'flex', gap: 10,
                }}>
                <EventGlyph kind={e.kind} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ font: '500 13px/1.2 var(--font-sans)' }}>{e.title}</span>
                    <span className="dim mono" style={{ fontSize: 11 }}>{e.date}</span>
                  </div>
                  <div className="dim" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{e.sub}</div>
                  {e.impact != null && (
                    <div style={{ marginTop: 4, fontSize: 11, color: e.impact < 0 ? C.erosion : '#1f7a5a', fontVariantNumeric: 'tabular-nums' }}>
                      {e.impact > 0 ? '+' : ''}{e.impact.toLocaleString()} m²
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hotspots */}
      <section style={{ padding: '24px 28px', background: '#fff', borderTop: '1px solid var(--ca-line)' }}>
        <div className="card__h">
          <div>
            <div className="kicker">at-risk segments · ranked</div>
            <div className="eyebrow" style={{ marginTop: 6 }}>click to inspect on the map</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: 'var(--ca-line)', border: '1px solid var(--ca-line)' }}>
          {hotspots.map(h => (
            <button key={h.id}
              onClick={() => onJumpToHotspot?.(h)}
              style={{ appearance: 'none', background: '#fff', border: 0, padding: '14px 16px', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div>
                  <div style={{ font: '500 13px/1.2 var(--font-sans)' }}>{h.label}</div>
                  <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>{h.driver}</div>
                </div>
                <span className={`pill pill--${h.priority === 'urgent' ? 'urgent' : h.priority === 'watch' ? 'watch' : 'healthy'}`}>
                  {h.priority}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 8 }}>
                <div>
                  <div className="kicker" style={{ fontSize: 9, marginBottom: 2 }}>rate</div>
                  <div className="mono" style={{ font: '500 18px/1 var(--font-sans)', color: h.rateMPerYr < 0 ? C.erosion : '#1f7a5a' }}>
                    {h.rateMPerYr > 0 ? '+' : ''}{h.rateMPerYr}
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 300 }}> m/yr</span>
                  </div>
                </div>
                <div>
                  <div className="kicker" style={{ fontSize: 9, marginBottom: 2 }}>since last</div>
                  <div className="mono" style={{ font: '500 18px/1 var(--font-sans)', color: h.sinceM < 0 ? C.erosion : '#1f7a5a' }}>
                    {h.sinceM > 0 ? '+' : ''}{h.sinceM}
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 300 }}> m</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, marginLeft: 'auto' }}>
                  <Sparkline
                    data={Array.from({ length: 24 }, (_, i) =>
                      Math.sin(i / 3) * 0.3 + h.rateMPerYr * (i / 24) + (((i * 2654435761) >>> 0) / 2 ** 32 - 0.5) * 0.2
                    )}
                    w={80} h={28}
                    stroke={h.rateMPerYr < 0 ? C.erosion : C.accretion}
                    dotLast
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function KPI({ label, value, sub, trend, spark, forecast, compass, bars }: {
  label: string; value: string; sub: string;
  trend?: number; spark?: number[]; forecast?: boolean; compass?: boolean; bars?: Hotspot[]
}) {
  return (
    <div style={{ padding: '16px 18px', borderRight: '1px solid var(--ca-line)', position: 'relative' }}>
      <div className="kicker" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mono" style={{
          font: '300 24px/1 var(--font-sans)',
          color: trend != null ? (trend < 0 ? C.erosion : '#1f7a5a') : 'var(--fg)',
          letterSpacing: '-0.01em',
        }}>
          {value}
        </span>
        {trend != null && <span style={{ fontSize: 18, color: trend < 0 ? C.erosion : '#1f7a5a' }}>{trend < 0 ? '↘' : '↗'}</span>}
      </div>
      <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>{sub}</div>
      {spark && <div style={{ marginTop: 10 }}><Sparkline data={spark} w={140} h={28} stroke={C.ink} baseline /></div>}
      {forecast && (
        <div style={{ marginTop: 10, height: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.06)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '62%', background: C.erosion, opacity: 0.7 }} />
          </div>
          <span className="dim mono" style={{ fontSize: 10 }}>62%</span>
        </div>
      )}
      {compass && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <CompassRose dir={140} />
          <span className="dim" style={{ fontSize: 11 }}>NW → SE</span>
        </div>
      )}
      {bars && (
        <div style={{ marginTop: 10, height: 28 }}>
          <div style={{ display: 'flex', gap: 3, height: 8 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ width: 10, background: h.priority === 'urgent' ? C.erosion : h.priority === 'watch' ? C.accretion : 'rgba(0,0,0,0.12)' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CompassRose({ dir }: { dir: number }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="15" fill="none" stroke={C.line} />
      <line x1="18" y1="3" x2="18" y2="33" stroke={C.line} />
      <line x1="3" y1="18" x2="33" y2="18" stroke={C.line} />
      <g transform={`rotate(${dir} 18 18)`}>
        <polygon points="18,5 21,18 18,16 15,18" fill={C.ink} />
      </g>
      <text x="18" y="2.5" fontSize="6" fill={C.inkMute} textAnchor="middle" fontFamily="Barlow">N</text>
    </svg>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--fg-muted)' }}>
      <span style={{ width: 8, height: 8, background: swatch }} /> {label}
    </span>
  )
}

export function EventGlyph({ kind }: { kind: string }) {
  const color = kind === 'intervention' ? C.accretion : kind === 'storm' ? C.erosion : 'rgba(0,0,0,0.2)'
  const textColor = kind === 'intervention' ? '#000' : '#fff'
  const Icon = kind === 'intervention' ? Icons.Wrench : kind === 'storm' ? Icons.Wind : Icons.AlertTriangle
  return (
    <span style={{ width: 26, height: 26, flexShrink: 0, background: color, color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={13} />
    </span>
  )
}
