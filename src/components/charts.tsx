'use client'

// Design system color tokens (duplicated here for use in SVG)
export const C = {
  ink: '#1a1a1a',
  inkSoft: '#5a5a5a',
  inkMute: '#8a8a8a',
  line: 'rgba(0,0,0,0.10)',
  lineStrong: 'rgba(0,0,0,0.18)',
  erosion: '#ff3b46',
  accretion: '#ffb547',
  cyan: '#19d4e6',
  present: '#ff8a3d',
  teal: '#0e5361',
  ok: '#7fd9b4',
}

// Sparkline
export function Sparkline({ data, w = 120, h = 32, stroke = C.ink, fill = null as string | null, dotLast = false, baseline = false }: {
  data: number[]; w?: number; h?: number; stroke?: string; fill?: string | null; dotLast?: boolean; baseline?: boolean
}) {
  if (!data || data.length === 0) return null
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / span) * (h - 2) - 1,
  ])
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = path + ` L ${w} ${h} L 0 ${h} Z`
  const zeroY = h - ((0 - min) / span) * (h - 2) - 1
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {baseline && min < 0 && max > 0 && (
        <line x1="0" x2={w} y1={zeroY} y2={zeroY} stroke={C.line} strokeDasharray="2 2" />
      )}
      {fill && <path d={area} fill={fill} opacity="0.18" />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" />
      {dotLast && (
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={stroke} />
      )}
    </svg>
  )
}

// Full time series chart with forecast band
export interface TsPoint {
  date: string
  idx: number
  observed: boolean
  area: number
  forecastLo: number | null
  forecastHi: number | null
  trend: number
  seasonal: number
  storms: number
  intervention: number
}

