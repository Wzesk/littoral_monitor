import { NextRequest, NextResponse } from 'next/server'
import { getBigQueryClient, serializeBQRow } from '@/lib/bigquery'
import { generateSiteData, geojsonToShorelinePoints } from '@/lib/synthetic'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function fetchGeoJsonCoords(gcsPath: string): Promise<[number, number][] | null> {
  try {
    let url = gcsPath
    // Normalise gs:// to https://
    if (url.startsWith('gs://')) {
      url = 'https://storage.googleapis.com/' + url.slice(5)
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const geojson = await res.json()
    const features = geojson.features ?? [geojson]
    const geom = features[0]?.geometry ?? features[0]
    let coords = geom?.coordinates
    if (!coords) return null
    if (Array.isArray(coords[0]?.[0])) coords = coords[0] // exterior ring
    return coords.map((c: number[]) => [c[0], c[1]] as [number, number])
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params

  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 })
  }

  try {
    const bq = getBigQueryClient()

    const [[islandRows], [recordRows]] = await Promise.all([
      bq.query({
        query: `
          SELECT id, site_name, periodic, aoi_coordinates, start_date, last_run
          FROM \`useful-theory-442820-q8.shoreline_metadata.islands\`
          WHERE site_name = @siteId
          LIMIT 1
        `,
        params: { siteId },
      }),
      bq.query({
        query: `
          SELECT timestamp, shoreline_length_m, area_enclosed_m2, tide_corrected,
                 quality_score, geojson_path
          FROM \`useful-theory-442820-q8.shoreline_metadata.shoreline_data\`
          WHERE site_id = @siteId
          ORDER BY timestamp
        `,
        params: { siteId },
      }),
    ])

    if (!islandRows.length) {
      return NextResponse.json({ error: `Site '${siteId}' not found` }, { status: 404 })
    }

    const island = serializeBQRow(islandRows[0] as Record<string, unknown>)
    const records = (recordRows as Record<string, unknown>[]).map(r => serializeBQRow(r))

    // Try to get shoreline points and actual coords from the most recent geojson
    let shorelinePoints: [number, number][] | null = null
    let geoCenter: [number, number] | null = null
    let geoBounds: [[number, number], [number, number]] | null = null

    const withPath = [...records].reverse().find(r => r.geojson_path)
    if (withPath?.geojson_path) {
      const coords = await fetchGeoJsonCoords(String(withPath.geojson_path))
      if (coords && coords.length > 2) {
        shorelinePoints = geojsonToShorelinePoints(coords, 30)
        // Derive center + bounds from actual GeoJSON coords (most reliable)
        const lons = coords.map(p => p[0])
        const lats = coords.map(p => p[1])
        const minLon = Math.min(...lons), maxLon = Math.max(...lons)
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        geoCenter = [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
        geoBounds = [[minLon, minLat], [maxLon, maxLat]]
      }
    }

    // Fallback: derive shorelinePoints from aoi_coordinates
    if (!shorelinePoints && island.aoi_coordinates) {
      try {
        const aoi = typeof island.aoi_coordinates === 'string'
          ? JSON.parse(island.aoi_coordinates)
          : island.aoi_coordinates
        if (Array.isArray(aoi) && aoi.length > 2) {
          shorelinePoints = geojsonToShorelinePoints(aoi, 30)
        }
      } catch { /* use default */ }
    }

    // Center + bounds: prefer GeoJSON-derived (accurate), fall back to aoi_coordinates
    let center: [number, number] | null = geoCenter
    let aoiBounds: [[number, number], [number, number]] | null = geoBounds
    if (!center && island.aoi_coordinates) {
      try {
        const aoi: [number, number][] = typeof island.aoi_coordinates === 'string'
          ? JSON.parse(island.aoi_coordinates)
          : island.aoi_coordinates
        if (Array.isArray(aoi) && aoi.length >= 2) {
          const lons = aoi.map(p => p[0])
          const lats = aoi.map(p => p[1])
          const minLon = Math.min(...lons), maxLon = Math.max(...lons)
          const minLat = Math.min(...lats), maxLat = Math.max(...lats)
          center = [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
          aoiBounds = [[minLon, minLat], [maxLon, maxLat]]
        }
      } catch { /* leave null */ }
    }

    const typedIsland = {
      id: String(island.id ?? island.site_name),
      site_name: String(island.site_name),
      periodic: Boolean(island.periodic),
      aoi_coordinates: island.aoi_coordinates as string | null,
      start_date: island.start_date as string | null,
      last_run: island.last_run as string | null,
      center,
      aoiBounds,
    }

    const typedRecords = records.map(r => ({
      timestamp: String(r.timestamp ?? ''),
      shoreline_length_m: r.shoreline_length_m != null ? Number(r.shoreline_length_m) : null,
      area_enclosed_m2: r.area_enclosed_m2 != null ? Number(r.area_enclosed_m2) : null,
      tide_corrected: Boolean(r.tide_corrected),
      quality_score: r.quality_score != null ? Number(r.quality_score) : null,
      geojson_path: r.geojson_path as string | undefined,
    }))

    const siteData = generateSiteData(typedIsland, typedRecords, shorelinePoints ?? [])

    return NextResponse.json(siteData)
  } catch (error) {
    console.error(`[/api/site/${siteId}]`, error)
    return NextResponse.json({ error: 'Failed to load site data' }, { status: 500 })
  }
}
