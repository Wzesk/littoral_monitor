'use client'

import { useState } from 'react'
import { C, TimeSeriesChart, DecompositionStack, SmallMultiples, type TsPoint } from '@/components/charts'
import type { SiteData } from '@/lib/types'

export default function TrendsView({ data, onScrubToDate }: { data: SiteData; onScrubToDate?: (date: string) => void }) {
  const { timeseries, events } = data
  const [mode, setMode] = useState<'merged' | 'decomposed' | 'small-multiples'>('merged')
  const observed = timeseries.filter(d => d.observed)

  return (
    <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: '#fafafa' }}>
      {/* Header */}
      <section style={{ padding: '24px 28px 16px', background: '#fff', borderBottom: '1px solid var(--ca-line)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <div className="kicker">island dynamics over time</div>
            <h2 style={{ font: '200 28px/1.2 var(--font-sans)', margin: '8px 0 6px', textWrap: 'balance' }}>
              what&rsquo;s actually changing — and why?
            </h2>
            <div className="eyebrow" style={{ maxWidth: 560 }}>
              click anywhere on a chart to see the site at that moment in the side panel.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            {(['merged', 'decomposed', 'small-multiples'] as const).map((m, i, arr) => (
              <button key={m} onClick={() => setMode(m)}
                style={{
                  appearance: 'none', cursor: 'pointer', height: 32, padding: '0 14px',
                  border: '1px solid var(--ca-line)',
                  borderRight: i === arr.length - 1 ? '1px solid var(--ca-line)' : 'none',
                  background: mode === m ? '#000' : '#fff',
                  color: mode === m ? '#fff' : 'var(--fg)',
                  font: '400 12px/1 var(--font-sans)', letterSpacing: '0.04em',
                }}>
                {m === 'small-multiples' ? 'by component' : m}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Chart section */}
      <section style={{ padding: '24px 28px', background: '#fff', borderTop: '1px solid var(--ca-line)' }}>
        {mode === 'merged' && (
          <>
            <div className="card__h" style={{ marginBottom: 16 }}>
              <div>
                <div className="kicker">shoreline area · merged signal</div>
                <div className="eyebrow" style={{ marginTop: 4 }}>
                  all drivers combined · solid = observed · dashed = nearcast
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <LegendItem color={C.erosion} label="storm loss" />
                <LegendItem color={C.accretion} label="intervention gain" />
                <LegendItem color={C.present} label="now" dashed />
              </div>
            </div>
            <TimeSeriesChart
              series={timeseries as TsPoint[]}
              w={880}
              h={280}
              showEvents={events.filter(e => ['storm', 'intervention'].includes(e.kind))}
            />
          </>
        )}

        {mode === 'decomposed' && (
          <>
            <div className="card__h" style={{ marginBottom: 16 }}>
              <div>
                <div className="kicker">change decomposition · stacked</div>
                <div className="eyebrow" style={{ marginTop: 4 }}>
                  each bar = one month · colored by signal type
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <LegendItem color={C.ink} label="trend" />
                <LegendItem color={C.cyan} label="seasonal" />
                <LegendItem color={C.erosion} label="storms" />
                <LegendItem color={C.accretion} label="intervention" />
              </div>
            </div>
            <DecompositionStack series={timeseries as TsPoint[]} w={880} h={260} />

            <div style={{ marginTop: 32 }}>
              <div className="kicker" style={{ marginBottom: 8 }}>driver explanation</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--ca-line)', border: '1px solid var(--ca-line)' }}>
                {[
                  { color: C.ink, label: 'trend', desc: 'long-term directional change driven by sediment budget imbalance and sea level' },
                  { color: C.cyan, label: 'seasonal', desc: 'predictable annual oscillation — monsoon swell vs. calm season' },
                  { color: C.erosion, label: 'storm residual', desc: 'episodic loss from named storm events and king tides' },
                  { color: C.accretion, label: 'intervention', desc: 'persistent gain from reef protection, nourishment, or other management action' },
                ].map(d => (
                  <div key={d.label} style={{ padding: '14px 16px', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 12, height: 12, background: d.color, flexShrink: 0 }} />
                      <div className="kicker" style={{ fontSize: 10 }}>{d.label}</div>
                    </div>
                    <div style={{ font: '300 12px/1.5 var(--font-sans)', color: 'var(--fg-muted)' }}>{d.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'small-multiples' && (
          <>
            <div className="card__h" style={{ marginBottom: 16 }}>
              <div>
                <div className="kicker">signal decomposition · by component</div>
                <div className="eyebrow" style={{ marginTop: 4 }}>
                  each panel shows one driver in isolation
                </div>
              </div>
            </div>
            <SmallMultiples series={timeseries as TsPoint[]} w={880} />
          </>
        )}
      </section>

      {/* Summary table */}
      <section style={{ padding: '24px 28px', background: '#fff', borderTop: '1px solid var(--ca-line)' }}>
        <div className="kicker" style={{ marginBottom: 16 }}>signal summary · recent 12 months</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--ca-line)', border: '1px solid var(--ca-line)' }}>
          {(() => {
            const last12 = observed.slice(-12)
            if (!last12.length) return null
            const first = last12[0], last = last12[last12.length - 1]
            const trendDelta = (last.trend ?? 0) - (first.trend ?? 0)
            const seasonalRange = Math.max(...last12.map(d => Math.abs(d.seasonal ?? 0)))
            const stormLoss = last12.reduce((s, d) => s + Math.min(0, d.storms ?? 0), 0)
            const interventionGain = last12.reduce((s, d) => s + Math.max(0, d.intervention ?? 0), 0)
            return [
              { label: 'trend · 12 mo', value: `${trendDelta > 0 ? '+' : ''}${Math.round(trendDelta).toLocaleString()} m²`, color: trendDelta < 0 ? C.erosion : '#1f7a5a' },
              { label: 'seasonal range', value: `±${Math.round(seasonalRange).toLocaleString()} m²`, color: 'var(--fg)' },
              { label: 'storm loss', value: `${Math.round(stormLoss).toLocaleString()} m²`, color: C.erosion },
              { label: 'intervention gain', value: `+${Math.round(interventionGain).toLocaleString()} m²`, color: '#1f7a5a' },
            ].map(s => (
              <div key={s.label} style={{ padding: '16px 18px', background: '#fff' }}>
                <div className="kicker" style={{ marginBottom: 8 }}>{s.label}</div>
                <div className="mono" style={{ font: '300 22px/1 var(--font-sans)', color: s.color }}>{s.value}</div>
              </div>
            ))
          })()}
        </div>
      </section>
    </div>
  )
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
      <span style={{ width: 14, height: 2, background: dashed ? 'transparent' : color, border: dashed ? `1px dashed ${color}` : 'none' }} />
      {label}
    </span>
  )
}
