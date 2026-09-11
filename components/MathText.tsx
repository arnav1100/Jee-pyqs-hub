'use client'

/**
 * MathText
 * ----------------------------------------------------------------------
 * Renders a string that may contain a mix of plain text, HTML-safe text,
 * and LaTeX — with or without explicit math delimiters — using KaTeX.
 *
 * Supports:
 *  - Explicit delimiters: \( ... \), \[ ... \], $ ... $, $$ ... $$
 *  - Raw LaTeX with NO delimiters at all, e.g. content pasted straight
 *    from a question bank:
 *      \text{Alcohol} \xrightarrow{\text{H}_3\text{O}^+} \text{Product}
 *    or bare chemistry/math sub/superscripts: H_3O^+, x^2, SO_4^{2-}
 *
 * Design goals:
 *  - Never dangerouslySetInnerHTML anything except KaTeX's own generated
 *    markup (KaTeX output contains no user-controlled tags/attributes
 *    when `trust: false`, so this does not introduce an XSS surface).
 *  - Plain text stays plain text (React text nodes, auto-escaped).
 *  - A malformed expression never breaks the rest of the question
 *    (throwOnError: false + try/catch fallback to raw text).
 *  - Results are memoized/cached so repeated renders of the same string
 *    (e.g. re-render on selecting an option) don't re-run KaTeX.
 * ----------------------------------------------------------------------
 */

import { useMemo } from 'react'
import katex from 'katex'

type Segment =
  | { type: 'text'; content: string }
  | { type: 'inline'; content: string }
  | { type: 'display'; content: string }

// A bare "$...$" pair is ambiguous with currency ("$5 and $10"). If the
// candidate span contains a real LaTeX command it's unambiguously math;
// otherwise, 3+ ordinary English words (length >= 3, letters only) is a
// strong signal it's a sentence fragment, not an equation, so we leave
// the dollar signs as literal text in that case.
function looksLikeProse(candidate: string): boolean {
  if (/\\[a-zA-Z]/.test(candidate)) return false
  const words = candidate.trim().split(/\s+/).filter((w) => /^[a-zA-Z]{3,}$/.test(w))
  return words.length >= 3
}

// ---------------------------------------------------------------------
// 1. Split on explicit delimiters: \[ \], $$ $$, \( \), $ $
// ---------------------------------------------------------------------
function splitOnDelimiters(input: string): Segment[] {
  const segments: Segment[] = []
  let i = 0
  const n = input.length
  let buffer = ''

  const flush = () => {
    if (buffer) {
      segments.push({ type: 'text', content: buffer })
      buffer = ''
    }
  }

  while (i < n) {
    if (input.startsWith('\\[', i)) {
      const end = input.indexOf('\\]', i + 2)
      if (end !== -1) {
        flush()
        segments.push({ type: 'display', content: input.slice(i + 2, end) })
        i = end + 2
        continue
      }
    }
    if (input.startsWith('$$', i)) {
      const end = input.indexOf('$$', i + 2)
      if (end !== -1) {
        flush()
        segments.push({ type: 'display', content: input.slice(i + 2, end) })
        i = end + 2
        continue
      }
    }
    if (input.startsWith('\\(', i)) {
      const end = input.indexOf('\\)', i + 2)
      if (end !== -1) {
        flush()
        segments.push({ type: 'inline', content: input.slice(i + 2, end) })
        i = end + 2
        continue
      }
    }
    if (input[i] === '$' && input[i + 1] !== '$') {
      const end = input.indexOf('$', i + 1)
      const candidate = end !== -1 ? input.slice(i + 1, end) : ''
      // Guard against a pair of stray "$" used as currency, e.g.
      // "$5 and $10" — only treat as math if the span doesn't read like
      // an ordinary English sentence (a LaTeX command always overrides
      // this check, since real prose never contains one).
      if (end !== -1 && !candidate.includes('\n\n') && !looksLikeProse(candidate)) {
        flush()
        segments.push({ type: 'inline', content: candidate })
        i = end + 1
        continue
      }
    }
    buffer += input[i]
    i++
  }
  flush()
  return segments
}

// ---------------------------------------------------------------------
// 2. Within plain-text segments, auto-detect raw (undelimited) LaTeX:
//    backslash commands (\text{...}, \frac{a}{b}, \xrightarrow{...},
//    \alpha, \sum, environments like \begin{matrix}...\end{matrix})
//    and bare sub/superscript chemistry-or-math atoms (H_3O^+, x^2).
// ---------------------------------------------------------------------
function readBalancedBraces(text: string, openIdx: number, open: string, close: string): number {
  let depth = 0
  let j = openIdx
  const n = text.length
  while (j < n) {
    if (text[j] === open) depth++
    else if (text[j] === close) {
      depth--
      if (depth === 0) return j + 1
    }
    j++
  }
  return n
}

