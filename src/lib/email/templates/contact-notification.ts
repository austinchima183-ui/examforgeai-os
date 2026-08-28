// ============================================================================
// ExamForge AI — Contact Notification Email Template (to Sales Team)
// ============================================================================

export const contactNotificationTemplate = {
  name: 'contact-notification',
  subject: (data: { subject: string }) => `[ExamForge AI] New Contact: ${data.subject}`,
  getText: (data: { firstName: string; lastName: string; email: string; school?: string; subject: string; message: string; phone?: string; priority: string; submissionId: string }) =>
    `New Contact Submission\n\nName: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nSchool: ${data.school ?? 'N/A'}\nSubject: ${data.subject}\nPriority: ${data.priority}\nPhone: ${data.phone ?? 'N/A'}\n\nMessage:\n${data.message}\n\nSubmission ID: ${data.submissionId}`,
  getHtml: (data: { firstName: string; lastName: string; email: string; school?: string; institutionType?: string; subject: string; message: string; phone?: string; priority: string; submissionId: string }) => `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">New Contact Submission</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;font-weight:bold;width:120px;">Name:</td><td style="padding:8px 0;">${data.firstName} ${data.lastName}</td></tr>
          <tr><td style="padding:8px 0;font-weight:bold;">Email:</td><td style="padding:8px 0;">${data.email}</td></tr>
          ${data.school ? `<tr><td style="padding:8px 0;font-weight:bold;">School:</td><td style="padding:8px 0;">${data.school}</td></tr>` : ''}
          ${data.institutionType ? `<tr><td style="padding:8px 0;font-weight:bold;">Type:</td><td style="padding:8px 0;">${data.institutionType}</td></tr>` : ''}
          <tr><td style="padding:8px 0;font-weight:bold;">Subject:</td><td style="padding:8px 0;">${data.subject}</td></tr>
          <tr><td style="padding:8px 0;font-weight:bold;">Priority:</td><td style="padding:8px 0;">${data.priority}</td></tr>
          ${data.phone ? `<tr><td style="padding:8px 0;font-weight:bold;">Phone:</td><td style="padding:8px 0;">${data.phone}</td></tr>` : ''}
        </table>
        <div style="background:#f5f5f5;padding:16px;border-radius:4px;margin-top:16px;">
          <p style="margin-top:0;"><strong>Message:</strong></p>
          <p>${data.message}</p>
        </div>
        <p style="margin-top:16px;font-size:13px;color:#666;"><strong>Submission ID:</strong> ${data.submissionId}</p>
      </div>
    </div>
  `,
}
