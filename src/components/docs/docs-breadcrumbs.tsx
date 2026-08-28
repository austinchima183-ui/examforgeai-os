import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'

// ============================================================================
// ExamForge AI — Documentation Breadcrumbs
// ============================================================================
// Server component for documentation breadcrumbs using shadcn/ui Breadcrumb.
// Provides semantic navigation trail for docs pages.
// ============================================================================

interface BreadcrumbItem {
  label: string
  href: string
}

interface DocsBreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function DocsBreadcrumbs({ items }: DocsBreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <Breadcrumb aria-label="Documentation breadcrumbs">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <BreadcrumbItem key={item.href}>
              {isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
