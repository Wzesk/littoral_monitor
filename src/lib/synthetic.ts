/**
 * Generate synthetic analytics for a site from real BQ shoreline records.
 * All arrays are deterministic given siteId so renders are consistent.
 */

import type {
  SiteData, SiteInfo, TimeSeriesPoint, ShorelineEvent,
  Hotspot, Health, Drift, Observation, Scenario,
} from './types'

const N_TRANSECTS = 256
const FORECAST_MONTHS = 3

function seededRng(seed: number) {
  let x = seed
  return () => { x = (x * 9301 + 49297) % 233280; return x / 233280 }
}

function noise(i: number, freq: number, amp: number, off = 0) {
  return Math.sin(i * freq + off) * amp + Math.sin(i * freq * 2.7 + off * 1.3) * amp * 0.4
}

/** Simplify a polygon ring (lon/lat pairs) to n evenly-spaced points in 0-1000 SVG space */
export function geojsonToShorelinePoints(
  coords: [number, number][],
  n = 30,
  svgSize = 1000,
): [number, number][] {
  if (!coords || coords.length < 3) return defaultShorelinePoints()

  // Close the ring
  const ring = [...coords]
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push(ring[0])
  }

  // Compute cumulative arc lengths
  const cumLen: number[] = [0]
  for (let i = 1; i < ring.length; i++) {
    const dx = ring[i][0] - ring[i - 1][0]
    const dy = ring[i][1] - ring[i - 1][1]
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  const totalLen = cumLen[cumLen.length - 1]

  // Resample to n points
  const pts: [number, number][] = []
  for (let s = 0; s < n; s++) {
    const target = (s / n) * totalLen
    let seg = 0
    while (seg < cumLen.length - 2 && cumLen[seg + 1] < target) seg++
    const t = cumLen[seg + 1] === cumLen[seg] ? 0 : (target - cumLen[seg]) / (cumLen[seg + 1] - cumLen[seg])
    pts.push([ring[seg][0] + t * (ring[seg + 1][0] - ring[seg][0]), ring[seg][1] + t * (ring[seg + 1][1] - ring[seg][1])])
  }
  pts.push(pts[0])

  // Normalize to 0-1000 with padding
  const pad = 100
  const lons = pts.map(p => p[0])
  const lats = pts.map(p => p[1])
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const lonSpan = maxLon - minLon || 0.001
  const latSpan = maxLat - minLat || 0.001

  // Preserve aspect ratio
  const scale = (svgSize - 2 * pad) / Math.max(lonSpan, latSpan)
  const cx = (svgSize - lonSpan * scale) / 2
  const cy = (svgSize - latSpan * scale) / 2

  return pts.map(([lon, lat]) => [
    Math.round(cx + (lon - minLon) * scale),
    Math.round(svgSize - cy - (lat - minLat) * scale), // flip Y
  ])
}

function defaultShorelinePoints(): [number, number][] {
  return [
    [180, 300], [210, 260], [260, 235], [320, 220], [390, 215], [460, 220],
    [520, 235], [580, 260], [630, 295], [670, 335], [700, 380], [720, 430],
    [730, 485], [725, 540], [710, 590], [680, 635], [640, 670], [590, 690],
    [535, 700], [475, 700], [415, 690], [360, 670], [310, 640], [265, 605],
    [230, 565], [205, 520], [190, 470], [185, 415], [180, 360], [180, 300],
  ]
}

interface RawRecord {
  timestamp: string
  shoreline_length_m: number | null
  area_enclosed_m2: number | null
  tide_corrected: boolean
  quality_score: number | null
  geojson_path?: string
}

