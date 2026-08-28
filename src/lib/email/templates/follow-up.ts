// ============================================================================
// ExamForge AI — Follow-Up Email Template
// ============================================================================

export const followUpTemplate = {
  name: 'follow-up',
  subject: 'How did your ExamForge AI demo go?',
  getText: (data: { name: string; scheduleUrl?: string }) =>
    `How Did Your Demo Go?\n\nHi ${data.name},\n\nWe hope you enjoyed your ExamForge AI demo! We'd love to hear your feedback and answer any questions you might have.\n\nGet in touch: ${data.scheduleUrl ?? '/contact'}\n\nBest regards,\nThe ExamForge AI Team`,
  getHtml: (data: { name: string; scheduleUrl?: string }) => `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">How Did Your Demo Go?</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;">
        <p>Hi ${data.name},</p>
        <p>We hope you enjoyed your ExamForge AI demo! We'd love to hear your feedback and answer any questions you might have.</p>
        <p><a href="${data.scheduleUrl ?? '/contact'}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;">Get in Touch</a></p>
        <p>Best regards,<br>The ExamForge AI Team</p>
      </div>
    </div>
  `,
}
