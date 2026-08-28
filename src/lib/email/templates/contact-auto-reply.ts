// ============================================================================
// ExamForge AI — Contact Auto-Reply Email Template
// ============================================================================

export const contactAutoReplyTemplate = {
  name: 'contact-auto-reply',
  subject: 'Thank you for contacting ExamForge AI',
  getText: (data: { firstName: string; submissionId: string }) =>
    `Thank You for Contacting ExamForge AI\n\nHi ${data.firstName},\n\nThank you for reaching out! We've received your message and our team will get back to you within 4 hours during business days.\n\nReference ID: ${data.submissionId}\n\nIf your inquiry is urgent, please call us at +234 801 234 5678.\n\nBest regards,\nThe ExamForge AI Team`,
  getHtml: (data: { firstName: string; subject: string; submissionId: string }) => `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Thank You for Contacting ExamForge AI</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;">
        <p>Hi ${data.firstName},</p>
        <p>Thank you for reaching out! We've received your message and our team will get back to you within 4 hours during business days.</p>
        <p><strong>Reference ID:</strong> ${data.submissionId}</p>
        <p>If your inquiry is urgent, please call us at <a href="tel:+2348012345678">+234 801 234 5678</a>.</p>
        <p>Best regards,<br>The ExamForge AI Team</p>
      </div>
    </div>
  `,
}