export function TimeSeriesChart({ series, w = 560, h = 200, showEvents = null as Array<{ date: string; kind: string }> | null, showForecast = true }: {
  series: TsPoint[]; w?: number; h?: number; showEvents?: Array<{ date: string; kind: string }> | null; showForecast?: boolean
}) {
  if (!series.length) return null
  const m = { l: 48, r: 14, t: 12, b: 24 }
  const cw = w - m.l - m.r, ch = h - m.t - m.b
  const xs = series.map((_, i) => m.l + (i / (series.length - 1)) * cw)
  const all = series.flatMap(d => [d.area, d.forecastLo, d.forecastHi].filter((v): v is number => v != null))
  const yMin = Math.min(...all), yMax = Math.max(...all)
  const ySpan = yMax - yMin || 1
  const y = (v: number) => m.t + ch - ((v - yMin) / ySpan) * ch
  const observed = series.filter(d => d.observed)
  const forecast = series.filter(d => !d.observed)
  const forecastStart = observed.length - 1

  const obsPath = observed.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${y(d.area)}`).join(' ')
  const fcPath = forecast.length
    ? `M ${xs[forecastStart]} ${y(observed[observed.length - 1].area)} ` +
      forecast.map((d, i) => `L ${xs[forecastStart + 1 + i]} ${y(d.area)}`).join(' ')
    : ''
  const bandPath = forecast.length
    ? `M ${xs[forecastStart]} ${y(observed[observed.length - 1].area)} ` +
      forecast.map((d, i) => `L ${xs[forecastStart + 1 + i]} ${y(d.forecastHi ?? d.area)}`).join(' ') +
      ' ' + forecast.map((d, i) => `L ${xs[forecastStart + forecast.length - i]} ${y(forecast[forecast.length - 1 - i].forecastLo ?? forecast[forecast.length - 1 - i].area)}`).join(' ') +
      ` L ${xs[forecastStart]} ${y(observed[observed.length - 1].area)} Z`
    : ''

  const yTicks = [0, 1, 2, 3, 4].map(i => yMin + (ySpan * i) / 4)
  const xTicks: number[] = []
  for (let i = 0; i < series.length; i += 12) xTicks.push(i)

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={m.l} x2={m.l + cw} y1={y(v)} y2={y(v)} stroke={C.line} />
          <text x={m.l - 6} y={y(v) + 3} fontSize="9" fill={C.inkMute} textAnchor="end" fontFamily="Barlow">
            {Math.round(v / 1000)}k
          </text>
        </g>
      ))}
      {xTicks.map(i => (
        <text key={i} x={xs[i]} y={h - 4} fontSize="9" fill={C.inkMute} textAnchor="middle" fontFamily="Barlow">
          {series[i].date.slice(0, 7)}
        </text>
      ))}
      {showEvents && showEvents.map((e, i) => {
        const idx = series.findIndex(d => d.date >= e.date)
        if (idx < 0) return null
        const cx = xs[idx]
        const color = e.kind === 'intervention' ? C.accretion : e.kind === 'storm' ? C.erosion : C.inkSoft
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={m.t} y2={m.t + ch} stroke={color} strokeDasharray="2 3" opacity="0.55" />
            <circle cx={cx} cy={m.t} r="3" fill={color} />
          </g>
        )
      })}
      {bandPath && <path d={bandPath} fill={C.ink} opacity="0.07" />}
      <line x1={xs[forecastStart]} x2={xs[forecastStart]} y1={m.t} y2={m.t + ch}
        stroke={C.present} strokeDasharray="3 3" opacity="0.7" />
      <text x={xs[forecastStart] + 4} y={m.t + 10} fontSize="9" fill={C.present} fontFamily="Barlow"
        fontWeight="500" letterSpacing="0.06em">NOW</text>
      <path d={obsPath} fill="none" stroke={C.ink} strokeWidth="1.5" />
      {showForecast && fcPath && <path d={fcPath} fill="none" stroke={C.ink} strokeWidth="1.25" strokeDasharray="3 3" />}
    </svg>
  )
}

// Transect mini chart (drawer)
export interface TransectPoint { date: string; idx: number; observed: boolean; position: number }

export function TransectTimeSeries({ series, w = 420, h = 140, events = [] as Array<{ date: string; kind: string }> }: {
  series: TransectPoint[]; w?: number; h?: number; events?: Array<{ date: string; kind: string }>
}) {
  const m = { l: 36, r: 12, t: 10, b: 20 }
  const cw = w - m.l - m.r, ch = h - m.t - m.b
  const xs = series.map((_, i) => m.l + (i / (series.length - 1)) * cw)
  const vs = series.map(d => d.position)
  const yMin = Math.min(...vs) - 0.5, yMax = Math.max(...vs) + 0.5
  const ySpan = yMax - yMin
  const y = (v: number) => m.t + ch - ((v - yMin) / ySpan) * ch
  const obs = series.filter(d => d.observed)
  const fc = series.filter(d => !d.observed)
  const fcStart = obs.length - 1
  const obsPath = obs.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${y(d.position)}`).join(' ')
  const fcPath = fc.length
    ? `M ${xs[fcStart]} ${y(obs[obs.length - 1].position)} ` +
      fc.map((d, i) => `L ${xs[fcStart + 1 + i]} ${y(d.position)}`).join(' ')
    : ''
  const zeroY = y(0)

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <line x1={m.l} x2={m.l + cw} y1={zeroY} y2={zeroY} stroke={C.line} strokeDasharray="2 3" />
      <text x={m.l - 6} y={zeroY + 3} fontSize="9" fill={C.inkMute} textAnchor="end" fontFamily="Barlow">0</text>
      <text x={m.l - 6} y={y(yMax) + 3} fontSize="9" fill={C.inkMute} textAnchor="end" fontFamily="Barlow">+{yMax.toFixed(1)}m</text>
      <text x={m.l - 6} y={y(yMin) + 3} fontSize="9" fill={C.inkMute} textAnchor="end" fontFamily="Barlow">{yMin.toFixed(1)}m</text>
      {events.map((e, i) => {
        const idx = series.findIndex(d => d.date >= e.date)
        if (idx < 0) return null
        const cx = xs[idx]
        const color = e.kind === 'intervention' ? C.accretion : C.erosion
        return <line key={i} x1={cx} x2={cx} y1={m.t} y2={m.t + ch} stroke={color} strokeDasharray="2 3" opacity="0.6" />
      })}
      <line x1={xs[fcStart]} x2={xs[fcStart]} y1={m.t} y2={m.t + ch} stroke={C.present} strokeDasharray="3 3" opacity="0.7" />
      <path d={obsPath} fill="none" stroke={C.ink} strokeWidth="1.5" />
      {fcPath && <path d={fcPath} fill="none" stroke={C.ink} strokeWidth="1.25" strokeDasharray="3 3" />}
    </svg>
  )
}

// Transect bars (erosion/accretion across shoreline)
export function TransectBars({ values, w, h = 80 }: { values: number[]; w: number; h?: number }) {
  const max = Math.max(...values.map(Math.abs), 0.001)
  const bw = w / values.length
  const mid = h / 2
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <line x1="0" x2={w} y1={mid} y2={mid} stroke={C.line} />
      {values.map((v, i) => {
        const bar = (Math.abs(v) / max) * (h / 2 - 2)
        const color = v >= 0 ? C.accretion : C.erosion
        const rectY = v >= 0 ? mid - bar : mid
        return <rect key={i} x={i * bw + 0.5} y={rectY} width={Math.max(0.5, bw - 0.6)} height={Math.max(0.5, bar)} fill={color} opacity="0.85" />
      })}
    </svg>
  )
}

