// ============================================================================
// ExamForge AI — Course JSON-LD
// ============================================================================
// Server component for Course structured data. Generates proper schema.org
// Course JSON-LD for educational content and training programs.
// ============================================================================

interface CourseJsonLdProps {
  name: string
  description: string
  provider: string
  courseCode?: string
  educationalLevel?: string
}

export function CourseJsonLd({
  name,
  description,
  provider,
  courseCode,
  educationalLevel,
}: CourseJsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    provider: {
      '@type': 'Organization',
      name: provider,
    },
  }

  if (courseCode) {
    jsonLd.courseCode = courseCode
  }

  if (educationalLevel) {
    jsonLd.educationalLevel = educationalLevel
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
