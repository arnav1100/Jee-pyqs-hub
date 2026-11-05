'use client'

import { useMemo } from 'react'
import { Lightbulb, ListChecks } from 'lucide-react'
import MathText from './MathText'

/**
 * Splits a solution string into a hint and readable solution steps.
 *
 * The question bank stores hint + solution in one field, e.g.
 * "💡 Hint: … // 📝 Solution: … Step 2 …". This parser pulls them apart and
 * breaks the solution into steps/sentences. LaTeX is tokenised first, so a
 * split never happens inside a math expression ("$\;=\;$", "2.5",
 * "$\frac{a}{b}$" stay whole) — only the plain-text gaps are cut.
 */
interface Span {
  math: boolean
  value: string
}

function tokenize(text: string): Span[] {
  const spans: Span[] = []
  let buffer = ''
  let i = 0
  const pushText = () => {
    if (buffer) {
      spans.push({ math: false, value: buffer })
      buffer = ''
    }
  }

  while (i < text.length) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '$' && next === '$') {
      const end = text.indexOf('$$', i + 2)
      if (end > 0) {
        pushText()
        spans.push({ math: true, value: text.slice(i, end + 2) })
        i = end + 2
        continue
      }
    }
    if (char === '$') {
      const end = text.indexOf('$', i + 1)
      if (end > 0 && end > i + 1) {
        pushText()
        spans.push({ math: true, value: text.slice(i, end + 1) })
        i = end + 1
        continue
      }
    }
    if (char === '\\' && (next === '(' || next === '[')) {
      const close = next === '(' ? '\\)' : '\\]'
      const end = text.indexOf(close, i + 2)
      if (end > 0) {
        pushText()
        spans.push({ math: true, value: text.slice(i, end + 2) })
        i = end + 2
        continue
      }
    }

    buffer += char
    i += 1
  }
  pushText()
  return spans
}

const ARROW_ONLY = /^\$?\s*(?:\\(?:implies|Rightarrow|Longrightarrow|rightarrow|to|therefore)|⟹|⇒|→|∴)\s*\$?$/
const SEPARATOR = /(?:\s*\/\/\s*|\s*(?:📝|📌|✅)?\s*solution\s*:\s*|\s*\bstep\s*\d+\s*[:.)-]?\s*)/i
const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[A-Z0-9$\\“(])/

function cleanLine(line: string) {
  return line
    .replace(/^\s*(?:💡|📝|📌|✅|➡️|→|[-•*])\s*/u, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;])/g, '$1')
    .trim()
}

function hasContent(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').length > 1
}

export function parseSolution(raw: string): { hint: string; steps: string[] } {
  const text = (raw || '').replace(/\r/g, ' ').replace(/\s{2,}/g, ' ').trim()
  if (!text) return { hint: '', steps: [] }

  let hint = ''
  let rest = text

  const hintMatch = text.match(/(?:💡\s*)?\bhint\s*:\s*/i)
  if (hintMatch && hintMatch.index !== undefined) {
    const afterHint = text.slice(hintMatch.index + hintMatch[0].length)
    const solutionStart = afterHint.search(/(?:\/\/\s*|\b(?:📝|📌|✅)?\s*solution\s*:\s*)/i)
    if (solutionStart >= 0) {
      hint = cleanLine(afterHint.slice(0, solutionStart))
      rest = afterHint.slice(solutionStart).replace(/^(?:\s*\/\/\s*|\s*(?:📝|📌|✅)?\s*solution\s*:\s*)/i, '')
    } else {
      hint = cleanLine(afterHint)
      rest = ''
    }
  }

  const steps: string[] = []
  let current = ''
  const flush = () => {
    const line = cleanLine(current)
    if (hasContent(line)) steps.push(line)
    current = ''
  }

  tokenize(rest).forEach((span) => {
    if (span.math) {
      const value = span.value.trim()
      if (ARROW_ONLY.test(value)) {
        flush()
        return
      }
      current += value
      return
    }

    span.value.split(SEPARATOR).forEach((piece, pieceIndex) => {
      if (pieceIndex > 0) flush()
      piece.split(SENTENCE_BREAK).forEach((sentence, sentenceIndex) => {
        if (sentenceIndex > 0) flush()
        current += sentence
      })
    })
  })
  flush()

  return { hint, steps }
}

export default function SolutionText({
  text,
  emptyLabel = 'No detailed solution was provided for this question.',
  tone = 'light',
}: {
  text?: string
  emptyLabel?: string
  tone?: 'light' | 'plain'
}) {
  const { hint, steps } = useMemo(() => parseSolution(text || ''), [text])

  if (!hint && !steps.length) {
    return <p className="text-sm leading-7 text-slate-500">{emptyLabel}</p>
  }

  return (
    <div className="space-y-3">
      {hint && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-800">
            <Lightbulb size={13} /> Hint
          </p>
          <p className="mt-1.5 text-sm leading-7 text-amber-950">
            <MathText as="span" text={hint} />
          </p>
        </div>
      )}

      {steps.length > 0 && (
        <div className={`rounded-xl border p-3.5 ${tone === 'plain' ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-white'}`}>
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
            <ListChecks size={13} /> Solution
          </p>
          <ol className="mt-2 space-y-2.5">
            {steps.map((step, itemIndex) => (
              <li key={`${itemIndex}-${step.slice(0, 12)}`} className="flex gap-2.5">
                {steps.length > 1 && (
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-800">
                    {itemIndex + 1}
                  </span>
                )}
                <span className="min-w-0 text-sm leading-7 text-ink-900">
                  <MathText as="span" text={step} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
