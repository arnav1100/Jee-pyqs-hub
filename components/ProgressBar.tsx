export default function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className="px-4">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>Progress</span>
        <span className="font-medium text-ink-800">
          {value}/{total} answered
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
