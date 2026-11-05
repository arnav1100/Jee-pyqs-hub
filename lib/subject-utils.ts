export const CORE_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'] as const

export type CoreSubject = (typeof CORE_SUBJECTS)[number]

/**
 * Collapses the many ways a subject can be written ("Maths", "math", "Mathematics")
 * into one stable key so questions never disappear behind a naming mismatch.
 */
export function subjectKey(name: string): string {
  const text = (name || '').trim().toLowerCase()
  if (!text) return ''
  if (text.startsWith('phy')) return 'physics'
  if (text.startsWith('chem')) return 'chemistry'
  if (text.startsWith('math')) return 'mathematics'
  return text.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function displaySubject(name: string): string {
  const key = subjectKey(name)
  if (key === 'physics') return 'Physics'
  if (key === 'chemistry') return 'Chemistry'
  if (key === 'mathematics') return 'Mathematics'
  return (name || '').trim()
}

export function sameSubject(left: string, right: string): boolean {
  return Boolean(subjectKey(left)) && subjectKey(left) === subjectKey(right)
}

export function chapterKey(name: string): string {
  return (name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Unique chapter names (case/symbol tolerant) for a set of questions. */
export function uniqueChapters(names: string[]): string[] {
  const map = new Map<string, string>()
  names.forEach((name) => {
    const clean = (name || '').trim()
    if (!clean) return
    const key = chapterKey(clean)
    if (!map.has(key)) map.set(key, clean)
  })
  return [...map.values()].sort((a, b) => a.localeCompare(b))
}

export function sameChapter(left: string, right: string): boolean {
  return Boolean(chapterKey(left)) && chapterKey(left) === chapterKey(right)
}