// Decomposition stacked bars
export function DecompositionStack({ series, w = 560, h = 180 }: { series: TsPoint[]; w?: number; h?: number }) {
  const m = { l: 42, r: 14, t: 8, b: 24 }
  const cw = w - m.l - m.r, ch = h - m.t - m.b
  const N = series.length
  const bw = cw / N
  const components: Array<keyof TsPoint> = ['trend', 'seasonal', 'storms', 'intervention']
  const colors: Record<string, string> = { trend: C.ink, seasonal: C.cyan, storms: C.erosion, intervention: C.accretion }

  let yMin = 0, yMax = 0
  series.forEach(d => {
    let pos = 0, neg = 0
    components.forEach(k => { const v = (d[k] as number) || 0; if (v > 0) pos += v; else neg += v })
    if (pos > yMax) yMax = pos
    if (neg < yMin) yMin = neg
  })
  const ySpan = yMax - yMin || 1
  const y = (v: number) => m.t + ch - ((v - yMin) / ySpan) * ch

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <line x1={m.l} x2={m.l + cw} y1={y(0)} y2={y(0)} stroke={C.line} />
      {[yMin, 0, yMax].filter(v => v !== 0).map((v, i) => (
        <text key={i} x={m.l - 6} y={y(v) + 3} fontSize="9" fill={C.inkMute} textAnchor="end" fontFamily="Barlow">
          {(v / 1000).toFixed(0)}k
        </text>
      ))}
      {series.map((d, i) => {
        const x0 = m.l + i * bw
        let posTop = 0, negTop = 0
        return (
          <g key={i}>
            {components.map(k => {
              const v = (d[k] as number) || 0
              if (v === 0) return null
              if (v > 0) {
                const yTop = y(posTop + v), yBase = y(posTop)
                posTop += v
                return <rect key={String(k)} x={x0 + 0.4} y={yTop} width={Math.max(0.5, bw - 0.8)} height={Math.max(0.5, yBase - yTop)} fill={colors[String(k)]} opacity="0.85" />
              } else {
                const yTop = y(negTop), yBase = y(negTop + v)
                negTop += v
                return <rect key={String(k)} x={x0 + 0.4} y={yTop} width={Math.max(0.5, bw - 0.8)} height={Math.max(0.5, yBase - yTop)} fill={colors[String(k)]} opacity="0.85" />
              }
            })}
          </g>
        )
      })}
      {[0, Math.floor(N / 4), Math.floor(N / 2), Math.floor(3 * N / 4), N - 1].map(i => (
        <text key={i} x={m.l + i * bw} y={h - 4} fontSize="9" fill={C.inkMute} textAnchor="middle" fontFamily="Barlow">
          {series[i]?.date.slice(0, 7)}
        </text>
      ))}
    </svg>
  )
}

// Decomposition small-multiples: separate stacked area charts per component
export function SmallMultiples({ series, w = 560 }: { series: TsPoint[]; w?: number }) {
  const components: Array<{ key: keyof TsPoint; label: string; color: string }> = [
    { key: 'trend', label: 'long-term trend', color: C.ink },
    { key: 'seasonal', label: 'seasonal oscillation', color: C.cyan },
    { key: 'storms', label: 'storm / event residual', color: C.erosion },
    { key: 'intervention', label: 'intervention effect', color: C.accretion },
  ]
  const h = 80
  const m = { l: 42, r: 14, t: 6, b: 18 }
  const cw = w - m.l - m.r

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {components.map(({ key, label, color }) => {
        const vals = series.map(d => (d[key] as number) || 0)
        const min = Math.min(...vals), max = Math.max(...vals)
        const span = max - min || 1
        const xs = vals.map((_, i) => m.l + (i / (vals.length - 1)) * cw)
        const y = (v: number) => m.t + (h - m.t - m.b) - ((v - min) / span) * (h - m.t - m.b)
        const path = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${y(v)}`).join(' ')
        const area = path + ` L ${xs[xs.length - 1]} ${h - m.b} L ${xs[0]} ${h - m.b} Z`
        const zeroY = y(0)
        const fcStart = series.findIndex(d => !d.observed)

        return (
          <div key={String(key)}>
            <div className="kicker" style={{ fontSize: 9, marginBottom: 2 }}>{label}</div>
            <svg width={w} height={h} style={{ display: 'block' }}>
              {min < 0 && max > 0 && <line x1={m.l} x2={m.l + cw} y1={zeroY} y2={zeroY} stroke={C.line} strokeDasharray="2 3" />}
              <path d={area} fill={color} opacity="0.12" />
              <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
              {fcStart > 0 && <line x1={xs[fcStart]} x2={xs[fcStart]} y1={m.t} y2={h - m.b} stroke={C.present} strokeDasharray="3 3" opacity="0.6" />}
              <text x={m.l - 6} y={y(max) + 3} fontSize="8" fill={C.inkMute} textAnchor="end" fontFamily="Barlow">
                {max > 0 ? '+' : ''}{(max / 1000).toFixed(1)}k
              </text>
              <text x={m.l - 6} y={y(min) + 3} fontSize="8" fill={C.inkMute} textAnchor="end" fontFamily="Barlow">
                {(min / 1000).toFixed(1)}k
              </text>
            </svg>
          </div>
        )
      })}
    </div>
  )
}
