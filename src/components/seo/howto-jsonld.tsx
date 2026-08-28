// ============================================================================
// ExamForge AI — HowTo JSON-LD
// ============================================================================
// Server component for HowTo structured data. Generates proper schema.org
// HowTo JSON-LD with ordered steps for tutorials and guides.
// ============================================================================

interface HowToStep {
  name: string
  text: string
}

interface HowToJsonLdProps {
  name: string
  description: string
  steps: HowToStep[]
}

export function HowToJsonLd({ name, description, steps }: HowToJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
