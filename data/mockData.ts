export type Difficulty = 'Easy' | 'Moderate' | 'Difficult'
export type ExamType = 'JEE Main' | 'JEE Advanced'

export interface Subject {
  slug: 'physics' | 'chemistry' | 'mathematics'
  name: string
  totalChapters: number
  totalQuestions: number
  colorFrom: string
  colorTo: string
}

export interface Chapter {
  slug: string
  subjectSlug: Subject['slug']
  name: string
  totalQuestions: number
  easy: number
  moderate: number
  difficult: number
}

export interface Option {
  id: 'A' | 'B' | 'C' | 'D'
  text: string
  imageUrl?: string
}

export interface Question {
  id: string
  chapterSlug: string
  number: number
  text: string
  imageUrl?: string
  options: Option[]
  correctOptionId: Option['id']
  solution: string
  difficulty: Difficulty
  examType: ExamType
  year: number
  shift: string
}

export const subjects: Subject[] = [
  { slug: 'physics', name: 'Physics', totalChapters: 22, totalQuestions: 1840, colorFrom: '#1652f0', colorTo: '#2570fb' },
  { slug: 'chemistry', name: 'Chemistry', totalChapters: 28, totalQuestions: 2120, colorFrom: '#123fd6', colorTo: '#4c95ff' },
  { slug: 'mathematics', name: 'Mathematics', totalChapters: 24, totalQuestions: 1960, colorFrom: '#111d54', colorTo: '#1652f0' },
]

export const chapters: Chapter[] = [
  { slug: 'kinematics', subjectSlug: 'physics', name: 'Kinematics', totalQuestions: 96, easy: 38, moderate: 42, difficult: 16 },
  { slug: 'laws-of-motion', subjectSlug: 'physics', name: 'Laws of Motion', totalQuestions: 84, easy: 30, moderate: 38, difficult: 16 },
  { slug: 'rotational-motion', subjectSlug: 'physics', name: 'Rotational Motion', totalQuestions: 78, easy: 22, moderate: 36, difficult: 20 },
  { slug: 'thermodynamics', subjectSlug: 'physics', name: 'Thermodynamics', totalQuestions: 71, easy: 28, moderate: 30, difficult: 13 },
  { slug: 'electrostatics', subjectSlug: 'physics', name: 'Electrostatics', totalQuestions: 102, easy: 40, moderate: 44, difficult: 18 },
  { slug: 'current-electricity', subjectSlug: 'physics', name: 'Current Electricity', totalQuestions: 88, easy: 32, moderate: 38, difficult: 18 },

  { slug: 'mole-concept', subjectSlug: 'chemistry', name: 'Mole Concept', totalQuestions: 66, easy: 26, moderate: 28, difficult: 12 },
  { slug: 'atomic-structure', subjectSlug: 'chemistry', name: 'Atomic Structure', totalQuestions: 90, easy: 34, moderate: 40, difficult: 16 },
  { slug: 'chemical-bonding', subjectSlug: 'chemistry', name: 'Chemical Bonding', totalQuestions: 104, easy: 40, moderate: 44, difficult: 20 },
  { slug: 'thermodynamics-chem', subjectSlug: 'chemistry', name: 'Chemical Thermodynamics', totalQuestions: 74, easy: 28, moderate: 32, difficult: 14 },
  { slug: 'organic-basics', subjectSlug: 'chemistry', name: 'General Organic Chemistry', totalQuestions: 112, easy: 42, moderate: 48, difficult: 22 },

  { slug: 'quadratic-equations', subjectSlug: 'mathematics', name: 'Quadratic Equations', totalQuestions: 68, easy: 26, moderate: 30, difficult: 12 },
  { slug: 'sequences-series', subjectSlug: 'mathematics', name: 'Sequences & Series', totalQuestions: 80, easy: 30, moderate: 34, difficult: 16 },
  { slug: 'matrices-determinants', subjectSlug: 'mathematics', name: 'Matrices & Determinants', totalQuestions: 92, easy: 34, moderate: 40, difficult: 18 },
  { slug: 'coordinate-geometry', subjectSlug: 'mathematics', name: 'Coordinate Geometry', totalQuestions: 118, easy: 44, moderate: 50, difficult: 24 },
  { slug: 'calculus-limits', subjectSlug: 'mathematics', name: 'Limits, Continuity & Differentiability', totalQuestions: 96, easy: 34, moderate: 42, difficult: 20 },
]

export const questions: Question[] = [
  {
    id: 'kin-2023-m-s1-q1',
    chapterSlug: 'kinematics',
    number: 1,
    text: 'A particle moves along the x-axis such that its position is given by x(t) = 2t³ − 3t² + 4, where x is in metres and t is in seconds. What is the velocity of the particle at t = 2 s?',
    options: [
      { id: 'A', text: '12 m/s' },
      { id: 'B', text: '18 m/s' },
      { id: 'C', text: '24 m/s' },
      { id: 'D', text: '6 m/s' },
    ],
    correctOptionId: 'A',
    solution: 'v(t) = dx/dt = 6t² − 6t. At t = 2 s: v = 6(2)² − 6(2) = 24 − 12 = 12 m/s. [Sample placeholder — swap in verified PYQ data before publishing.]',
    difficulty: 'Easy',
    examType: 'JEE Main',
    year: 2023,
    shift: 'Shift 1 (Jan)',
  },
  {
    id: 'kin-2022-a-p1-q4',
    chapterSlug: 'kinematics',
    number: 2,
    text: 'A ball is thrown vertically upward with speed u from the top of a tower of height h. It strikes the ground with speed 3u. What is the height h in terms of u and g?',
    options: [
      { id: 'A', text: 'h = 3u²/g' },
      { id: 'B', text: 'h = 4u²/g' },
      { id: 'C', text: 'h = 4u²/(2g)' },
      { id: 'D', text: 'h = 8u²/g' },
    ],
    correctOptionId: 'B',
    solution: 'Using v² = u² + 2gh with v = 3u: 9u² = u² + 2gh ⇒ 8u² = 2gh ⇒ h = 4u²/g.',
    difficulty: 'Moderate',
    examType: 'JEE Advanced',
    year: 2022,
    shift: 'Paper 1',
  },
  {
    id: 'kin-2021-m-s2-q7',
    chapterSlug: 'kinematics',
    number: 3,
    text: 'A particle starts from rest and moves with constant acceleration. If it covers 40 m in the 4th second, what is its acceleration?',
    options: [
      { id: 'A', text: '4.57 m/s²' },
      { id: 'B', text: '5.71 m/s²' },
      { id: 'C', text: '8.00 m/s²' },
      { id: 'D', text: '10.0 m/s²' },
    ],
    correctOptionId: 'B',
    solution: 'Distance in nth second = u + a(2n−1)/2. With u = 0, n = 4: 40 = a(7)/2 ⇒ a = 80/7 ≈ 11.4 m/s². Verify against source before publishing — sample data only.',
    difficulty: 'Difficult',
    examType: 'JEE Main',
    year: 2021,
    shift: 'Shift 2 (Feb)',
  },
]
