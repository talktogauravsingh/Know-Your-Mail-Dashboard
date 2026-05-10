import React from 'react';
import { FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { cn } from '../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Internal building blocks
// ─────────────────────────────────────────────────────────────────────────────

/** A single stat card skeleton — mirrors the real StatCard layout below. */
const StatCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-7 w-7 rounded-full" />
    </div>
    <Skeleton className="h-8 w-16 rounded-md" />
    <Skeleton className="h-2.5 w-32 rounded-full" />
  </div>
);

/** Table header + N placeholder rows skeleton. */
const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
    {/* thead */}
    <div className="grid bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-3/4 rounded-full" />
      ))}
    </div>
    {/* tbody rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={rowIdx}
        className={cn(
          'grid px-4 py-3.5 gap-4 border-b border-slate-100 dark:border-slate-800/60 last:border-0',
          rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30'
        )}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, colIdx) => (
          <Skeleton
            key={colIdx}
            // Vary widths so it reads as realistic data, not a grid of identical bars
            className={cn('h-3 rounded-full', colIdx === 0 ? 'w-5/6' : 'w-2/3')}
            style={{ animationDelay: `${(rowIdx * cols + colIdx) * 40}ms` }}
          />
        ))}
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CsvPreviewSkeleton — main export for the loading state
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CsvPreviewSkeleton
 *
 * Drop this in immediately after the user selects a CSV file while waiting
 * for the API to respond. Replace it with <CsvPreviewResult /> once done.
 *
 * Props:
 *   fileName   {string}  — original file name to show in the header (optional)
 *   statCards  {number}  — how many stat card skeletons to render (default: 3)
 *   tableRows  {number}  — skeleton table rows (default: 5)
 *   tableCols  {number}  — skeleton table columns (default: 4)
 */
export function CsvPreviewSkeleton({
  fileName,
  statCards = 3,
  tableRows = 5,
  tableCols = 4,
}) {
  return (
    <section
      aria-label="Loading CSV preview"
      aria-busy="true"
      className="space-y-5 animate-in fade-in duration-300"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-4 flex items-center gap-4">
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
          <FileText className="h-5 w-5 text-emerald-400 dark:text-emerald-500" />
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          {fileName ? (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{fileName}</p>
          ) : (
            <Skeleton className="h-3.5 w-48" />
          )}
          <Skeleton className="h-2.5 w-36 rounded-full" />
        </div>
        {/* Animated status pill */}
        <div className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          Processing…
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────── */}
      <div
        className={`grid gap-4`}
        style={{ gridTemplateColumns: `repeat(${statCards}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: statCards }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* ── Table preview ──────────────────────────────────────── */}
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-32 rounded-full" />
        <TableSkeleton rows={tableRows} cols={tableCols} />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard — real data card (mirrors StatCardSkeleton layout)
// ─────────────────────────────────────────────────────────────────────────────

const STAT_VARIANTS = {
  total:   { icon: FileText,       bg: 'bg-emerald-50 dark:bg-emerald-900/20',  icon_color: 'text-emerald-600 dark:text-emerald-400',  label_color: 'text-emerald-600 dark:text-emerald-400' },
  valid:   { icon: CheckCircle2,   bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon_color: 'text-emerald-600 dark:text-emerald-400', label_color: 'text-emerald-600 dark:text-emerald-400' },
  invalid: { icon: XCircle,        bg: 'bg-red-50 dark:bg-red-900/20',         icon_color: 'text-red-600 dark:text-red-400',         label_color: 'text-red-600 dark:text-red-400' },
  warning: { icon: AlertCircle,    bg: 'bg-amber-50 dark:bg-amber-900/20',     icon_color: 'text-amber-600 dark:text-amber-400',     label_color: 'text-amber-600 dark:text-amber-400' },
};

/**
 * StatCard — a real summary card for valid, invalid, total rows, etc.
 *
 * Props:
 *   variant  {'total'|'valid'|'invalid'|'warning'}
 *   label    {string}
 *   value    {number|string}
 *   subtext  {string}  — optional small description
 */
export function StatCard({ variant = 'total', label, value, subtext }) {
  const v = STAT_VARIANTS[variant] ?? STAT_VARIANTS.total;
  const Icon = v.icon;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 flex flex-col gap-3 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <div className={cn('flex items-center justify-center h-7 w-7 rounded-full', v.bg)}>
          <Icon className={cn('h-4 w-4', v.icon_color)} />
        </div>
      </div>
      <p className={cn('text-3xl font-bold tracking-tight', v.label_color)}>{value}</p>
      {subtext && <p className="text-xs text-slate-400 dark:text-slate-500">{subtext}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CsvPreviewResult — real data view (replaces skeleton after processing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CsvPreviewResult
 *
 * Renders after processing completes. Accepts the API response payload
 * directly and transitions in with a fade animation.
 *
 * Expected `result` shape:
 * {
 *   fileName: string,
 *   totalRows: number,
 *   validRows: number,
 *   invalidRows: number,
 *   headers: string[],
 *   rows: Record<string, string>[],  // first N rows for preview
 *   errors?: { row: number; message: string }[],
 * }
 */
export function CsvPreviewResult({ result }) {
  const { fileName, totalRows, validRows, invalidRows, headers = [], rows = [], errors = [] } = result;

  return (
    <section
      aria-label="CSV preview results"
      className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-950 px-5 py-4 flex items-center gap-4">
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
          <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{fileName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Processing complete · {totalRows} rows scanned</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 flex-shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Complete
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard variant="total"   label="Total Rows"   value={totalRows}   subtext="All records in file" />
        <StatCard variant="valid"   label="Valid Rows"   value={validRows}   subtext="Ready for import" />
        <StatCard variant="invalid" label="Invalid Rows" value={invalidRows} subtext={invalidRows > 0 ? 'See errors below' : 'No issues found'} />
      </div>

      {/* ── Validation errors ─────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 space-y-2">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Validation Errors
          </p>
          <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {errors.map((e, i) => (
              <li key={i} className="text-xs text-red-600 dark:text-red-400 flex gap-2">
                <span className="font-mono font-bold shrink-0">Row {e.row}:</span>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Table preview ──────────────────────────────────────── */}
      {headers.length > 0 && rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Data Preview · first {rows.length} rows
          </p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto">
            <table className="min-w-full text-sm" role="table">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {headers.map(h => (
                    <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={cn(
                      'transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50',
                      rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30'
                    )}
                  >
                    {headers.map(h => (
                      <td key={h} className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap font-mono text-xs">
                        {row[h] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CsvPreviewError — error state
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CsvPreviewError
 *
 * Shown when the upload or processing API call fails entirely.
 *
 * Props:
 *   message  {string}   — human-readable error description
 *   onRetry  {Function} — callback to reset and try again
 */
export function CsvPreviewError({ message, onRetry }) {
  return (
    <section
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-950 px-5 py-8 flex flex-col items-center gap-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
        <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">Processing Failed</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
        >
          Try uploading again
        </button>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CsvPreviewPanel — top-level orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CsvPreviewPanel
 *
 * Orchestrates which state to show — skeleton, result, or error — based on
 * the `status` prop. This is the only component you need to import in a page.
 *
 * Props:
 *   status    {'idle'|'loading'|'success'|'error'}
 *   fileName  {string}          — from file input (shown in skeleton + result header)
 *   result    {object|null}     — API response payload, required when status === 'success'
 *   error     {string|null}     — error message, required when status === 'error'
 *   onRetry   {Function}        — callback to reset the upload state
 *
 * Usage in CreateCampaign.jsx:
 *
 *   <CsvPreviewPanel
 *     status={uploadStatus}         // 'idle' | 'loading' | 'success' | 'error'
 *     fileName={selectedFile?.name}
 *     result={csvResult}
 *     error={errorMessage}
 *     onRetry={() => setUploadStatus('idle')}
 *   />
 */
export function CsvPreviewPanel({ status, fileName, result, error, onRetry }) {
  if (status === 'idle') return null;

  return (
    <div className="mt-6">
      {status === 'loading' && (
        <CsvPreviewSkeleton fileName={fileName} />
      )}
      {status === 'success' && result && (
        <CsvPreviewResult result={result} />
      )}
      {status === 'error' && (
        <CsvPreviewError message={error ?? 'An unknown error occurred.'} onRetry={onRetry} />
      )}
    </div>
  );
}
