import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { messages, siteContext } = await req.json()

    const systemPrompt = `You are a shoreline analyst agent grounded in the monitoring data for ${siteContext?.siteName ?? 'this coastal site'}.

Site context:
${siteContext ? `- Site: ${siteContext.siteName} (${siteContext.location})
- Shoreline length: ${siteContext.shorelineM} m, ${siteContext.transects} transects
- Net seasonal change: ${siteContext.netSeasonM2} m² (${siteContext.netSeasonPct}%)
- 90-day forecast: ${siteContext.forecast90M2} m² (${siteContext.forecast90Pct}%)
- Drift cell: ${siteContext.driftDirection}, ${siteContext.driftRate} m/yr, sediment budget ${siteContext.sedimentBudget} m³/yr
- Hotspots: ${siteContext.hotspots ?? 'see data'}
- Recent events: ${siteContext.events ?? 'see data'}
- Forecast scenarios (12mo/36mo m²): do nothing ${siteContext.scenarios?.doNothing ?? '—'}; maintain ${siteContext.scenarios?.maintain ?? '—'}; expand ${siteContext.scenarios?.expand ?? '—'}; nourish ${siteContext.scenarios?.nourish ?? '—'}` : 'No site loaded yet.'}

Respond in 2-4 short paragraphs. Use lowercase prose in keeping with the brand voice. Cite specific numbers when relevant. If recommending action, be specific (which segment, what intervention, what to monitor). Only reference data provided above — do not invent facts.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply: text })
  } catch (error) {
    console.error('[/api/chat]', error)
    return NextResponse.json({ error: 'Chat unavailable' }, { status: 500 })
  }
}
