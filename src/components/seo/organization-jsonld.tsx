import { BRAND, COMPANY } from '@/lib/brand-constants'

// ============================================================================
// ExamForge AI — Organization JSON-LD
// ============================================================================
// Server component that renders Organization structured data (JSON-LD) for
// ExamForge AI. Provides search engines with comprehensive org information
// including social links, contact points, founding data, and area served.
// ============================================================================

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    url: BRAND.url,
    logo: `${BRAND.url}/logo.png`,
    description: BRAND.description,
    sameAs: [
      'https://twitter.com/examforgeai',
      'https://linkedin.com/company/examforgeai',
      'https://github.com/examforgeai',
      'https://youtube.com/@examforgeai',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: COMPANY.email,
        telephone: COMPANY.phone,
        availableLanguage: ['English'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@examforge.ai',
        telephone: COMPANY.phone,
        availableLanguage: ['English'],
      },
    ],
    foundingDate: COMPANY.founded,
    founders: [
      {
        '@type': 'Person',
        name: 'ExamForge AI Team',
      },
    ],
    areaServed: [
      { '@type': 'Country', name: 'Nigeria' },
      { '@type': 'Country', name: 'Kenya' },
      { '@type': 'Country', name: 'Ghana' },
      { '@type': 'Country', name: 'South Africa' },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Lagos',
      addressCountry: 'NG',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
