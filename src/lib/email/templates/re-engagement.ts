// ============================================================================
// ExamForge AI — Re-Engagement Email Template
// ============================================================================

export const reEngagementTemplate = {
  name: 're-engagement',
  subject: 'We miss you at ExamForge AI!',
  getText: (data: { firstName?: string }) =>
    `We Miss You!\n\nHi ${data.firstName ?? 'there'},\n\nIt's been a while since we heard from you. We've been busy adding new features to ExamForge AI!\n\nWould you like to schedule another demo or chat with our team?\n\nBest regards,\nThe ExamForge AI Team`,
  getHtml: (data: { firstName?: string }) => `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">We Miss You!</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;">
        <p>Hi ${data.firstName ?? 'there'},</p>
        <p>It's been a while since we heard from you. We've been busy adding new features to ExamForge AI!</p>
        <p>Would you like to schedule another demo or chat with our team?</p>
        <p><a href="/demo" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;">Book a Demo</a></p>
        <p>Best regards,<br>The ExamForge AI Team</p>
      </div>
    </div>
  `,
}
