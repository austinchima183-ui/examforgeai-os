// ============================================================================
// ExamForge AI — Newsletter Verification Email Template
// ============================================================================

export const newsletterVerificationTemplate = {
  name: 'newsletter-verification',
  subject: 'Verify your email — ExamForge AI Newsletter',
  getText: (data: { verificationUrl: string }) =>
    `Verify Your Email\n\nThanks for subscribing to the ExamForge AI newsletter! Please verify your email address by visiting:\n\n${data.verificationUrl}\n\nIf you didn't subscribe, you can ignore this email.\n\nBest regards,\nThe ExamForge AI Team`,
  getHtml: (data: { verificationUrl: string }) => `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Verify Your Email</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;">
        <p>Hi there,</p>
        <p>Thanks for subscribing to the ExamForge AI newsletter! Please verify your email address by clicking the button below:</p>
        <p><a href="${data.verificationUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;">Verify Email</a></p>
        <p style="color:#666;font-size:13px;">If the button doesn't work, copy and paste this URL into your browser: ${data.verificationUrl}</p>
        <p>If you didn't subscribe, you can ignore this email.</p>
        <p>Best regards,<br>The ExamForge AI Team</p>
      </div>
    </div>
  `,
}
