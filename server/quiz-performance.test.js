import { describe, expect, it } from 'vitest'
import { getLatestSubmittedQuizAttempts } from './quiz-performance.js'

describe('getLatestSubmittedQuizAttempts', () => {
  it('keeps the newest submitted attempt for each lesson', () => {
    const attempts = [
      { lessonId: 1, submittedAt: '2025-02-02T10:00:00Z', score: 90 },
      { lessonId: 2, submittedAt: '2025-02-01T10:00:00Z', score: 50 },
      { lessonId: 1, submittedAt: '2025-02-01T10:00:00Z', score: 20 },
      { lessonId: 2, submittedAt: null, score: null },
    ]

    expect(getLatestSubmittedQuizAttempts(attempts)).toEqual([attempts[0], attempts[1]])
  })
})
