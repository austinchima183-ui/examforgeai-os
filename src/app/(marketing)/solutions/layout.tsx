import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Solutions — ExamForge AI',
  description:
    'Solutions for every institution — primary schools, secondary schools, universities, school groups, government agencies, and examination bodies. See how ExamForge AI adapts to your needs.',
  openGraph: {
    title: 'Solutions — ExamForge AI',
    description:
      'Solutions for every institution — primary schools, secondary schools, universities, school groups, government agencies, and examination bodies.',
  },
}

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
