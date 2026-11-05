'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileJson, Globe2, Loader2, UploadCloud } from 'lucide-react'
import { useAdminSubjects, exportQuestionDatabase, importQuestionDatabase, type BulkImportError } from '@/lib/admin-data'

export default function GlobalSyncManager() {
  const { subjects } = useAdminSubjects()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: BulkImportError[] } | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function downloadQuestionBundle() {
    setExporting(true)
    setError('')
    setMessage('')
    try {
      const bundle = await exportQuestionDatabase()
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'questions.json'
      anchor.click()
      URL.revokeObjectURL(url)
      setMessage(`Exported ${bundle.questions.length.toLocaleString()} unique question records. Add the downloaded file at public/questions.json and push it to GitHub to publish the static copy.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export the question database. Check Firebase access and try again.')
    } finally {
      setExporting(false)
    }
  }

  async function importJson(file: File) {
    setImporting(true)
    setResult(null)
    setError('')
    try {
      const payload = JSON.parse(await file.text())
      const response = await importQuestionDatabase(payload, subjects, (done, total) => setProgress({ done, total }))
      setResult(response)
      if (response.errors.length) setError('Some rows could not be imported. Existing records were left unchanged.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON or import failed.')
    } finally {
      setImporting(false)
      setProgress(null)
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-card">
        <div className="bg-gradient-to-r from-[#0f766e] to-[#39b98f] p-5 text-white sm:p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Globe2 size={22} className="text-cyan-200" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-blue-100">Global device sync</p><h2 className="mt-0.5 font-display text-xl font-bold">Make the question bank available everywhere</h2></div></div><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Export the current Firestore questions plus any supported browser-stored question records into a static JSON file. Committing that file to GitHub lets Vercel serve the same question bank to every device, without relying on a student&apos;s local storage.</p></div>
        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"><div><p className="font-bold text-ink-900">Download questions.json</p><p className="mt-1 text-xs leading-5 text-slate-500">The export is additive and read-only: it does not change Firestore or clear any localStorage key. The file includes a sync timestamp used to load only newer Firestore changes afterward.</p></div><button onClick={downloadQuestionBundle} disabled={exporting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">{exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {exporting ? 'Preparing export…' : '🌍 Download questions.json'}</button></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><FileJson size={19} /></span><div><h2 className="font-display text-lg font-bold text-ink-900">Publish it on all devices</h2><ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-6 text-slate-600"><li>Download <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">questions.json</code> above.</li><li>In your GitHub repository, replace <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">public/questions.json</code> with the downloaded file.</li><li>Commit and push to the connected branch. Vercel deploys the updated static question bank.</li></ol><p className="mt-3 text-xs leading-5 text-slate-500">The public site merges this repository file with new Firestore records and legacy localStorage question records. Student answers, bookmarks and mistakes remain in their separate storage keys.</p></div></div></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-lg font-bold text-ink-900">Merge a JSON question file</h2><p className="mt-1 text-sm text-slate-500">Imports are additive only. Matching question text in the same exam, year and shift is skipped; existing records are never replaced or deleted.</p></div><UploadCloud size={20} className="shrink-0 text-brand-600" /></div><label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-7 text-sm font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-700">{importing ? <Loader2 size={20} className="animate-spin" /> : <FileJson size={20} />}{importing ? 'Merging questions…' : 'Choose a .json question export'}<input type="file" accept="application/json,.json" className="hidden" disabled={importing} onChange={(event) => { const file = event.target.files?.[0]; if (file) void importJson(file); event.target.value = '' }} /></label>{progress && <div className="mt-3"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} /></div><p className="mt-1 text-xs text-slate-500">{progress.done} / {progress.total} processed</p></div>}{result && <div className="mt-4 rounded-xl border border-slate-200 p-3"><p className="flex items-center gap-2 text-sm font-bold text-ink-900">{result.errors.length ? <AlertTriangle size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-emerald-600" />}Imported {result.imported}; skipped duplicates {result.duplicates}; errors {result.errors.length}</p>{result.errors.length > 0 && <div className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-slate-500">{result.errors.map((item, index) => <p key={`${item.row}-${index}`}>Row {item.row}: {item.message}</p>)}</div>}</div>}{message && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">{message}</p>}{error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-800">{error}</p>}</section>
    </div>
  )
}
