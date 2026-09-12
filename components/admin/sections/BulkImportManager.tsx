'use client'

import { useState } from 'react'
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAdminSubjects, bulkImportQuestions, type BulkQuestionRow, type BulkImportError } from '@/lib/admin-data'

const TEMPLATE_HEADERS = [
  'Subject',
  'Chapter',
  'Question',
  'Option A',
  'Option B',
  'Option C',
  'Option D',
  'Correct (A/B/C/D)',
  'Solution',
  'Difficulty (Easy/Moderate/Difficult)',
  'Exam (JEE Main/JEE Advanced)',
  'Year',
  'Shift',
  'Topic',
]

function downloadTemplate() {
  const example = [
    'Chemistry',
    'Alcohols, Phenols and Ethers',
    "\\text{Compound with Alcohol and Double bond} \\xrightarrow{\\text{H}_3\\text{O}^+} \\text{'B' (major)}",
    'Option A text',
    'Option B text',
    'Option C text',
    'Option D text',
    'A',
    'Explain the answer here',
    'Easy',
    'JEE Main',
    2024,
    'Shift 1',
    'Reactions of Alcohols',
  ]
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, example])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Questions')
  XLSX.writeFile(wb, 'question-import-template.xlsx')
}

function parseRows(raw: any[]): BulkQuestionRow[] {
  return raw.map((r) => ({
    subjectName: String(r['Subject'] ?? '').trim(),
    chapterName: String(r['Chapter'] ?? '').trim(),
    text: String(r['Question'] ?? '').trim(),
    optionA: String(r['Option A'] ?? '').trim(),
    optionB: String(r['Option B'] ?? '').trim(),
    optionC: String(r['Option C'] ?? '').trim(),
    optionD: String(r['Option D'] ?? '').trim(),
    correct: String(r['Correct (A/B/C/D)'] ?? '').trim().toUpperCase() as 'A' | 'B' | 'C' | 'D',
    solution: String(r['Solution'] ?? '').trim(),
    difficulty: String(r['Difficulty (Easy/Moderate/Difficult)'] ?? '').trim() as any,
    examType: String(r['Exam (JEE Main/JEE Advanced)'] ?? '').trim() as any,
    year: Number(r['Year']) || new Date().getFullYear(),
    shift: String(r['Shift'] ?? '').trim(),
    topic: String(r['Topic'] ?? '').trim(),
  }))
}

export default function BulkImportManager() {
  const { subjects } = useAdminSubjects()
  const [rows, setRows] = useState<BulkQuestionRow[]>([])
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ imported: number; errors: BulkImportError[] } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setParsing(true)
    setParseError(null)
    setResult(null)
    setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const parsed = parseRows(raw)
      setRows(parsed)
    } catch (err: any) {
      setParseError('Could not read that file. Make sure it is a .xlsx or .csv file saved from the template.')
      setRows([])
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    setImporting(true)
    setProgress({ done: 0, total: rows.length })
    setResult(null)
    try {
      const res = await bulkImportQuestions(rows, subjects, (done, total) => setProgress({ done, total }))
      setResult(res)
      if (res.errors.length === 0) {
        setRows([])
        setFileName('')
      }
    } catch (err: any) {
      setResult({ imported: 0, errors: [{ row: 0, message: err?.message || 'Import failed unexpectedly.' }] })
    } finally {
      setImporting(false)
      setProgress(null)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-display text-sm font-bold text-ink-900">1. Download the template</h3>
        <p className="mt-1 text-sm text-slate-500">
          Fill your questions into this spreadsheet — one row per question. The Subject and Chapter names
          must match what's already in the app (a new Chapter will be created automatically if it doesn't exist yet).
        </p>
        <button
          onClick={downloadTemplate}
          className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-800 hover:bg-slate-50"
        >
          <Download size={16} /> Download Excel template
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-display text-sm font-bold text-ink-900">2. Upload your filled file</h3>
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-8 text-sm font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600">
          {parsing ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
          {parsing ? 'Reading file…' : fileName || 'Click to choose a .xlsx or .csv file'}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
        </label>
        {parseError && <p className="mt-2 text-xs font-medium text-difficult">{parseError}</p>}
        {rows.length > 0 && !parseError && (
          <p className="mt-2 text-xs text-slate-500">
            Found <span className="font-semibold text-ink-800">{rows.length}</span> question rows in this file.
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-display text-sm font-bold text-ink-900">3. Import</h3>
          <p className="mt-1 text-sm text-slate-500">
            This may take a few minutes for large files. Keep this tab open until it finishes.
          </p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="mt-3 flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {importing && <Loader2 size={16} className="animate-spin" />}
            {importing ? 'Importing…' : `Import ${rows.length} questions`}
          </button>
          {progress && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {progress.done} / {progress.total} imported
              </p>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            {result.errors.length === 0 ? (
              <CheckCircle2 size={18} className="text-green-600" />
            ) : (
              <AlertTriangle size={18} className="text-amber-500" />
            )}
            <h3 className="font-display text-sm font-bold text-ink-900">
              Imported {result.imported} question{result.imported === 1 ? '' : 's'}
              {result.errors.length > 0 && `, ${result.errors.length} row(s) skipped`}
            </h3>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              {result.errors.map((e, i) => (
                <p key={i}>
                  <span className="font-semibold">Row {e.row}:</span> {e.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}