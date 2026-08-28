'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ViewButtonProps {
  href: string
  label?: string
}

export function ViewButton({ href, label = 'View' }: ViewButtonProps) {
  return (
    <Button variant="ghost" size="sm" className="h-8" asChild>
      <Link href={href}>{label}</Link>
    </Button>
  )
}
