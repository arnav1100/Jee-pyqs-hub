import type { Question } from '@/data/mockData'

export function isAnswerCorrect(question: Question, given: string | undefined): boolean {
  if (!given) return false
  if (question.questionType === 'numerical') {
    if (question.correctAnswer === undefined) return false
    const num = Number(given)
    if (Number.isNaN(num)) return false
    const tolerance = question.answerTolerance === undefined ? 0.01 : question.answerTolerance
    return Math.abs(num - question.correctAnswer) <= tolerance
  }
  return given === question.correctOptionId
}