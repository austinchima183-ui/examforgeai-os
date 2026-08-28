import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Features — ExamForge AI',
  description:
    'Explore 10 integrated modules powered by AI. From CBT exams and auto-marking to analytics, school ERP, and the AI assistant — see everything ExamForge AI offers.',
  openGraph: {
    title: 'Features — ExamForge AI',
    description:
      'Explore 10 integrated modules powered by AI. From CBT exams and auto-marking to analytics, school ERP, and the AI assistant.',
  },
}

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
