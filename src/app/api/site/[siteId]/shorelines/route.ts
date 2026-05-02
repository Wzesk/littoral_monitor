import { NextRequest, NextResponse } from 'next/server'
import { getBigQueryClient, serializeBQRow } from '@/lib/bigquery'
import type { ShorelineRecord } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params
  try {
    const bq = getBigQueryClient()
    const [rows] = await bq.query({
      query: `
        SELECT timestamp, geojson_path, shoreline_length_m, tide_corrected
        FROM \`useful-theory-442820-q8.shoreline_metadata.shoreline_data\`
        WHERE site_id = @siteId AND geojson_path IS NOT NULL
        ORDER BY timestamp
      `,
      params: { siteId },
    })

    const records: ShorelineRecord[] = (rows as Record<string, unknown>[])
      .map(r => serializeBQRow(r))
      .map(r => ({
        date: String(r.timestamp ?? '').slice(0, 10),
        geojsonPath: String(r.geojson_path),
        lengthM: r.shoreline_length_m != null ? Number(r.shoreline_length_m) : 0,
        tideCorrected: Boolean(r.tide_corrected),
      }))

    return NextResponse.json(records, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err) {
    console.error(`[/api/site/${siteId}/shorelines]`, err)
    return NextResponse.json({ error: 'Failed to load shorelines' }, { status: 500 })
  }
}
