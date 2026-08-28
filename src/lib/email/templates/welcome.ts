// ============================================================================
// ExamForge AI — Welcome Email Template
// ============================================================================

export const welcomeTemplate = {
  name: 'welcome',
  subject: 'Welcome to ExamForge AI!',
  getText: (data: { firstName?: string }) =>
    `Welcome to ExamForge AI!\n\nHi ${data.firstName ?? 'there'},\n\nWelcome to ExamForge AI — The AI Operating System for Modern Schools.\n\nBest regards,\nThe ExamForge AI Team`,
  getHtml: (data: { firstName?: string }) => `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Welcome to ExamForge AI!</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;">
        <p>Hi ${data.firstName ?? 'there'},</p>
        <p>Welcome to ExamForge AI — The AI Operating System for Modern Schools.</p>
        <p>You're all set to start exploring our platform.</p>
        <p>Best regards,<br>The ExamForge AI Team</p>
      </div>
    </div>
  `,
}
