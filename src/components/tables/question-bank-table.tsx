'use client'

// ============================================================================
// ExamForge AI — QuestionBankTable (client wrapper)
// RSC-safe: the server page passes only serializable DATA; column definitions
// (which contain render functions) live here in the client boundary.
// ============================================================================

import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/data-table'
import type { QuestionListItem } from '@/lib/services/question-bank-service'
import { HelpCircle, Sparkles, BookOpen, FileText, Wand2, Filter, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ViewButton } from '@/components/buttons/view-button'

const typeLabelMap: Record<string, string> = {
  single_choice: 'Single Choice',
  multi_choice: 'Multi Choice',
  multi_select: 'Multi Select',
  true_false: 'True/False',
  short_answer: 'Short Answer',
  essay: 'Essay',
  fill_blank: 'Fill in Blank',
  matching: 'Matching',
  ordering: 'Ordering',
}

const typeColorMap: Record<string, string> = {
  single_choice: 'bg-primary/15 text-primary',
  multi_choice: 'bg-primary/15 text-primary',
  multi_select: 'bg-neural/15 text-neural',
  true_false: 'bg-ember/15 text-ember',
  short_answer: 'bg-emerald-500/15 text-emerald-400',
  essay: 'bg-emerald-500/15 text-emerald-400',
  fill_blank: 'bg-muted/50 text-muted-foreground',
  matching: 'bg-neural/15 text-neural',
  ordering: 'bg-ember/15 text-ember',
}

const difficultyVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  easy: 'secondary',
  medium: 'outline',
  hard: 'default',
  expert: 'destructive',
}

const difficultyColorMap: Record<string, string> = {
  easy: 'bg-emerald-500/15 text-emerald-400',
  medium: 'bg-ember/15 text-ember',
  hard: 'bg-primary/15 text-primary',
  expert: 'bg-destructive/15 text-destructive',
}

const columns: ColumnDef<QuestionListItem, unknown>[] = [
  {
    accessorKey: 'text',
    header: 'Question',
    cell: ({ row }) => (
      <div className="max-w-md">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{row.getValue('text')}</p>
          {row.original.aiGenerated && (
            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-neural/40 text-neural">
              <Sparkles className="h-3 w-3 mr-0.5" />
              AI
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
            <Badge variant="secondary" className={`text-[10px] ${typeColorMap[row.original.type] ?? ''} border border-border/20`}>
            {typeLabelMap[row.original.type] ?? row.original.type}
          </Badge>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'subject',
    header: 'Subject',
    cell: ({ row }) => {
      const subject = row.getValue('subject') as string | null
      return subject ? (
        <Badge variant="outline" className="text-xs border-white/[0.04] bg-secondary/50">
          <Tag className="h-3 w-3 mr-1 text-muted-foreground" />
          {subject}
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">{`\u2014`}</span>
      )
    },
  },
  {
    accessorKey: 'topic',
    header: 'Topic',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.getValue('topic') ?? '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'difficulty',
    header: 'Difficulty',
    cell: ({ row }) => {
      const difficulty = row.getValue('difficulty') as string
      return (
        <Badge variant={difficultyVariantMap[difficulty] ?? 'outline'} className={difficultyColorMap[difficulty] ?? ''}>
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'marks',
    header: 'Marks',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">{row.getValue('marks')}</span>
    ),
  },
  {
    accessorKey: 'examUsageCount',
    header: 'Used In',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">{row.getValue('examUsageCount')} exams</span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <ViewButton href={`/question-bank/${row.original.id}`} />
    ),
  },
]

export function QuestionBankTable({ data }: { data: QuestionListItem[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="text"
      searchPlaceholder="Search questions..."
      emptyMessage="No questions found"
      emptyDescription="No questions match your search criteria. Try adjusting your filters."
    />
  )
}
