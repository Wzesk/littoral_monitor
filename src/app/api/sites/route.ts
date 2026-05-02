import { NextResponse } from 'next/server'
import { getBigQueryClient, serializeBQRow } from '@/lib/bigquery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const bq = getBigQueryClient()
    const [rows] = await bq.query({
      query: `
        SELECT
          i.id,
          i.site_name,
          i.periodic,
          i.last_run,
          i.aoi_coordinates,
          COUNT(s.site_id) as shoreline_count
        FROM \`useful-theory-442820-q8.shoreline_metadata.islands\` i
        LEFT JOIN \`useful-theory-442820-q8.shoreline_metadata.shoreline_data\` s
          ON s.site_id = i.site_name
        GROUP BY i.id, i.site_name, i.periodic, i.last_run, i.aoi_coordinates
        ORDER BY i.site_name
      `,
    })

    const sites = (rows as Record<string, unknown>[]).map(row => {
      const s = serializeBQRow(row)
      let aoi: [number, number][] | null = null
      if (s.aoi_coordinates) {
        try {
          const parsed = typeof s.aoi_coordinates === 'string'
            ? JSON.parse(s.aoi_coordinates)
            : s.aoi_coordinates
          if (Array.isArray(parsed)) {
            aoi = parsed.map((c: number[]) => [c[0], c[1]] as [number, number])
          }
        } catch { /* ignore */ }
      }
      return {
        id: s.id ?? s.site_name,
        site_name: s.site_name,
        periodic: Boolean(s.periodic),
        lastRun: s.last_run ?? null,
        shorelineCount: Number(s.shoreline_count ?? 0),
        aoiCoordinates: aoi,
      }
    })

    return NextResponse.json(sites)
  } catch (error) {
    console.error('[/api/sites]', error)
    return NextResponse.json({ error: 'Failed to load sites' }, { status: 500 })
  }
}
