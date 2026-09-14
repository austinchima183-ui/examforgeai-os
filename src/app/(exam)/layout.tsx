// ============================================================================
// ExamForge AI — Distraction-Free Exam Layout
// ============================================================================
// The exam is sacred (UI Constitution, Article I.4). This layout deliberately
// renders OUTSIDE the EnterpriseAppShell: no sidebar, no header, no command
// palette, no floating AI assistant — nothing a student can use to leave or
// cheat during a live exam. The URL /exams/[id]/take is unchanged; only the
// chrome differs. RBAC is still enforced by middleware on the URL path.
// A semantic <main> landmark is preserved (Article VIII).
// ============================================================================

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="min-h-dvh bg-background forge-ambient-bg">
      {children}
    </main>
  )
}
