export type MasteryLevel = 'strong' | 'shaky' | 'unverified' | 'not_started'

export interface MasteryAttempt {
  lessonId: number
  startedAt: string
  score: number | null
  passed: boolean | null
  submittedAt: string | null
}

export const STRONG_SCORE = 85
export const STRONG_MAX_ATTEMPT = 2

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  strong: 'Mastered',
  shaky: 'Needs Practice',
  unverified: 'Not Yet Proven',
  not_started: 'Not Started',
}

const attemptTime = (attempt: MasteryAttempt) => Date.parse(attempt.submittedAt ?? attempt.startedAt)

export const getLessonMastery = ({ completed, quizAttempts }: { completed: boolean; quizAttempts: MasteryAttempt[] }): MasteryLevel => {
  const submitted = quizAttempts
    .filter((attempt) => attempt.score !== null && attempt.passed !== null)
    .sort((first, second) => attemptTime(first) - attemptTime(second))
  if (submitted.length === 0) return completed ? 'unverified' : 'not_started'

  const passIndex = submitted.findIndex((attempt) => attempt.passed)
  if (passIndex === -1) return 'shaky'

  const passingAttempt = submitted[passIndex]
  const passedEarly = passIndex < STRONG_MAX_ATTEMPT
  return passedEarly && passingAttempt.score! >= STRONG_SCORE ? 'strong' : 'shaky'
}

export const countMasteryLevels = (levels: MasteryLevel[]): Record<MasteryLevel, number> => {
  const counts: Record<MasteryLevel, number> = { strong: 0, shaky: 0, unverified: 0, not_started: 0 }
  for (const level of levels) counts[level] += 1
  return counts
}
