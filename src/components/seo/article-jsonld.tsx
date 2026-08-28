// ============================================================================
// ExamForge AI — Article JSON-LD Structured Data
// ============================================================================
// Generates Schema.org Article structured data for blog posts.
// Used by search engines for rich results (article cards, headline, etc.).
// ============================================================================

interface ArticleJsonLdProps {
  title: string
  description: string
  authorName: string
  authorUrl?: string
  datePublished: string
  dateModified?: string
  url: string
  imageUrl?: string
  publisherName?: string
  publisherUrl?: string
  publisherLogoUrl?: string
}

export function ArticleJsonLd({
  title,
  description,
  authorName,
  authorUrl,
  datePublished,
  dateModified,
  url,
  imageUrl,
  publisherName = 'ExamForge AI',
  publisherUrl = 'https://examforge.ai',
  publisherLogoUrl = 'https://examforge.ai/logo.png',
}: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Person',
      name: authorName,
      ...(authorUrl ? { url: authorUrl } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      url: publisherUrl,
      logo: {
        '@type': 'ImageObject',
        url: publisherLogoUrl,
      },
    },
    datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(imageUrl ? { image: { '@type': 'ImageObject', url: imageUrl } } : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
