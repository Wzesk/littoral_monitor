'use client'

import { useState, useRef, useEffect } from 'react'
import * as Icons from '@/components/Icons'
import type { SiteData } from '@/lib/types'

interface Message { role: 'user' | 'agent'; content: string; suggestions?: string[] }

export default function ChatView({ data }: { data: SiteData }) {
  const { site, health, drift, hotspots, events, scenarios } = data
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      content: `welcome. i can analyze the **${site.site_name}** shoreline data — ${data.MONTHS} months of observations across ${data.N} transects, including storm events, interventions, and 90-day nearcast. ask me anything about the site.`,
      suggestions: [
        'why is this shoreline eroding?',
        'how are the interventions performing?',
        'what should we prioritize this month?',
      ],
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy])

  async function send(text: string) {
    if (!text.trim() || busy) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(m => [...m, userMsg])
    setInput('')
    setBusy(true)

    try {
      const siteContext = {
        siteName: site.site_name,
        location: site.location,
        shorelineM: site.shorelineM,
        transects: site.transects,
        netSeasonM2: health.netSeasonM2,
        netSeasonPct: health.netSeasonPct,
        forecast90M2: health.forecast90M2,
        forecast90Pct: health.forecast90Pct,
        driftDirection: drift.netDirection,
        driftRate: drift.netRateMPerYr,
        sedimentBudget: drift.sedimentBudgetM3PerYr,
        hotspots: hotspots.map(h => `${h.label} (${h.priority}, ${h.rateMPerYr} m/yr, ${h.driver})`).join('; '),
        events: events.slice(0, 5).map(e => `${e.date} ${e.title} (${e.impact ?? '—'} m²)`).join('; '),
        scenarios: {
          doNothing: `${scenarios.doNothing.delta12mo}/${scenarios.doNothing.delta36mo}`,
          maintain: `${scenarios.maintain.delta12mo}/${scenarios.maintain.delta36mo}`,
          expand: `${scenarios.expand.delta12mo}/${scenarios.expand.delta36mo}`,
          nourish: `${scenarios.nourish.delta12mo}/${scenarios.nourish.delta36mo}`,
        },
      }

      const apiMessages = [
        ...messages.filter(m => m.role !== 'agent' || messages.indexOf(m) > 0).map(m => ({
          role: m.role === 'agent' ? 'assistant' : 'user',
          content: m.content,
        })),
        { role: 'user', content: text },
      ]

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, siteContext }),
      })

      if (!res.ok) throw new Error('chat error')
      const { reply } = await res.json()
      setMessages(m => [...m, { role: 'agent', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'agent', content: 'sorry — i couldn\'t reach the analysis backend. try again in a moment.' }])
    }
    setBusy(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#fafafa' }}>
      {/* Header */}
      <div style={{ padding: '18px 28px', background: '#fff', borderBottom: '1px solid var(--ca-line)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 32, height: 32, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 11px/1 var(--font-sans)', letterSpacing: '0.1em' }}>
          ai
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: '500 14px/1 var(--font-sans)' }}>shoreline analyst</div>
          <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>
            {site.site_name} · grounded in the live dataset
          </div>
        </div>
        <span className="pill pill--healthy"><span className="pill__dot" /> online</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 24, display: 'flex', gap: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              {m.role === 'agent' && (
                <div style={{ width: 28, height: 28, background: '#000', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, letterSpacing: '0.1em' }}>ai</div>
              )}
              {m.role === 'user' && (
                <div style={{ width: 28, height: 28, background: '#1aa1be', color: '#000', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 11px/1 var(--font-sans)' }}>
                  {site.operator?.slice(0, 2).toUpperCase() ?? 'OP'}
                </div>
              )}
              <div style={{ flex: 1, maxWidth: 640 }}>
                <div style={{
                  background: m.role === 'user' ? '#000' : '#fff',
                  color: m.role === 'user' ? '#fff' : 'var(--fg)',
                  border: m.role === 'user' ? '1px solid #000' : '1px solid var(--ca-line)',
                  padding: '12px 16px',
                  font: '300 14px/1.55 var(--font-sans)',
                }}>
                  <FormattedMessage text={m.content} />
                </div>
                {m.suggestions && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.suggestions.map((s, j) => (
                      <button key={j} onClick={() => send(s)}
                        style={{ appearance: 'none', cursor: 'pointer', background: '#fff', border: '1px solid var(--ca-line)', padding: '6px 10px', font: '300 12px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 28, height: 28, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, letterSpacing: '0.1em' }}>ai</div>
              <div style={{ padding: '12px 16px', background: '#fff', border: '1px solid var(--ca-line)', font: '300 italic 13px/1 var(--font-sans)', color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="pulse">●</span> analyzing the dataset
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div style={{ padding: '16px 28px 24px', background: '#fff', borderTop: '1px solid var(--ca-line)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 8 }}>
          <input className="input"
            style={{ flex: 1, height: 44, fontSize: 14, padding: '0 14px' }}
            placeholder="ask about a segment, an event, a forecast…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(input) }}
            disabled={busy}
          />
          <button className="btn btn--ink" style={{ height: 44, padding: '0 18px' }}
            onClick={() => send(input)} disabled={busy || !input.trim()}>
            send <Icons.ArrowUpRight size={13} />
          </button>
        </div>
        <div style={{ maxWidth: 760, margin: '8px auto 0', font: '300 italic 11px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>
          answers are grounded in this site&apos;s monitoring data only · not financial or legal advice
        </div>
      </div>
    </div>
  )
}

function FormattedMessage({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((p, i) => p.startsWith('**')
        ? <strong key={i} style={{ fontWeight: 500 }}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>)}
    </span>
  )
}
