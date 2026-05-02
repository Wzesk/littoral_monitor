'use client'

import { C, TimeSeriesChart, TransectBars, type TsPoint } from '@/components/charts'
import type { SiteData } from '@/lib/types'

export default function AnalyticsView({ data }: { data: SiteData }) {
  const { timeseries, events, hotspots, scenarios, longTermM, seasonalM, site } = data
  const stormEvents = events.filter(e => e.kind === 'storm')
  const interventionEvents = events.filter(e => e.kind === 'intervention')

  const forecastData = [
    { key: 'doNothing', ...scenarios.doNothing, color: C.erosion },
    { key: 'maintain', ...scenarios.maintain, color: C.accretion },
    { key: 'expand', ...scenarios.expand, color: '#7fd9b4' },
    { key: 'nourish', ...scenarios.nourish, color: C.cyan },
  ]

  return (
    <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: '#fafafa' }}>
      {/* Header */}
      <section style={{ padding: '24px 28px 16px', background: '#fff', borderBottom: '1px solid var(--ca-line)' }}>
        <div className="kicker">analytics</div>
        <h2 style={{ font: '200 26px/1.2 var(--font-sans)', margin: '8px 0 6px' }}>
          drivers · scenarios · interventions
        </h2>
        <div className="eyebrow">diagnostic tools for coastal management decisions.</div>
      </section>

      {/* Transect analysis */}
      <section style={{ padding: '24px 28px', background: '#fff', borderTop: '1px solid var(--ca-line)' }}>
        <div className="card__h" style={{ marginBottom: 16 }}>
          <div>
            <div className="kicker">shoreline change · by segment</div>
            <div className="eyebrow" style={{ marginTop: 4 }}>
              all {data.N} transects · red = erosion · orange = accretion
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--ca-line)', border: '1px solid var(--ca-line)' }}>
          <div style={{ padding: '16px 18px', background: '#fff' }}>
            <div className="kicker" style={{ marginBottom: 8, fontSize: 9 }}>5-year net change · m/transect</div>
            <TransectBars values={longTermM} w={420} h={90} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-muted)', marginTop: 4 }}>
              <span>t0</span><span>t{data.N}</span>
            </div>
          </div>
          <div style={{ padding: '16px 18px', background: '#fff' }}>
            <div className="kicker" style={{ marginBottom: 8, fontSize: 9 }}>seasonal swing · m/transect</div>
            <TransectBars values={seasonalM} w={420} h={90} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-muted)', marginTop: 4 }}>
              <span>t0</span><span>t{data.N}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Storm impact analysis */}
      <section style={{ padding: '24px 28px', background: '#fff', borderTop: '1px solid var(--ca-line)' }}>
        <div className="card__h" style={{ marginBottom: 16 }}>
          <div>
            <div className="kicker">storm impact analysis</div>
            <div className="eyebrow" style={{ marginTop: 4 }}>pre / post comparison per event</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1, background: 'var(--ca-line)', border: '1px solid var(--ca-line)' }}>
          {stormEvents.length === 0 && (
            <div style={{ padding: '20px 18px', background: '#fff', color: 'var(--fg-muted)', font: '300 13px/1 var(--font-sans)' }}>
              no storm events recorded.
            </div>
          )}
          {stormEvents.map(e => {
            const idx = timeseries.findIndex(d => d.date >= e.date)
            const before = idx > 2 ? timeseries[idx - 2].area : null
            const after = idx > 0 && idx < timeseries.length - 1 ? timeseries[Math.min(idx + 3, timeseries.length - 1)].area : null
            const delta = before != null && after != null ? after - before : e.impact ?? null
            return (
              <div key={e.id} style={{ padding: '16px 18px', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, background: C.erosion, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>
                    ⚡
                  </div>
                  <div>
                    <div style={{ font: '500 13px/1.2 var(--font-sans)' }}>{e.title}</div>
                    <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>{e.date}</div>
                  </div>
                </div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>{e.sub}</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>impact</div>
                    <div className="mono" style={{ font: '500 18px/1 var(--font-sans)', color: C.erosion }}>
                      {delta != null ? `${delta > 0 ? '+' : ''}${Math.round(delta).toLocaleString()} m²` : '—'}
                    </div>
                  </div>
                  {e.transect && (
                    <div>
                      <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>transects</div>
                      <div className="mono" style={{ font: '500 18px/1 var(--font-sans)', color: 'var(--fg)' }}>
                        {e.transect[0]}–{e.transect[1]}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Intervention performance */}
      <section style={{ padding: '24px 28px', background: '#fff', borderTop: '1px solid var(--ca-line)' }}>
        <div className="card__h" style={{ marginBottom: 16 }}>
          <div>
            <div className="kicker">intervention performance</div>
            <div className="eyebrow" style={{ marginTop: 4 }}>land still added N months after deployment</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1, background: 'var(--ca-line)', border: '1px solid var(--ca-line)' }}>
          {interventionEvents.length === 0 && (
            <div style={{ padding: '20px 18px', background: '#fff', color: 'var(--fg-muted)', font: '300 13px/1 var(--font-sans)' }}>
              no interventions recorded.
            </div>
          )}
          {interventionEvents.map(e => {
            const idx = timeseries.findIndex(d => d.date >= e.date)
            const gain = timeseries
              .slice(idx, idx + 12)
              .reduce((s, d) => s + (d.intervention ?? 0), 0)
            const maxGain = e.impact ?? 0
            const retentionPct = maxGain > 0 ? Math.min(100, Math.round((gain / maxGain) * 100)) : null
            return (
              <div key={e.id} style={{ padding: '16px 18px', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, background: C.accretion, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>
                    ✦
                  </div>
                  <div>
                    <div style={{ font: '500 13px/1.2 var(--font-sans)' }}>{e.title}</div>
                    <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>{e.date}</div>
                  </div>
                </div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>{e.sub}</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>gain</div>
                    <div className="mono" style={{ font: '500 18px/1 var(--font-sans)', color: '#1f7a5a' }}>
                      {e.impact != null ? `+${e.impact.toLocaleString()} m²` : '—'}
                    </div>
                  </div>
                  {retentionPct != null && (
                    <div>
                      <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>retention</div>
                      <div className="mono" style={{ font: '500 18px/1 var(--font-sans)', color: retentionPct > 60 ? '#1f7a5a' : C.accretion }}>
                        {retentionPct}%
                      </div>
                    </div>
                  )}
                </div>
                {retentionPct != null && (
                  <div style={{ marginTop: 10, height: 4, background: 'rgba(0,0,0,0.06)' }}>
                    <div style={{ height: '100%', width: `${retentionPct}%`, background: '#1f7a5a' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Forecast scenarios */}
      <section style={{ padding: '24px 28px', background: '#fff', borderTop: '1px solid var(--ca-line)' }}>
        <div className="card__h" style={{ marginBottom: 16 }}>
          <div>
            <div className="kicker">forecast scenarios</div>
            <div className="eyebrow" style={{ marginTop: 4 }}>
              projected shoreline area change under different management strategies
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--ca-line)', border: '1px solid var(--ca-line)', marginBottom: 20 }}>
          {forecastData.map(s => (
            <div key={s.key} style={{ padding: '16px 18px', background: '#fff' }}>
              <div className="kicker" style={{ marginBottom: 8 }}>{s.label}</div>
              <div style={{ marginBottom: 8 }}>
                <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>12 months</div>
                <div className="mono" style={{ font: '300 20px/1 var(--font-sans)', color: s.delta12mo < 0 ? C.erosion : '#1f7a5a' }}>
                  {s.delta12mo > 0 ? '+' : ''}{s.delta12mo.toLocaleString()} m²
                </div>
              </div>
              <div>
                <div className="kicker" style={{ fontSize: 9, marginBottom: 4 }}>36 months</div>
                <div className="mono" style={{ font: '300 20px/1 var(--font-sans)', color: s.delta36mo < 0 ? C.erosion : '#1f7a5a' }}>
                  {s.delta36mo > 0 ? '+' : ''}{s.delta36mo.toLocaleString()} m²
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual comparison bar */}
        <div>
          <div className="kicker" style={{ marginBottom: 12, fontSize: 9 }}>36-month comparison</div>
          {forecastData.map(s => {
            const maxAbs = Math.max(...forecastData.map(f => Math.abs(f.delta36mo)))
            const pct = maxAbs > 0 ? Math.abs(s.delta36mo) / maxAbs * 100 : 0
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 160, font: '400 12px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>{s.label}</div>
                <div style={{ flex: 1, height: 14, background: 'rgba(0,0,0,0.05)', position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: s.delta36mo >= 0 ? '50%' : `calc(50% - ${pct / 2}%)`,
                    width: `${pct / 2}%`,
                    height: '100%',
                    background: s.delta36mo < 0 ? C.erosion : s.color,
                    opacity: 0.8,
                  }} />
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.2)' }} />
                </div>
                <div className="mono" style={{ width: 80, font: '400 12px/1 var(--font-sans)', color: s.delta36mo < 0 ? C.erosion : '#1f7a5a', textAlign: 'right' }}>
                  {s.delta36mo > 0 ? '+' : ''}{s.delta36mo.toLocaleString()}
                </div>
              </div>
            )
          })}
          <div style={{ font: '300 italic 11px/1 var(--font-sans)', color: 'var(--fg-muted)', marginTop: 8 }}>
            ⚠ fake data — replace with inferred model forecast when available
          </div>
        </div>
      </section>
    </div>
  )
}
