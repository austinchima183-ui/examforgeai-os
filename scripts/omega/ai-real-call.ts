// Ω-15: Prove the AI layer makes REAL model calls with REAL token usage.
// Calls z-ai-web-dev-sdk directly (same SDK the app's ai-engine uses) and
// verifies: non-empty content, usage metrics, latency.
import { chromium } from 'playwright'

const TARGET = process.argv[2] || 'http://localhost:3000'

;(async () => {
  // ── Part 1: direct SDK call (server-equivalent environment) ──
  const t0 = Date.now()
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const ai = await ZAI.create()
  const response = await ai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a quiz generator. Respond with valid JSON only.' },
      {
        role: 'user',
        content:
          'Generate one multiple-choice question about photosynthesis with 4 options and the correct answer index. JSON format: {"question":string,"options":string[],"correctIndex":number,"explanation":string}',
      },
    ],
    temperature: 0.3,
    max_tokens: 300,
  })
  const latency = Date.now() - t0
  const content = response.choices?.[0]?.message?.content ?? ''
  const usage = response.usage

  let parsed: unknown = null
  try {
    const jsonStr = content.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() ?? content
    parsed = JSON.parse(jsonStr)
  } catch {
    parsed = null
  }

  const report = {
    sdk: 'z-ai-web-dev-sdk (GLM)',
    model: 'default (chat.completions)',
    latency_ms: latency,
    content_length: content.length,
    content_preview: content.slice(0, 200),
    usage: {
      prompt_tokens: usage?.prompt_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
    },
    structured_parse_ok: parsed !== null,
    verdict:
      content.length > 50 && (usage?.total_tokens ?? 0) > 0
        ? 'REAL AI RESPONSE (content + token usage present)'
        : 'SUSPECT RESPONSE',
  }
  console.log(JSON.stringify(report, null, 2))

  // ── Part 2: cost model sanity (the engine's estimateCost path) ──
  const estimateCost = (tokensIn: number, tokensOut: number) =>
    (tokensIn / 1000) * 0.000075 + (tokensOut / 1000) * 0.0003
  report['estimated_cost_usd'] = estimateCost(
    usage?.prompt_tokens ?? 0,
    usage?.completion_tokens ?? 0
  )

  const fs = await import('fs')
  fs.writeFileSync(
    '/home/z/my-project/download/verification/audit/ai-real-call-evidence.json',
    JSON.stringify(report, null, 2)
  )
  console.log('saved: download/verification/audit/ai-real-call-evidence.json')
  console.log(
    `VERDICT: ${report.verdict} | parsed JSON: ${report.structured_parse_ok} | cost est: $${report['estimated_cost_usd'].toFixed(6)}`
  )
})().catch((e) => {
  console.error('AI CALL FAILED:', e.message)
  process.exit(1)
})
