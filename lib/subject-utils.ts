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

/**
 * Chapter names arrive from different imports, so the same chapter can appear
 * twice: "Complex Number" / "Complex Numbers", "Permutation Combination" /
 * "Permutation and Combination", "Chemical Bonding" / "Chemical Bonding and
 * Molecular Structure". chapterKey() folds those into one key so lists, tests
 * and bookmarks all treat them as a single chapter.
 */
const CHAPTER_ALIASES: Record<string, string> = {
  // Physics
  dualnatureofmatterradiation: 'dualnatureofmatter',
  unitsdimensions: 'unitsmeasurements',
  // Chemistry
  chemicalbondingmolecularstructure: 'chemicalbonding',
  pblockelementsgroup1314: 'pblockelements',
  thermodynamicsc: 'thermodynamic',
}

/** Nicer, syllabus-style names for merged chapters (keyed by chapterKey). */
const CHAPTER_DISPLAY: Record<string, string> = {
  unitmeasurement: 'Units and Measurements',
  unitsmeasurement: 'Units and Measurements',
  unitsmeasurements: 'Units and Measurements',
  dualnatureofmatter: 'Dual Nature of Matter and Radiation',
  chemicalbonding: 'Chemical Bonding and Molecular Structure',
  pblockelements: 'p-Block Elements',
  complexnumber: 'Complex Numbers',
  permutationcombination: 'Permutation and Combination',
  quadraticequation: 'Quadratic Equations',
  thermodynamic: 'Thermodynamics',
}

function baseChapterKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[()\[\]]/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
}

export function chapterKey(name: string): string {
  const base = baseChapterKey(name)
  if (!base) return ''
  const aliased = CHAPTER_ALIASES[base] || base
  // Treat a trailing plural as the same chapter: "Equations" ~ "Equation".
  return aliased.endsWith('s') && aliased.length > 3 ? aliased.slice(0, -1) : aliased
}

export function chapterSlugFor(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'chapter'
}

/**
 * Rewrites every row's chapterName to one display name per merged chapter
 * (the most frequently used variant), so duplicated chapters stop appearing
 * twice and their questions live under a single heading.
 */
export function canonicalizeQuestionChapters<T extends { subjectName: string; chapterName: string }>(rows: T[]): T[] {
  const counts = new Map<string, Map<string, number>>()
  rows.forEach((row) => {
    const key = `${subjectKey(row.subjectName)}|${chapterKey(row.chapterName)}`
    if (!counts.has(key)) counts.set(key, new Map())
    const variants = counts.get(key)!
    variants.set(row.chapterName, (variants.get(row.chapterName) || 0) + 1)
  })

  const display = new Map<string, string>()
  counts.forEach((variants, key) => {
    const best = [...variants.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]
    if (best) display.set(key, best[0].trim())
  })

  return rows.map((row) => {
    const key = `${subjectKey(row.subjectName)}|${chapterKey(row.chapterName)}`
    const name = CHAPTER_DISPLAY[chapterKey(row.chapterName)] || display.get(key) || row.chapterName
    return name === row.chapterName ? row : { ...row, chapterName: name }
  })
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
