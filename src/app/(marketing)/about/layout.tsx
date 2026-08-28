import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — ExamForge AI',
  description:
    'Our story, mission, and team. ExamForge AI was founded to give every school in Africa access to world-class technology that makes education better, faster, and more equitable.',
  openGraph: {
    title: 'About — ExamForge AI',
    description:
      'Our story, mission, and team. ExamForge AI was founded to give every school in Africa access to world-class technology.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
