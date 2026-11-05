export type MockSessionKind = 'chapter-test' | 'subject-test' | 'full-test' | 'mock' | 'smart'

export interface MockSessionConfig {
  questionIds: string[]
  examName: string
  mode: 'practice' | 'test'
  durationSeconds: number
  createdAt: number
  kind?: MockSessionKind
  subjectName?: string
  chapterName?: string
}

export interface SavedMockProgress {
  answers: Record<string, string>
  reviewIds: string[]
  visitedIds: string[]
  submitted: boolean
}

export const ACTIVE_MOCK_SESSION_KEY = 'jee-pyq-hub:mock-session:v1'
export const MOCK_PROGRESS_KEY = 'jee-pyq-hub:mock-progress:v1'

export function startMockSession(session: MockSessionConfig) {
  if (typeof window === 'undefined') return
  const emptyProgress: SavedMockProgress = { answers: {}, reviewIds: [], visitedIds: [], submitted: false }
  window.localStorage.setItem(ACTIVE_MOCK_SESSION_KEY, JSON.stringify(session))
  window.localStorage.setItem(MOCK_PROGRESS_KEY, JSON.stringify(emptyProgress))
}
