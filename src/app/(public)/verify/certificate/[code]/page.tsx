import type { Metadata } from 'next'
import { CertificateVerificationView } from '@/components/public/certificate-verification-view'

// ============================================================================
// ExamForge AI — Public Certificate Verification Page (Ω-21)
// ============================================================================
// Server component shell; the client view performs the public verification
// lookup (rate-limited API) and renders the verification result.
// This is the QR-code target printed on every issued certificate:
//   /verify/certificate/<code>
// ============================================================================

export const metadata: Metadata = {
  title: 'Verify Certificate',
  description:
    'Verify the authenticity of an ExamForge AI certificate. Enter the verification code printed on the certificate or scan its QR code.',
  keywords: ['certificate verification', 'verify certificate', 'ExamForge AI'],
  openGraph: {
    title: 'Verify Certificate — ExamForge AI',
    description: 'Verify the authenticity of an ExamForge AI certificate.',
    type: 'website',
  },
  robots: { index: false, follow: true },
}

export default async function CertificateVerificationPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <CertificateVerificationView code={code} />
}
