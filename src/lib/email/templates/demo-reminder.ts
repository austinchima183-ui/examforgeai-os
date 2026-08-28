// ============================================================================
// ExamForge AI — Demo Reminder Email Template
// ============================================================================

export const demoReminderTemplate = {
  name: 'demo-reminder',
  subject: 'Reminder: Your ExamForge AI Demo is Tomorrow',
  getText: (data: { name: string; preferredDate: string; preferredTime: string; timezone: string; meetingUrl?: string }) =>
    `Your Demo is Tomorrow!\n\nHi ${data.name},\n\nThis is a reminder that your ExamForge AI demo is scheduled for tomorrow.\n\nDate: ${data.preferredDate}\nTime: ${data.preferredTime} (${data.timezone})${data.meetingUrl ? `\nMeeting Link: ${data.meetingUrl}` : ''}\n\nBest regards,\nThe ExamForge AI Team`,
  getHtml: (data: { name: string; preferredDate: string; preferredTime: string; timezone: string; meetingUrl?: string }) => `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Your Demo is Tomorrow!</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;">
        <p>Hi ${data.name},</p>
        <p>This is a reminder that your ExamForge AI demo is scheduled for tomorrow:</p>
        <p><strong>Date:</strong> ${data.preferredDate}</p>
        <p><strong>Time:</strong> ${data.preferredTime} (${data.timezone})</p>
        ${data.meetingUrl ? `<p><a href="${data.meetingUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;">Join Meeting</a></p>` : ''}
        <p>Best regards,<br>The ExamForge AI Team</p>
      </div>
    </div>
  `,
}
