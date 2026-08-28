// ============================================================================
// ExamForge AI — Author (Person) JSON-LD Structured Data
// ============================================================================
// Generates Schema.org Person structured data for author pages.
// Used by search engines for knowledge panel and author attribution.
// ============================================================================

interface AuthorJsonLdProps {
  name: string
  url: string
  jobTitle: string
  description: string
  image?: string
  sameAs?: string[]
  worksForName?: string
  worksForUrl?: string
}

export function AuthorJsonLd({
  name,
  url,
  jobTitle,
  description,
  image,
  sameAs,
  worksForName = 'ExamForge AI',
  worksForUrl = 'https://examforge.ai',
}: AuthorJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url,
    jobTitle,
    description,
    worksFor: {
      '@type': 'Organization',
      name: worksForName,
      url: worksForUrl,
    },
    ...(image ? { image: { '@type': 'ImageObject', url: image } } : {}),
    ...(sameAs && sameAs.length > 0 ? { sameAs } : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
