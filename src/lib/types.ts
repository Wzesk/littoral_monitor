export interface SiteListItem {
  id: string
  site_name: string
  periodic: boolean
  shorelineCount: number
  lastRun: string | null
  aoiCoordinates: [number, number][] | null
}

export interface SiteInfo {
  id: string
  site_name: string
  location: string
  coords: string
  shorelineM: number
  transects: number
  aoiHa: number
  monitoringSince: string
  periodic: boolean
  operator: string
  center: [number, number] | null       // [lat, lon]
  aoiBounds: [[number, number], [number, number]] | null  // [[lon_min, lat_min], [lon_max, lat_max]]
}

/** Lightweight shoreline record for map rendering */
export interface ShorelineRecord {
  date: string
  geojsonPath: string
  lengthM: number
  tideCorrected: boolean
}

export interface TimeSeriesPoint {
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

export interface ShorelineEvent {
  id: string
  kind: 'storm' | 'intervention' | 'alert'
  date: string
  title: string
  sub: string
  impact?: number
  transect?: [number, number]
  severity: 'high' | 'medium' | 'low' | 'positive'
  coord?: [number, number]
}

export interface Hotspot {
  id: string
  label: string
  transect: [number, number]
  lengthM: number
  rateMPerYr: number
  sinceM: number
  riskScore: number
  driver: string
  priority: 'urgent' | 'watch' | 'healthy'
}

export interface Health {
  status: 'ok' | 'monitor' | 'act'
  headline: string
  subhead: string
  netSeasonM2: number
  netSeasonPct: number
  forecast90M2: number
  forecast90Pct: number
}

export interface Drift {
  netDirection: string
  netRateMPerYr: number
  sedimentBudgetM3PerYr: number
  lastUpdated: string
}

export interface Scenario {
  label: string
  delta12mo: number
  delta36mo: number
}

export interface Observation {
  date: string
  source: string
  lengthM: number
  areaM2: number | null
  tideCorrected: boolean
  cloudPct: number
  quality: number
  geojsonPath?: string
}

export interface SiteData {
  site: SiteInfo
  health: Health
  drift: Drift
  events: ShorelineEvent[]
  hotspots: Hotspot[]
  timeseries: TimeSeriesPoint[]
  longTermM: number[]
  seasonalM: number[]
  observations: Observation[]
  scenarios: Record<string, Scenario>
  shorelinePoints: [number, number][]
  N: number
  now: string
  MONTHS: number
  FORECAST_MONTHS: number
  SHORELINE_LENGTH_M: number
}
