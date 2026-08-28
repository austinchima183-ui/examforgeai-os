// ============================================================================
// ExamForge AI — Demo Confirmation Email Template
// ============================================================================

export const demoConfirmationTemplate = {
  name: 'demo-confirmation',
  subject: 'Your ExamForge AI Demo is Confirmed!',
  getText: (data: { name: string; preferredDate: string; preferredTime: string; timezone: string; bookingId: string; meetingUrl?: string }) =>
    `Your ExamForge AI Demo is Confirmed!\n\nHi ${data.name},\n\nYour demo has been booked!\n\nDate: ${data.preferredDate}\nTime: ${data.preferredTime} (${data.timezone})\nBooking ID: ${data.bookingId}${data.meetingUrl ? `\nMeeting Link: ${data.meetingUrl}` : ''}\n\nWe'll send you a reminder 24 hours before your demo.\n\nBest regards,\nThe ExamForge AI Team`,
  getHtml: (data: { name: string; preferredDate: string; preferredTime: string; timezone: string; bookingId: string; meetingUrl?: string }) => `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Demo Booking Confirmed</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;">
        <p>Hi ${data.name},</p>
        <p>Your demo has been booked! Here are the details:</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;font-weight:bold;">Date:</td><td style="padding:8px 0;">${data.preferredDate}</td></tr>
          <tr><td style="padding:8px 0;font-weight:bold;">Time:</td><td style="padding:8px 0;">${data.preferredTime} (${data.timezone})</td></tr>
          <tr><td style="padding:8px 0;font-weight:bold;">Booking ID:</td><td style="padding:8px 0;">${data.bookingId}</td></tr>
        </table>
        ${data.meetingUrl ? `<p style="margin-top:16px;"><a href="${data.meetingUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;">Join Meeting</a></p>` : ''}
        <p style="margin-top:16px;">We'll send you a reminder 24 hours before your demo.</p>
        <p>Best regards,<br>The ExamForge AI Team</p>
      </div>
    </div>
  `,
}
