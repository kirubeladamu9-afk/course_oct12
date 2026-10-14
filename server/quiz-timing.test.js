import { describe, expect, it } from 'vitest'
import { expireQuizAnswers, getQuizDeadline, getQuizTimeLimitSeconds, hasScheduledClassQuizzes, isQuizExpired } from './quiz-timing.js'

describe('quiz timing', () => {
  it('matches the learner time limit for question categories', () => {
    expect(getQuizTimeLimitSeconds([{ type: 'true/false' }, { category: 'essay' }, {}])).toBe(1020)
  })

  it('requires every class quiz to have a valid scheduled date and time', () => {
    expect(hasScheduledClassQuizzes([{ lessons: [{ type: 'quiz', scheduledAt: '2025-01-01T10:00:00.000Z' }] }])).toBe(true)
    expect(hasScheduledClassQuizzes([{ lessons: [{ type: 'quiz', scheduledAt: '' }] }])).toBe(false)
    expect(hasScheduledClassQuizzes([{ lessons: [{ type: 'video' }] }])).toBe(true)
  })

  it('expires class quizzes at scheduled start plus the quiz limit', () => {
    const deadline = getQuizDeadline('2025-01-01T10:00:00.000Z', 90)
    expect(deadline).toBe('2025-01-01T10:01:30.000Z')
    expect(isQuizExpired(deadline, Date.parse('2025-01-01T10:01:30.000Z'))).toBe(true)
    expect(isQuizExpired(deadline, Date.parse('2025-01-01T10:01:29.999Z'))).toBe(false)
  })

  it('preserves answered responses and expires blank responses', () => {
    const answers = expireQuizAnswers({ 1: { status: 'answered', value: 2 } }, [{ id: 1 }, { id: 2 }])
    expect(answers).toEqual({ 1: { status: 'answered', value: 2 }, 2: { status: 'expired', value: null } })
  })
})
