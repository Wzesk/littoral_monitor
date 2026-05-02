'use client'

import { useState } from 'react'
import { C } from '@/components/charts'
import * as Icons from '@/components/Icons'
import type { SiteData, Observation } from '@/lib/types'

export default function DataView({ data }: { data: SiteData }) {
  const { observations, site } = data
  const [sourceFilter, setSourceFilter] = useState('all')

  const filtered = observations.filter(o => sourceFilter === 'all' || o.source === sourceFilter)
  const sentinel = observations.filter(o => o.source === 'sentinel-2').length
  const planet = observations.filter(o => o.source === 'planetscope').length

  return (
    <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
      {/* Header strip */}
      <section style={{ padding: '20px 28px', borderBottom: '1px solid var(--ca-line)', display: 'flex', alignItems: 'flex-end', gap: 32 }}>
        <div>
          <div className="kicker">data sources</div>
          <div style={{ font: '300 22px/1 var(--font-sans)', marginTop: 8 }}>
            {observations.length} observations · multi-source
          </div>
          <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
            monitoring since {site.monitoringSince}
          </div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--ca-line)' }} />
        {[
          { l: 'sentinel-2', v: sentinel, s: '10 m bands' },
          { l: 'planetscope', v: planet, s: '3 m bands' },
          { l: 'tide model', v: 'fes2022', s: '25 km grid' },
        ].map(s => (
          <div key={s.l}>
            <div className="kicker" style={{ fontSize: 9 }}>{s.l}</div>
            <div style={{ font: '300 22px/1 var(--font-sans)', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{s.s}</div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="select" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
            <option value="all">all sources</option>
            <option value="sentinel-2">sentinel-2</option>
            <option value="planetscope">planetscope</option>
          </select>
          <button className="btn"><Icons.Download size={13} /> csv</button>
        </div>
      </section>

      {/* Table */}
      <div style={{ padding: '0 28px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ca-line)' }}>
              {['date', 'source', 'shoreline · m', 'area · m²', 'tide-corrected', 'cloud %', 'quality'].map(h => (
                <th key={h} style={{
                  padding: '12px 12px', textAlign: ['date', 'source', 'tide-corrected'].includes(h) ? 'left' : 'right',
                  font: '600 10px/1 var(--font-sans)', letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: 'var(--fg-muted)', position: 'sticky', top: 0, background: '#fff',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <ObsRow key={i} o={o} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="dim" style={{ padding: '20px 12px', font: '300 13px/1 var(--font-sans)' }}>
            no observations matching filter.
          </div>
        )}
      </div>
    </div>
  )
}

function ObsRow({ o }: { o: Observation }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--ca-line)' }}>
      <td style={{ padding: '10px 12px', font: '400 13px/1 var(--font-sans)' }}>{o.date}</td>
      <td style={{ padding: '10px 12px' }}>
        <span className="pill pill--ghost" style={{ fontSize: 10 }}>{o.source}</span>
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', font: '400 13px/1 var(--font-sans)' }}>
        {o.lengthM.toLocaleString()}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', font: '400 13px/1 var(--font-sans)' }}>
        {o.areaM2 != null ? o.areaM2.toLocaleString() : '—'}
      </td>
      <td style={{ padding: '10px 12px', font: '400 13px/1 var(--font-sans)' }}>
        {o.tideCorrected
          ? <span style={{ color: '#1f7a5a' }}>✓ corrected</span>
          : <span style={{ color: C.erosion }}>— pending</span>}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
        <span style={{ display: 'inline-block', verticalAlign: 'middle', width: 50, height: 5, background: 'rgba(0,0,0,0.06)', position: 'relative', marginRight: 8 }}>
          <span style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: `${o.cloudPct}%`,
            background: o.cloudPct > 40 ? C.erosion : o.cloudPct > 20 ? C.accretion : '#1f7a5a',
          }} />
        </span>
        <span style={{ font: '400 12px/1 var(--font-sans)' }}>{o.cloudPct}%</span>
      </td>
      <td style={{
        padding: '10px 12px', textAlign: 'right', font: '400 13px/1 var(--font-sans)',
        color: o.quality < 0.7 ? C.erosion : o.quality < 0.85 ? 'var(--fg)' : '#1f7a5a',
      }}>
        {o.quality.toFixed(2)}
      </td>
    </tr>
  )
}
