'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Inbox,
  Download,
  Columns3,
  X,
  Loader2,
  PencilLine,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// ============================================================================
// ExamForge AI — Premium Data Table (UX 2.0)
// ============================================================================
// Enterprise table experience:
//   - Internal vertical scrolling with sticky header (tables never break the
//     app-frame scroll architecture)
//   - Global search + column filters
//   - Sorting (click header, keyboard accessible)
//   - Column visibility toggle menu
//   - CSV export of the CURRENT filtered/sorted view
//   - Row selection + bulk action bar (opt-in via enableSelection)
//   - Pagination with page-size selector
//   - Keyboard navigation: ↑/↓ moves row focus, Enter activates row action
//   - Loading skeleton + premium empty state
// ============================================================================

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageSizeOptions?: number[]
  isLoading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  emptyIcon?: React.ElementType
  className?: string
  /** Enable row selection + bulk actions bar */
  enableSelection?: boolean
  /** Bulk actions rendered when rows are selected */
  bulkActions?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode
  /** Max height of the scrollable body (px) before internal scrolling */
  maxHeight?: number
  /** CSV export file name (enables the export button) */
  exportFileName?: string
  /** Fixed height per row for virtualization-friendly rendering */
  stickyOffset?: string
  /**
   * Virtualized rendering: when the (filtered) dataset is large, rows render in
   * windowed slices with spacer rows — the DOM only holds what is visible.
   * Auto-activates when data exceeds 200 rows and maxHeight is set.
   */
  enableVirtualization?: boolean
  /**
   * Infinite scroll: called when the user scrolls near the end of the current
   * dataset. Combine with virtualization for smooth large-dataset browsing.
   */
  onLoadMore?: () => void
  /** Whether more rows can be loaded (infinite scroll) */
  hasMore?: boolean
  /** True while a background load is in flight (shows a loading row) */
  isFetchingMore?: boolean
  /**
   * Batch edit: adds an "Edit selected" action to the bulk bar. Opens a dialog
   * where shared fields are edited once and applied to every selected row.
   */
  batchEdit?: {
    fields: Array<{
      key: string
      label: string
      type: 'text' | 'textarea' | 'select' | 'number'
      options?: Array<{ label: string; value: string }>
      placeholder?: string
    }>
    onApply: (
      values: Record<string, string | number>,
      rows: TData[]
    ) => Promise<void> | void
  }
}

// ──────────────────────────────────────────────────────────────
// Batch Edit Dialog
// ──────────────────────────────────────────────────────────────