function readCommandAtom(text: string, idx: number): number {
  const n = text.length
  let j = idx + 1
  while (j < n && /[a-zA-Z]/.test(text[j])) j++
  const cmdName = text.slice(idx + 1, j)
  if (j === idx + 1) return idx // "\" not followed by a letter — not a real command

  if (cmdName === 'begin') {
    if (text[j] === '{') {
      const braceEnd = readBalancedBraces(text, j, '{', '}')
      const envName = text.slice(j + 1, braceEnd - 1)
      const endMarker = `\\end{${envName}}`
      const endIdx = text.indexOf(endMarker, braceEnd)
      if (endIdx !== -1) return endIdx + endMarker.length
      return braceEnd
    }
    return j
  }

  // Consume any immediately-following [optional] and {required} groups,
  // plus ^ / _ scripts, e.g. \sqrt[3]{x}, \xrightarrow{\text{H}_3O^+}
  let progressed = true
  while (progressed) {
    progressed = false
    if (text[j] === '[') {
      j = readBalancedBraces(text, j, '[', ']')
      progressed = true
      continue
    }
    if (text[j] === '{') {
      j = readBalancedBraces(text, j, '{', '}')
      progressed = true
      continue
    }
    if (text[j] === '^' || text[j] === '_') {
      j++
      if (text[j] === '{') j = readBalancedBraces(text, j, '{', '}')
      else if (j < n) j++
      progressed = true
      continue
    }
  }
  return j
}

// Bare chemistry/math atom with no leading backslash, e.g. H_3O, x^2,
// SO_4^{2-}, Ca^{2+}. Only matches if it actually has a _ or ^ script —
// this avoids swallowing ordinary words like "A" or "the".
function readChemAtom(text: string, idx: number): number {
  const n = text.length
  let j = idx
  while (j < n && /[A-Za-z0-9]/.test(text[j])) j++
  if (j === idx) return idx
  let matched = false
  let k = j
  while (k < n && (text[k] === '_' || text[k] === '^')) {
    matched = true
    k++
    if (text[k] === '{') k = readBalancedBraces(text, k, '{', '}')
    else if (k < n && /[A-Za-z0-9+\-]/.test(text[k])) k++
  }
  return matched ? k : idx
}

function readAtom(text: string, idx: number): number {
  if (text[idx] === '\\' && /[a-zA-Z]/.test(text[idx + 1] || '')) {
    return readCommandAtom(text, idx)
  }
  return readChemAtom(text, idx)
}

function detectRawLatex(text: string): Segment[] {
  const segments: Segment[] = []
  let i = 0
  const n = text.length
  let buffer = ''

  while (i < n) {
    const end = readAtom(text, i)
    if (end > i) {
      const start = i
      let j = end
      // Greedily chain adjacent atoms (contiguous, or separated by a
      // single space) so a whole expression like
      // "\text{A} \xrightarrow{...} \text{B}" becomes one math run.
      while (true) {
        const noSpaceEnd = readAtom(text, j)
        if (noSpaceEnd > j) {
          j = noSpaceEnd
          continue
        }
        if (text[j] === ' ') {
          const afterSpaceEnd = readAtom(text, j + 1)
          if (afterSpaceEnd > j + 1) {
            j = afterSpaceEnd
            continue
          }
        }
        break
      }
      if (buffer) {
        segments.push({ type: 'text', content: buffer })
        buffer = ''
      }
      segments.push({ type: 'inline', content: text.slice(start, j).trim() })
      i = j
      continue
    }
    buffer += text[i]
    i++
  }
  if (buffer) segments.push({ type: 'text', content: buffer })
  return segments
}

function parseSegments(input: string): Segment[] {
  if (!input) return []
  const delimited = splitOnDelimiters(input)
  const out: Segment[] = []
  for (const seg of delimited) {
    if (seg.type === 'text') {
      out.push(...detectRawLatex(seg.content))
    } else {
      out.push(seg)
    }
  }
  return out
}

// ---------------------------------------------------------------------
// 3. Render each math segment via KaTeX, with a small render cache so
//    identical expressions (very common across a question bank, e.g.
//    "H_2O") aren't re-parsed by KaTeX on every re-render.
// ---------------------------------------------------------------------
const renderCache = new Map<string, string>()
const MAX_CACHE = 1000

const KATEX_MACROS = {
  '\\degree': '^{\\circ}',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderMath(tex: string, displayMode: boolean): string {
  const key = `${displayMode ? 'D' : 'I'}::${tex}`
  const cached = renderCache.get(key)
  if (cached !== undefined) return cached

  let html: string
  try {
    html = katex.renderToString(tex, {
      throwOnError: false,
      displayMode,
      strict: 'ignore',
      trust: false,
      macros: KATEX_MACROS,
      output: 'htmlAndMathml',
    })
  } catch {
    // Should essentially never happen with throwOnError: false, but
    // guarantees a single bad expression can never take down the page.
    html = `<span class="text-inherit">${escapeHtml(tex)}</span>`
  }

  if (renderCache.size >= MAX_CACHE) renderCache.clear()
  renderCache.set(key, html)
  return html
}

// ---------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------
interface MathTextProps {
  text: string | undefined | null
  /** Element to wrap the whole run in. Defaults to a <span> so this is
   *  always safe to drop inside a <p>, <span>, or button label. */
  as?: 'span' | 'p'
  className?: string
}

export default function MathText({ text, as = 'span', className }: MathTextProps) {
  const segments = useMemo(() => parseSegments(text || ''), [text])

  if (!text) return null

  const Wrapper = as
  return (
    <Wrapper className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          // Preserve manual line breaks in plain text without touching
          // any surrounding math.
          const lines = seg.content.split('\n')
          return (
            <span key={idx}>
              {lines.map((line, li) => (
                <span key={li}>
                  {line}
                  {li < lines.length - 1 && <br />}
                </span>
              ))}
            </span>
          )
        }
        const displayMode = seg.type === 'display'
        const html = renderMath(seg.content, displayMode)
        return (
          <span
            key={idx}
            className={displayMode ? 'block max-w-full overflow-x-auto py-1 align-middle' : 'max-w-full overflow-x-auto align-middle inline-block'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      })}
    </Wrapper>
  )
}
