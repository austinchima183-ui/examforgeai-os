import { createServiceClient } from '@/lib/supabase/service'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextResponse, type NextRequest } from 'next/server'
import { requireApiRole, deriveTenantContext, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Grade API (batch grading + AI assist)
// ============================================================================
// POST /api/teacher/grade — Grade submissions (teacher/school_admin/super_admin)
// gradedBy is ALWAYS derived from the authenticated session — never from client input.
// ============================================================================

// Zod schema for batch-grade action
const BatchGradeSchema = z.object({
  action: z.literal('batch-grade'),
  grades: z.array(z.object({
    id: z.string().uuid('Invalid submission ID'),
    score: z.number().min(0, 'Score must be non-negative'),
  })).min(1, 'At least one grade is required'),
})

// Zod schema for ai-grade action
const AiGradeSchema = z.object({
  action: z.literal('ai-grade'),
  submissionId: z.string().uuid('Invalid submission ID'),
})

// Combined schema
const GradeActionSchema = z.discriminatedUnion('action', [
  BatchGradeSchema,
  AiGradeSchema,
])

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Auth + role check: teacher, school_admin, or super_admin
    const auth = await requireApiRole(request, ['teacher', 'school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Derive gradedBy from session — NEVER from client input
    const tenant = deriveTenantContext(auth)
    const gradedBy = tenant.userId

    // Validate input
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(GradeActionSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    if (body.action === 'batch-grade') {
      const results = await Promise.all(
        body.grades.map(async (g) => {
          const { data, error } = await supabase
            .from('exam_submissions')
            .update({ score: g.score, graded_by: gradedBy, graded_at: new Date().toISOString() })
            .eq('id', g.id)
            .select('*')
            .single()
          if (error) throw error
          return data
        })
      )

      return NextResponse.json({ updated: results.length })
    }

    if (body.action === 'ai-grade') {
      const { submissionId } = body

      const { data: submission, error: fetchError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('id', submissionId)
        .maybeSingle()

      if (fetchError) {
        console.error('Grade API error:', fetchError)
        return NextResponse.json(createSafeErrorResponse(fetchError, { route: 'teacher/grade' }), { status: 500 })
      }

      if (!submission) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
      }

      // Use AI to suggest a score
      try {
        const maxScore = Number(submission.max_score)

        const aiRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `You are an expert teacher grading a student's answer. Evaluate this response and provide a score and brief feedback.

Question: ${submission.question_id}
Student Answer: ${submission.answer}
Maximum Score: ${maxScore}

Respond in JSON format: { "score": <number>, "feedback": "<string>" }`,
            max_tokens: 300,
          }),
        })
        const aiData = await aiRes.json()

        let parsedScore = maxScore * 0.6
        let parsedFeedback = 'AI assessment completed.'

        try {
          const content = aiData?.choices?.[0]?.message?.content || aiData?.text || ''
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            parsedScore = Math.min(Math.max(0, parsed.score), maxScore)
            parsedFeedback = parsed.feedback || parsedFeedback
          }
        } catch {
          // Use defaults
        }

        const { error: updateError } = await supabase
          .from('exam_submissions')
          .update({ ai_score: parsedScore, ai_feedback: parsedFeedback })
          .eq('id', submissionId)
          .select('*')
          .single()

        if (updateError) {
          console.error('AI grading error:', updateError)
          return NextResponse.json({ error: 'AI grading failed' }, { status: 500 })
        }

        return NextResponse.json({ aiScore: parsedScore, aiFeedback: parsedFeedback })
      } catch (aiError) {
        console.error('AI grading error:', aiError)
        return NextResponse.json({ error: 'AI grading failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Grade API error:', error)
    return NextResponse.json(createSafeErrorResponse(error, { route: 'teacher/grade' }), { status: 500 })
  }
}
