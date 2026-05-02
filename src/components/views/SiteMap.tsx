'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Rectangle, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { Layer, PathOptions } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SiteData, ShorelineRecord } from '@/lib/types'
import { C } from '@/components/charts'

// Viridis palette: oldest (purple) → newest (yellow-green)
function viridisHex(t: number): string {
  const stops: [number, number, number][] = [
    [68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37],
  ]
  const s = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const i = Math.min(Math.floor(s), stops.length - 2)
  const f = s - i
  const [r1, g1, b1] = stops[i]
  const [r2, g2, b2] = stops[i + 1]
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${hex(r1 + f * (r2 - r1))}${hex(g1 + f * (g2 - g1))}${hex(b1 + f * (b2 - b1))}`
}

function FitBounds({ center, bounds }: {
  center: [number, number]
  bounds: [[number, number], [number, number]] | null
}) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current) return
    fitted.current = true
    if (bounds) {
      // bounds are [lon, lat] pairs — Leaflet needs [lat, lon]
      map.fitBounds(
        [[bounds[0][1], bounds[0][0]], [bounds[1][1], bounds[1][0]]],
        { padding: [40, 40] }
      )
    } else {
      map.setView(center, 17)
    }
  }, [map, center, bounds])
  return null
}

function ShorelineLayer({ rec, color, weight, onSelect }: {
  rec: ShorelineRecord
  color: string
  weight: number
  onSelect: (rec: ShorelineRecord) => void
}) {
  const [geojson, setGeojson] = useState<object | null>(null)

  useEffect(() => {
    const url = rec.geojsonPath
    fetch(url, { mode: 'cors' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => fetch(`/api/geojson?url=${encodeURIComponent(url)}`).then(r => r.json()))
      .then(setGeojson)
      .catch(() => {})
  }, [rec.geojsonPath])

  if (!geojson) return null

  const style: PathOptions = { color, weight, opacity: weight > 2 ? 1 : 0.75 }

  return (
    <GeoJSON
      key={rec.geojsonPath}
      data={geojson as GeoJSON.GeoJsonObject}
      style={() => style}
      onEachFeature={(_feature, layer: Layer) => {
        layer.on('click', () => onSelect(rec))
      }}
    />
  )
}

interface Props {
  data: SiteData
  shorelines: ShorelineRecord[]
  overlays: Record<string, boolean>
  onSelectShoreline: (rec: ShorelineRecord | null) => void
}

export default function SiteMap({ data, shorelines, overlays, onSelectShoreline }: Props) {
  const { site, hotspots } = data
  const center: [number, number] = site.center ?? [0, 0]
  const aoiBounds = site.aoiBounds

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const tileUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

  // Sample up to 40 evenly distributed shorelines + always include most recent
  const sampled = (() => {
    const withPath = shorelines.filter(r => r.geojsonPath)
    if (withPath.length <= 40) return withPath
    const step = Math.floor(withPath.length / 39)
    const result = withPath.filter((_, i) => i % step === 0).slice(0, 39)
    const latest = withPath[withPath.length - 1]
    if (!result.includes(latest)) result.push(latest)
    return result
  })()

  const n = sampled.length

  const leafletAoiBounds = aoiBounds
    ? [[aoiBounds[0][1], aoiBounds[0][0]], [aoiBounds[1][1], aoiBounds[1][0]]] as [[number, number], [number, number]]
    : null

  return (
    <MapContainer
      center={center}
      zoom={17}
      style={{ width: '100%', height: '100%' }}
      zoomControl
    >
      <TileLayer
        url={tileUrl}
        tileSize={mapboxToken ? 512 : 256}
        zoomOffset={mapboxToken ? -1 : 0}
        maxZoom={22}
        attribution='© Mapbox © OpenStreetMap'
      />

      <FitBounds center={center} bounds={aoiBounds} />

      {/* AOI bounding box */}
      {leafletAoiBounds && (
        <Rectangle
          bounds={leafletAoiBounds}
          pathOptions={{ color: 'rgba(255,255,255,0.6)', weight: 1, fillOpacity: 0, dashArray: '4 6' }}
        />
      )}

      {/* Shoreline history — colored oldest→newest via viridis */}
      {overlays.trends && sampled.map((rec, i) => {
        const isLatest = i === n - 1
        return (
          <ShorelineLayer
            key={rec.geojsonPath}
            rec={rec}
            color={isLatest ? '#ffffff' : viridisHex(i / Math.max(n - 2, 1))}
            weight={isLatest ? 3 : 1.5}
            onSelect={onSelectShoreline}
          />
        )
      })}

      {/* Hotspot markers — urgent only */}
      {overlays.hotspots && hotspots.filter(h => h.priority === 'urgent').map(h => (
        <CircleMarker
          key={h.id}
          center={center}
          radius={10}
          pathOptions={{ color: C.erosion, fillColor: C.erosion, fillOpacity: 0.3, weight: 2 }}
        >
          <Popup>
            <strong>{h.label}</strong><br />
            {h.rateMPerYr > 0 ? '+' : ''}{h.rateMPerYr} m/yr · {h.driver}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
