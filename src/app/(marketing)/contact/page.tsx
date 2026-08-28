import type { Metadata } from 'next'
import { ContactPageContent } from '@/components/marketing/contact-page-content'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — Contact Page
// ============================================================================

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with ExamForge AI. Schedule a demo, ask questions, or request a custom quote for your school.',
}

export default function ContactPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Contact', href: '/contact' }]} />
      <ContactPageContent />
    </>
  )
}
