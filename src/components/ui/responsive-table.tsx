'use client';

import React, { useMemo } from 'react';
import { useIsMobile, useIsTablet } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ColumnPriority = 'critical' | 'normal' | 'optional';

export interface ResponsiveTableColumn<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (_value: unknown, _row: T) => React.ReactNode;
  priority?: ColumnPriority;
  className?: string;
  /** Minimum breakpoint at which this column is shown */
  showAbove?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface ResponsiveTableProps<T = Record<string, unknown>> {
  columns: ResponsiveTableColumn<T>[];
  data: T[];
  keyExtractor: (_row: T) => string;
  /** Enable horizontal scroll on medium screens (default: true) */
  enableHorizontalScroll?: boolean;
  /** Enable sticky header (default: true) */
  stickyHeader?: boolean;
  /** Custom card renderer for mobile. If not provided, default card is used */
  mobileCardRender?: (_row: T, _columns: ResponsiveTableColumn<T>[]) => React.ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional class names for the container */
  className?: string;
  /** Row click handler */
  onRowClick?: (_row: T) => void;
  /** Striped rows */
  striped?: boolean;
}

// ─── Default Mobile Card ─────────────────────────────────────────────────────

function DefaultMobileCard<T extends Record<string, unknown>>({
  row,
  columns,
  onRowClick,
}: {
  row: T;
  columns: ResponsiveTableColumn<T>[];
  onRowClick?: (_row: T) => void;
}) {
  const visibleColumns = columns.filter(
    (col) => col.priority !== 'optional'
  );

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 shadow-sm',
        onRowClick && 'cursor-pointer hover:bg-accent/50 transition-colors'
      )}
      onClick={() => onRowClick?.(row)}
      role={onRowClick ? 'button' : undefined}
      tabIndex={onRowClick ? 0 : undefined}
    >
      <div className="space-y-2">
        {visibleColumns.map((col) => {
          const value = row[col.key];
          return (
            <div key={col.key} className="flex justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground shrink-0">
                {col.header}
              </span>
              <span className={cn('text-sm text-right', col.className)}>
                {col.render ? col.render(value, row) : String(value ?? '—')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ResponsiveTable Component ───────────────────────────────────────────────

export function ResponsiveTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  enableHorizontalScroll = true,
  stickyHeader = true,
  mobileCardRender,
  emptyMessage = 'No data available',
  className,
  onRowClick,
  striped = false,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Filter columns based on breakpoint and priority
  const visibleColumns = useMemo(() => {
    if (isMobile) {
      return columns.filter((col) => col.priority !== 'optional');
    }
    if (isTablet) {
      return columns.filter((col) => col.priority === 'critical' || col.priority === 'normal');
    }
    return columns;
  }, [columns, isMobile, isTablet]);

  // ─── Mobile: Card Layout ──────────────────────────────────────────────
  if (isMobile) {
    if (data.length === 0) {
      return (
        <div className={cn('text-center text-muted-foreground py-8', className)}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className={cn('space-y-3', className)}>
        {data.map((row) => (
          <React.Fragment key={keyExtractor(row)}>
            {mobileCardRender ? (
              mobileCardRender(row, visibleColumns)
            ) : (
              <DefaultMobileCard row={row} columns={visibleColumns} onRowClick={onRowClick} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // ─── Desktop/Tablet: Table Layout ─────────────────────────────────────
  if (data.length === 0) {
    return (
      <div className={cn('text-center text-muted-foreground py-8', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-full',
        enableHorizontalScroll && 'overflow-x-auto',
        className
      )}
    >
      <table className="w-full caption-bottom text-sm">
        <thead
          className={cn(
            '[&_tr]:border-b',
            stickyHeader && 'sticky top-0 z-10 bg-background'
          )}
        >
          <tr>
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
                  '[&:has([role=checkbox])]:pr-0',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.map((row, rowIndex) => (
            <tr
              key={keyExtractor(row)}
              className={cn(
                'border-b transition-colors hover:bg-muted/50',
                striped && rowIndex % 2 === 1 && 'bg-muted/30',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {visibleColumns.map((col) => {
                const value = row[col.key];
                return (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 align-middle',
                      col.className
                    )}
                  >
                    {col.render ? col.render(value, row) : String(value ?? '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
