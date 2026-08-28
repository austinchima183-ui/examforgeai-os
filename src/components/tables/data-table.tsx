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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const bodyRef = useRef<HTMLDivElement>(null)
  const [focusedRow, setFocusedRow] = useState(-1)

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
  const visibleRows = table.getRowModel().rows
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

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar: Search + filters + column visibility + export + page size */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* Search with forge-input-glow */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
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
              className="pl-9 h-9 bg-secondary/50 border-border/40 forge-input-glow placeholder:text-foreground/35"
              aria-label={searchPlaceholder}
            />
            {hasFilters && (
              <button
                onClick={() => {
                  setGlobalFilter('')
                  setColumnFilters([])
                  if (searchKey) table.getColumn(searchKey)?.setFilterValue(undefined)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-foreground/40 hover:bg-white/[0.04] hover:text-foreground/70"
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

        {/* Page Size Selector — Premium Styling */}
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
            {bulkActions(selectedRows, clearSelection)}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-foreground/50 hover:text-foreground"
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
            tabIndex={0}
            role="grid"
            aria-rowcount={totalRows}
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
                              <span className="text-foreground/35" aria-hidden="true">
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
                {table.getRowModel().rows.map((row, rowIndex) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    data-row-index={rowIndex}
                    className={cn(
                      'border-b border-border/20 transition-colors duration-150',
                      'hover:bg-secondary/50',
                      focusedRow === rowIndex && 'ring-1 ring-inset ring-blue-400/30 bg-blue-500/[0.04]'
                    )}
                  >
                    {enableSelection && (
                      <TableCell className="py-3 pr-0">
                        <Checkbox
                          checked={row.getIsSelected()}
                          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
                          aria-label={`Select row ${rowIndex + 1}`}
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
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Keyboard hint + Pagination */}
      {!isLoading && totalRows > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{rowStart}</span>
            {'\u2013'}
            <span className="font-medium text-foreground">{rowEnd}</span> of{' '}
            <span className="font-medium text-foreground">{totalRows}</span> results
            <span className="ml-2 hidden text-foreground/30 lg:inline">
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
    </div>
  )
}