export function generateSiteData(
  island: {
    id: string
    site_name: string
    periodic: boolean
    aoi_coordinates?: string | null
    start_date?: string | null
    last_run?: string | null
    center?: [number, number] | null
    aoiBounds?: [[number, number], [number, number]] | null
  },
  rawRecords: RawRecord[],
  shorelinePoints: [number, number][],
): SiteData {
  const r = seededRng(island.site_name.split('').reduce((a, c) => a + c.charCodeAt(0), 0))

  const sorted = [...rawRecords].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const N = N_TRANSECTS
  const now = new Date()
  const nowStr = now.toISOString().slice(0, 10)

  // Base area from first-quarter records
  const areas = sorted.filter(x => x.area_enclosed_m2 != null).map(x => x.area_enclosed_m2!)
  const lengths = sorted.filter(x => x.shoreline_length_m != null).map(x => x.shoreline_length_m!)
  const baseArea = areas.length > 0 ? areas.slice(0, Math.max(1, Math.floor(areas.length / 4))).reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(areas.length / 4)) : 142800
  const shorelineM = lengths.length > 0 ? lengths[lengths.length - 1] : 3200
  const MONTHS = 72

  // Per-transect long-term change
  const LONGTERM_M = Array.from({ length: N }, (_, t) => {
    const base = -1.4 * Math.cos((t / N) * Math.PI * 2 - 0.6)
    const n = noise(t, 0.18, 0.6) + (r() - 0.5) * 0.4
    const bump = Math.exp(-Math.pow((t - 80) / 14, 2)) * 6.2 * (r() * 0.5 + 0.75)
    const hotspot = -Math.exp(-Math.pow((t - 200) / 9, 2)) * 5.8 * (r() * 0.3 + 0.85)
    return +(base + n + bump + hotspot).toFixed(2)
  })

  // Per-transect seasonal change
  const SEASONAL_M = Array.from({ length: N }, (_, t) => {
    const monsoon = -0.9 * Math.cos((t / N) * Math.PI * 2 + 0.2)
    const n = noise(t, 0.27, 0.35, 1.7)
    const storm = -Math.exp(-Math.pow((t - 205) / 12, 2)) * 1.8
    return +(monsoon + n + storm).toFixed(2)
  })

  // Build monthly time series
  const TIMESERIES: TimeSeriesPoint[] = []
  for (let i = -MONTHS + 1; i <= FORECAST_MONTHS; i++) {
    const d = new Date(now)
    d.setMonth(d.getMonth() + i)
    const monthIdx = d.getMonth()
    const trend = -baseArea * 0.007 * (-i / 12)
    const seasonal = -baseArea * 0.012 * Math.sin((monthIdx - 4) / 12 * Math.PI * 2)
    const storms = [-26, -13, -5].reduce((s, at) =>
      s + (i === at ? -baseArea * 0.022 : i > at ? -baseArea * 0.022 * Math.exp(-(i - at) / 8) : 0), 0)
    const intervention = i >= -19 ? baseArea * 0.04 * (1 - Math.exp(-(i + 19) / 3.5)) * (1 - Math.max(0, (i + 19) - 9) * 0.012) : 0
    const noiseTerm = (r() - 0.5) * baseArea * 0.006
    const observed = i <= 0
    const area = baseArea + trend + seasonal + storms + intervention + (observed ? noiseTerm : 0)
    TIMESERIES.push({
      date: d.toISOString().slice(0, 10),
      idx: i,
      observed,
      area: Math.round(area),
      forecastLo: !observed ? Math.round(area - baseArea * 0.008 - Math.abs(i) * baseArea * 0.003) : null,
      forecastHi: !observed ? Math.round(area + baseArea * 0.008 + Math.abs(i) * baseArea * 0.003) : null,
      trend: Math.round(baseArea + trend),
      seasonal: Math.round(seasonal),
      storms: Math.round(storms),
      intervention: Math.round(intervention),
    })
  }

  // Events
  const recentArea = areas.length > 4 ? areas.slice(-4) : null
  const EVENTS: ShorelineEvent[] = [
    { id: 'e1', kind: 'storm', date: offsetDate(now, -6), title: 'cyclone event (cat 1)', sub: 'sustained winds 80+ km/h · significant wave energy', impact: -Math.round(baseArea * 0.013), transect: [180, 228], severity: 'high', coord: [700, 460] },
    { id: 'e2', kind: 'alert', date: offsetDate(now, -3), title: 'erosion threshold exceeded', sub: 'northern segment lost significant ground in 30 days', impact: -Math.round(baseArea * 0.007), transect: [195, 215], severity: 'high' },
    { id: 'e3', kind: 'intervention', date: offsetDate(now, -19), title: 'reef protection array deployed', sub: 'self-assembled units · western arc', impact: Math.round(baseArea * 0.04), transect: [60, 100], severity: 'positive', coord: [225, 425] },
    { id: 'e4', kind: 'storm', date: offsetDate(now, -11), title: 'monsoon swell event', sub: 'waves 2+ m · minor sediment redistribution', impact: -Math.round(baseArea * 0.002), transect: [120, 180], severity: 'medium', coord: [420, 690] },
    { id: 'e5', kind: 'intervention', date: offsetDate(now, -2), title: 'beach nourishment — south spit', sub: '1,200 m³ placed · monitoring underway', impact: Math.round(baseArea * 0.008), transect: [140, 170], severity: 'positive', coord: [540, 700] },
    { id: 'e6', kind: 'alert', date: offsetDate(now, -1), title: 'imagery gap', sub: 'cloud cover blocked 2 satellite passes', severity: 'low' },
  ]

  // Hotspots
  const HOTSPOTS: Hotspot[] = [
    { id: 'h1', label: 'segment c · north spit', transect: [195, 215], lengthM: 240, rateMPerYr: +(LONGTERM_M[205] / 5).toFixed(1), sinceM: +(SEASONAL_M[205] * 1.2).toFixed(1), riskScore: 0.92, driver: 'wave exposure · drift loss', priority: 'urgent' },
    { id: 'h2', label: 'segment a · west arc', transect: [6, 40], lengthM: 430, rateMPerYr: +(LONGTERM_M[20] / 5).toFixed(1), sinceM: +(SEASONAL_M[20]).toFixed(1), riskScore: 0.71, driver: 'storm-driven, recovering', priority: 'watch' },
    { id: 'h3', label: 'segment e · east tip', transect: [110, 128], lengthM: 220, rateMPerYr: +(LONGTERM_M[118] / 5).toFixed(1), sinceM: +(SEASONAL_M[118]).toFixed(1), riskScore: 0.58, driver: 'background drift', priority: 'watch' },
    { id: 'h4', label: 'segment b · west intervention', transect: [60, 100], lengthM: 510, rateMPerYr: +(LONGTERM_M[80] / 5).toFixed(1), sinceM: +(SEASONAL_M[80] + 4.2).toFixed(1), riskScore: 0.12, driver: 'intervention performing', priority: 'healthy' },
    { id: 'h5', label: 'segment d · south spit', transect: [140, 170], lengthM: 380, rateMPerYr: +(LONGTERM_M[155] / 5).toFixed(1), sinceM: +(SEASONAL_M[155] + 0.9).toFixed(1), riskScore: 0.28, driver: 'recent nourishment', priority: 'watch' },
  ]

  // Health
  const recentObs = TIMESERIES.filter(d => d.observed).slice(-12)
  const seasonalDelta = recentObs.length > 1 ? recentObs[recentObs.length - 1].area - recentObs[0].area : -Math.round(baseArea * 0.012)
  const seasonalPct = +((seasonalDelta / baseArea) * 100).toFixed(1)
  const urgentCount = HOTSPOTS.filter(h => h.priority === 'urgent').length
  const watchCount = HOTSPOTS.filter(h => h.priority === 'watch').length
  const statusVal: Health['status'] = urgentCount > 0 ? 'monitor' : 'ok'
  const HEALTH: Health = {
    status: statusVal,
    headline: urgentCount > 0
      ? `shoreline under pressure — ${urgentCount} urgent zone${urgentCount > 1 ? 's' : ''} requiring attention.`
      : `shoreline stable — seasonal variability within expected range.`,
    subhead: `${urgentCount} urgent hotspot${urgentCount !== 1 ? 's' : ''} · ${watchCount} watch segment${watchCount !== 1 ? 's' : ''} · 90-day outlook ${seasonalDelta < 0 ? 'trending negative' : 'stable'} without action.`,
    netSeasonM2: seasonalDelta,
    netSeasonPct: seasonalPct,
    forecast90M2: Math.round(seasonalDelta * 1.2),
    forecast90Pct: +((seasonalDelta * 1.2 / baseArea) * 100).toFixed(1),
  }

  // Drift
  const DRIFT: Drift = {
    netDirection: 'NW → SE',
    netRateMPerYr: 1.4,
    sedimentBudgetM3PerYr: -Math.round(shorelineM * 1.4 * 1.2),
    lastUpdated: offsetDate(now, -3),
  }

  // Scenarios
  const annualRate = seasonalDelta * 1.5
  const SCENARIOS: Record<string, Scenario> = {
    doNothing: { label: 'do nothing', delta12mo: Math.round(annualRate * 0.9), delta36mo: Math.round(annualRate * 3.1) },
    maintain: { label: 'maintain intervention', delta12mo: Math.round(annualRate * 0.2), delta36mo: Math.round(annualRate * 0.7) },
    expand: { label: 'expand intervention +30%', delta12mo: Math.round(annualRate * -0.4), delta36mo: Math.round(annualRate * -1.2) },
    nourish: { label: 'one-time nourishment', delta12mo: Math.round(baseArea * 0.016), delta36mo: Math.round(annualRate * 0.5) },
  }

  // Observations from real records — source derived from GeoJSON filename T-code (Sentinel-2 tile pattern)
  function deriveSource(rec: RawRecord): string {
    const path = rec.geojson_path ?? ''
    return /T\d{2}[A-Z]{3}/.test(path) ? 'sentinel-2' : 'planetscope'
  }
  const OBSERVATIONS: Observation[] = sorted.slice(-60).reverse().map((rec, i) => ({
    date: rec.timestamp.slice(0, 10),
    source: deriveSource(rec),
    lengthM: Math.round(rec.shoreline_length_m ?? shorelineM + (r() - 0.5) * 20),
    areaM2: rec.area_enclosed_m2 ?? null,
    tideCorrected: rec.tide_corrected ?? true,
    cloudPct: Math.max(0, Math.min(100, Math.round(noise(i, 0.7, 30) + 15 + (r() - 0.5) * 20))),
    quality: +(rec.quality_score ?? (0.78 + noise(i, 0.5, 0.13) + (r() - 0.5) * 0.05)).toFixed(2),
    geojsonPath: rec.geojson_path,
  }))

  // Site info
  const startDate = island.start_date ? island.start_date.slice(0, 7) : (sorted[0]?.timestamp.slice(0, 7) ?? '2018-01')
  // Coords string from center if available
  const center = island.center ?? null
  const coordsStr = center ? `${center[0].toFixed(4)}°, ${center[1].toFixed(4)}°` : ''

  const SITE: SiteInfo = {
    id: island.id,
    site_name: island.site_name,
    location: 'monitoring site',
    coords: coordsStr,
    shorelineM: Math.round(shorelineM),
    transects: N,
    aoiHa: +(baseArea / 10000).toFixed(1),
    monitoringSince: startDate,
    periodic: island.periodic ?? false,
    operator: 'coastal assembly',
    center,
    aoiBounds: island.aoiBounds ?? null,
  }

  return {
    site: SITE,
    health: HEALTH,
    drift: DRIFT,
    events: EVENTS,
    hotspots: HOTSPOTS,
    timeseries: TIMESERIES,
    longTermM: LONGTERM_M,
    seasonalM: SEASONAL_M,
    observations: OBSERVATIONS,
    scenarios: SCENARIOS,
    shorelinePoints,
    N,
    now: nowStr,
    MONTHS,
    FORECAST_MONTHS,
    SHORELINE_LENGTH_M: Math.round(shorelineM),
  }
}

