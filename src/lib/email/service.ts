// ============================================================================
// ExamForge AI — Email Service Abstraction Layer
// ============================================================================
// Class-based email service supporting Resend as primary provider,
// with console logging fallback for development.
// ============================================================================

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

const DEFAULT_FROM = 'ExamForge AI <noreply@examforge.ai>'

class EmailService {
  private provider: 'resend' | 'log' = 'log'

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.provider = 'resend'
    }
  }

  async send(params: SendEmailParams): Promise<EmailResult> {
    if (this.provider === 'resend') {
      return this.sendWithResend(params)
    }

    // Development fallback: log to console (⚠️ PII: only in non-production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[EMAIL]',
        params.subject,
        'to:',
        Array.isArray(params.to) ? `${params.to.length} recipient(s)` : '1 recipient'
      )
      console.log('[EMAIL] From:', params.from ?? DEFAULT_FROM)
      if (params.text) {
        console.log('[EMAIL] Text preview:', params.text.substring(0, 200))
      }
    }
    return { success: true, messageId: `log-${Date.now()}` }
  }

  private async sendWithResend(params: SendEmailParams): Promise<EmailResult> {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      const { data, error } = await resend.emails.send({
        from: params.from ?? DEFAULT_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
      })

      if (error) {
        console.error('[EmailService] Resend error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error',
      }
    }
  }
}

export const emailService = new EmailService()