function BatchEditDialog<TData>({
  open,
  onOpenChange,
  count,
  config,
  selectedRows,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  count: number
  config: NonNullable<DataTableProps<TData, unknown>['batchEdit']>
  selectedRows: TData[]
  onDone: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [applying, setApplying] = useState(false)

  const dirtyCount = Object.values(values).filter((v) => v !== '').length

  const handleApply = async () => {
    if (dirtyCount === 0) return
    setApplying(true)
    try {
      const payload: Record<string, string | number> = {}
      for (const f of config.fields) {
        const raw = values[f.key]
        if (raw === undefined || raw === '') continue
        payload[f.key] = f.type === 'number' ? Number(raw) : raw
      }
      await config.onApply(payload, selectedRows)
      toast.success(`Updated ${count} ${count === 1 ? 'row' : 'rows'}`, {
        description: `${Object.keys(payload).length} field${Object.keys(payload).length === 1 ? '' : 's'} applied.`,
      })
      setValues({})
      onOpenChange(false)
      onDone()
    } catch (err) {
      toast.error('Batch update failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="forge-glass-elevated border border-border/30 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PencilLine className="h-4 w-4 text-blue-400" aria-hidden="true" />
            Edit {count} selected {count === 1 ? 'row' : 'rows'}
          </DialogTitle>
          <DialogDescription>
            Only fields you change are applied. Leave a field empty to keep existing values.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {config.fields.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`batch-${f.key}`} className="text-xs font-medium text-foreground/70">
                {f.label}
              </Label>
              {f.type === 'textarea' ? (
                <Textarea
                  id={`batch-${f.key}`}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder ?? 'Keep unchanged'}
                  className="min-h-[72px] border-border/40 bg-secondary/50 text-sm"
                />
              ) : f.type === 'select' ? (
                <Select
                  value={values[f.key] ?? ''}
                  onValueChange={(val) => setValues((v) => ({ ...v, [f.key]: val }))}
                >
                  <SelectTrigger
                    id={`batch-${f.key}`}
                    className="h-9 border-border/40 bg-secondary/50 text-sm"
                  >
                    <SelectValue placeholder={f.placeholder ?? 'Keep unchanged'} />
                  </SelectTrigger>
                  <SelectContent className="forge-glass-elevated border border-border/30">
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`batch-${f.key}`}
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder ?? 'Keep unchanged'}
                  className="h-9 border-border/40 bg-secondary/50 text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply} disabled={applying || dirtyCount === 0}>
            {applying ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Applying…
              </>
            ) : (
              <>Apply to {count}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ──────────────────────────────────────────────────────────────
// Loading Skeleton
// ──────────────────────────────────────────────────────────────

function TableSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-6 rounded',
                colIndex === 0 ? 'w-[180px]' : 'w-[120px]'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Premium Empty State
// ──────────────────────────────────────────────────────────────

function TableEmpty({
  message = 'No results found',
  description = 'Try adjusting your search or filter criteria.',
  icon: Icon = Inbox,
}: {
  message?: string
  description?: string
  icon?: React.ElementType
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute -inset-4 rounded-3xl bg-primary/8 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl forge-glass-surface backdrop-blur-sm border border-border/30 forge-card-shadow">
          <Icon className="h-7 w-7 text-primary/70" />
        </div>
      </div>
      <p className="text-base font-medium text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xs text-center">{description}</p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Data Table Component
// ──────────────────────────────────────────────────────────────

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  pageSizeOptions = [10, 20, 30, 50],
  isLoading = false,
  emptyMessage,
  emptyDescription,
  emptyIcon,
  className,
  enableSelection = false,
  bulkActions,
  maxHeight,
  exportFileName,
  enableVirtualization = false,
  onLoadMore,
  hasMore = false,
  isFetchingMore = false,
  batchEdit,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const bodyRef = useRef<HTMLDivElement>(null)
  const [focusedRow, setFocusedRow] = useState(-1)

  // ── Virtualization state ──
  // Activated when explicitly requested OR when the dataset is large and the
  // table has a scroll container (maxHeight). Rows render in windowed slices.
  const [scrollTop, setScrollTop] = useState(0)
  const virtualActive = enableVirtualization || (data.length > 200 && !!maxHeight)
  const VIRTUAL_ROW_HEIGHT = 53
  const VIRTUAL_OVERSCAN = 8
  const viewportHeight = maxHeight ?? 480

  const handleBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection: enableSelection ? rowSelection : {},
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: enableSelection ? setRowSelection : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: enableSelection ? undefined : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: enableSelection,
    initialState: {
      pagination: {
        pageSize: pageSizeOptions[0],
      },
    },
  })

  // Derive pagination info
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalRows = table.getFilteredRowModel().rows.length
  const pageCount = table.getPageCount()
  const rowStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const rowEnd = Math.min((pageIndex + 1) * pageSize, totalRows)

  // Selected row data for bulk actions
  const selectedRows = useMemo(() => {
    if (!enableSelection) return []
    return table.getSelectedRowModel().rows.map((r) => r.original)
  }, [enableSelection, table, rowSelection, data])

  // ── Keyboard navigation: ↑/↓ moves focused row, Enter clicks first link/button ──
  // In virtualized mode the row model is the FULL filtered+sorted set.
  const visibleRows = virtualActive
    ? table.getSortedRowModel().rows
    : table.getRowModel().rows
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedRow((prev) => {
          const next = e.key === 'ArrowDown' ? prev + 1 : prev - 1
          if (next < 0) return visibleRows.length - 1
          if (next >= visibleRows.length) return 0
          return next
        })
      } else if (e.key === 'Enter' && focusedRow >= 0) {
        const row = visibleRows[focusedRow]
        if (row) {
          const el = bodyRef.current?.querySelector(`tr[data-row-index="${focusedRow}"]`)
          const interactive = el?.querySelector('a, button:not([role="checkbox"])') as HTMLElement | null
          interactive?.click()
        }
      }
    },
    [focusedRow, visibleRows]
  )

  // Scroll focused row into view
  useEffect(() => {
    if (focusedRow >= 0 && bodyRef.current) {
      const el = bodyRef.current.querySelector(`tr[data-row-index="${focusedRow}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedRow])

  // Reset focused row when page changes
  useEffect(() => {
    setFocusedRow(-1)
  }, [pageIndex])

  // ── Virtualized windowing math ──
  const virtualTotal = virtualActive ? table.getSortedRowModel().rows.length : 0
  const virtualStartIndex = Math.max(
    0,
    Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN
  )
  const virtualEndIndex = Math.min(
    virtualTotal,
    Math.ceil((scrollTop + viewportHeight) / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN
  )
  const virtualRows = virtualActive
    ? table.getSortedRowModel().rows.slice(virtualStartIndex, virtualEndIndex)
    : []
  const topSpacerHeight = virtualStartIndex * VIRTUAL_ROW_HEIGHT
  const bottomSpacerHeight = Math.max(0, (virtualTotal - virtualEndIndex) * VIRTUAL_ROW_HEIGHT)

  // ── CSV export of the current filtered + sorted view ──
  const handleExport = useCallback(() => {
    try {
      const rows = table.getSortedRowModel().rows
      if (rows.length === 0) {
        toast.info('Nothing to export', {
          description: 'The current view has no rows.',
        })
        return
      }
      const headers = table
        .getVisibleLeafColumns()
        .filter((c) => typeof c.columnDef.header === 'string')
        .map((c) => String(c.columnDef.header))

      const escapeCell = (value: unknown): string => {
        const s = value === null || value === undefined ? '' : String(value)
        // Escape CSV specials
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
      }

      const lines = [headers.map(escapeCell).join(',')]
      for (const row of rows) {
        const cells = table
          .getVisibleLeafColumns()
          .map((col) => {
            const val = row.getValue(col.id)
            if (val !== null && typeof val === 'object') return ''
            return val
          })
        lines.push(cells.map(escapeCell).join(','))
      }

      const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${exportFileName ?? 'export'}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Export ready', {
        description: `${rows.length} rows exported to CSV.`,
      })
    } catch {
      toast.error('Export failed', {
        description: 'Could not generate the CSV file.',
      })
    }
  }, [table, exportFileName])

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (value: string) => {
      const size = Number(value)
      table.setPageSize(size)
    },
    [table]
  )

  const clearSelection = useCallback(() => setRowSelection({}), [])
  const isSearchActive = searchKey || globalFilter
  const hasFilters = globalFilter !== '' || columnFilters.length > 0

  // ── Batch edit state ──
  const [batchEditOpen, setBatchEditOpen] = useState(false)

  // ── Infinite scroll: sentinel + IntersectionObserver ──
  const loadMoreRef = useRef<HTMLTableRowElement>(null)
  const loadMoreCbRef = useRef(onLoadMore)
  loadMoreCbRef.current = onLoadMore
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || !hasMore || isFetchingMore || !onLoadMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreCbRef.current?.()
      },
      { root: bodyRef.current, rootMargin: '300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isFetchingMore, onLoadMore, totalRows])



  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar: Search + filters + column visibility + export + page size */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* Search with forge-input-glow */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
            <Input
              placeholder={searchPlaceholder}
              value={
                searchKey
                  ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
                  : globalFilter
              }
              onChange={(e) => {
                const value = e.target.value
                if (searchKey) {
                  table.getColumn(searchKey)?.setFilterValue(value)
                } else {
                  setGlobalFilter(value)
                }
              }}
              className="pl-9 h-9 bg-secondary/50 border-border/40 forge-input-glow placeholder:text-foreground/60"
              aria-label={searchPlaceholder}
            />
            {hasFilters && (
              <button
                onClick={() => {
                  setGlobalFilter('')
                  setColumnFilters([])
                  if (searchKey) table.getColumn(searchKey)?.setFilterValue(undefined)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-foreground/60 hover:bg-white/[0.04] hover:text-foreground/70"
                aria-label="Clear search and filters"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Column visibility menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-border/40 bg-secondary/50 text-xs"
                aria-label="Toggle column visibility"
              >
                <Columns3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 forge-glass-elevated border border-border/30">
              <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide() && column.id !== 'select')
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                      className="text-xs capitalize"
                    >
                      {typeof column.columnDef.header === 'string'
                        ? column.columnDef.header
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* CSV export */}
          {exportFileName && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-border/40 bg-secondary/50 text-xs"
              onClick={handleExport}
              aria-label="Export current view to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
        </div>

        {/* Page Size Selector — Premium Styling (hidden in virtualized mode) */}
        {!virtualActive && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger
                className="h-8 w-[70px] bg-secondary/50 border-border/40 text-xs"
                aria-label="Rows per page"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="forge-glass-elevated border border-border/30">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Bulk action bar — visible when rows are selected */}
      {enableSelection && selectedRows.length > 0 && bulkActions && (
        <div
          className="sticky top-[calc(var(--page-toolbar-h,84px)+0.5rem)] z-10 flex items-center justify-between gap-3 rounded-lg border border-blue-500/25 bg-[#111]/95 px-4 py-2.5 backdrop-blur-xl forge-card-shadow animate-fade-in"
          role="toolbar"
          aria-label="Bulk actions"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500/20 px-2 text-xs font-semibold text-blue-300 tabular-nums">
              {selectedRows.length}
            </span>
            <span className="text-foreground/70">selected</span>
          </div>
          <div className="flex items-center gap-2">
            {batchEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-border/40 bg-secondary/50 text-xs"
                onClick={() => setBatchEditOpen(true)}
              >
                <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Button>
            )}
            {bulkActions(selectedRows, clearSelection)}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-foreground/60 hover:text-foreground"
              onClick={clearSelection}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table — internal scroll with sticky header */}
      <div
        className="overflow-x-auto rounded-lg"
      >
        {isLoading ? (
          <TableSkeleton columnCount={columns.length} />
        ) : totalRows === 0 ? (
          <TableEmpty message={emptyMessage} description={emptyDescription} icon={emptyIcon} />
        ) : (
          <div
            ref={bodyRef}
            className={cn('scrollbar-thin overflow-auto', maxHeight && 'overscroll-contain')}
            style={maxHeight ? { maxHeight } : undefined}
            onKeyDown={handleKeyDown}
            onScroll={virtualActive ? handleBodyScroll : undefined}
            tabIndex={0}
            data-rowcount={totalRows}
            aria-label="Data table"
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-md border-b border-border/40">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b-0 hover:bg-transparent">
                    {enableSelection && (
                      <TableHead className="w-10 pr-0">
                        <Checkbox
                          checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                          }
                          onCheckedChange={(value) =>
                            table.toggleAllPageRowsSelected(Boolean(value))
                          }
                          aria-label="Select all rows on this page"
                        />
                      </TableHead>
                    )}
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-xs font-semibold uppercase tracking-wider text-foreground/55 h-10"
                        aria-sort={
                          header.column.getIsSorted() === 'asc'
                            ? 'ascending'
                            : header.column.getIsSorted() === 'desc'
                              ? 'descending'
                              : undefined
                        }
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? 'flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors'
                                : undefined
                            }
                            onClick={header.column.getToggleSortingHandler()}
                            role={header.column.getCanSort() ? 'button' : undefined}
                            tabIndex={header.column.getCanSort() ? 0 : undefined}
                            onKeyDown={(e) => {
                              if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault()
                                header.column.getToggleSortingHandler()?.(e as unknown as React.MouseEvent)
                              }
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && (
                              <span className="text-foreground/60" aria-hidden="true">
                                {header.column.getIsSorted() === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-blue-400" />
                                ) : header.column.getIsSorted() === 'desc' ? (
                                  <ArrowDown className="h-3 w-3 text-blue-400" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3" />
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {/* Virtualized: top spacer reserves space for rows above the window */}
                {virtualActive && topSpacerHeight > 0 && (
                  <tr aria-hidden="true" style={{ height: topSpacerHeight }}>
                    <td colSpan={columns.length + (enableSelection ? 1 : 0)} style={{ padding: 0, border: 0 }} />
                  </tr>
                )}
                {(virtualActive ? virtualRows : table.getRowModel().rows).map((row, rowIndex) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    data-row-index={virtualActive ? virtualStartIndex + rowIndex : rowIndex}
                    style={virtualActive ? { height: VIRTUAL_ROW_HEIGHT } : undefined}
                    className={cn(
                      'border-b border-border/20 transition-colors duration-150',
                      'hover:bg-secondary/50',
                      focusedRow ===
                        (virtualActive ? virtualStartIndex + rowIndex : rowIndex) &&
                        'ring-1 ring-inset ring-blue-400/30 bg-blue-500/[0.04]'
                    )}
                  >
                    {enableSelection && (
                      <TableCell className="py-3 pr-0">
                        <Checkbox
                          checked={row.getIsSelected()}
                          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
                          aria-label={`Select row ${
                            (virtualActive ? virtualStartIndex : 0) + rowIndex + 1
                          }`}
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* Virtualized: bottom spacer reserves space for rows below the window */}
                {virtualActive && bottomSpacerHeight > 0 && (
                  <tr aria-hidden="true" style={{ height: bottomSpacerHeight }}>
                    <td colSpan={columns.length + (enableSelection ? 1 : 0)} style={{ padding: 0, border: 0 }} />
                  </tr>
                )}
                {/* Infinite scroll: loader row + sentinel row */}
                {hasMore && totalRows > 0 && (
                  <tr
                    ref={loadMoreRef}
                    aria-hidden={isFetchingMore ? undefined : true}
                    className="border-b-0"
                  >
                    <td
                      colSpan={columns.length + (enableSelection ? 1 : 0)}
                      className="py-3 text-center"
                    >
                      {isFetchingMore ? (
                        <span className="inline-flex items-center gap-2 text-xs text-foreground/60" role="status">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Loading more…
                        </span>
                      ) : (
                        <span className="text-xs text-foreground/30">Scroll for more</span>
                      )}
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Keyboard hint + Pagination (hidden in virtualized mode — all rows scroll) */}
      {!isLoading && totalRows > 0 && !virtualActive && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{rowStart}</span>
            {'\u2013'}
            <span className="font-medium text-foreground">{rowEnd}</span> of{' '}
            <span className="font-medium text-foreground">{totalRows}</span> results
            <span className="ml-2 hidden text-foreground/60 lg:inline">
              · ↑↓ navigate rows
            </span>
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs text-muted-foreground tabular-nums">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Virtualized mode: row count summary instead of pagination */}
      {!isLoading && virtualActive && totalRows > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{totalRows}</span> rows · scroll to browse ·{' '}
          <span className="hidden text-foreground/60 lg:inline">↑↓ navigate rows · virtualized rendering</span>
        </p>
      )}

      {/* Batch edit dialog */}
      {batchEdit && (
        <BatchEditDialog
          open={batchEditOpen}
          onOpenChange={setBatchEditOpen}
          count={selectedRows.length}
          config={batchEdit}
          selectedRows={selectedRows}
          onDone={clearSelection}
        />
      )}
    </div>
  )
}