function offsetDate(base: Date, monthOffset: number): string {
  const d = new Date(base)
  d.setMonth(d.getMonth() + monthOffset)
  return d.toISOString().slice(0, 10)
}

/** Per-transect time series for drawer use */
export function timeSeriesAt(siteData: SiteData, t: number): { date: string; idx: number; observed: boolean; position: number }[] {
  const r = seededRng(t * 137)
  const { MONTHS, FORECAST_MONTHS, longTermM, seasonalM, now } = siteData
  const base = new Date(now)
  const arr = []
  for (let i = -MONTHS + 1; i <= FORECAST_MONTHS; i++) {
    const d = new Date(base)
    d.setMonth(d.getMonth() + i)
    const month = d.getMonth()
    const seasonal = 0.55 * Math.sin((month - 4) / 12 * Math.PI * 2)
    const trend = (longTermM[t] / 60) * (-i)
    const storms = -Math.exp(-Math.pow((i + 5) / 2.5, 2)) * 0.8 - Math.exp(-Math.pow((i + 13) / 2.5, 2)) * 0.5
    const obs = i <= 0
    const v = -trend + seasonal + (obs ? storms : storms * 0.3) + (r() - 0.5) * 0.18
    arr.push({ date: d.toISOString().slice(0, 10), idx: i, observed: obs, position: +v.toFixed(2) })
  }
  return arr
}
