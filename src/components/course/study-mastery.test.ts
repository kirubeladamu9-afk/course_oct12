import { describe, expect, it } from 'vitest'
import { countMasteryLevels, getLessonMastery, type MasteryAttempt } from './study-mastery'

const attempt = (score: number | null, passed: boolean | null, submittedAt = '2026-10-01T10:00:00Z'): MasteryAttempt => ({ lessonId: 1, startedAt: submittedAt, score, passed, submittedAt })

describe('getLessonMastery', () => {
  it('marks a high first-attempt pass as strong', () => {
    expect(getLessonMastery({ completed: true, quizAttempts: [attempt(90, true)] })).toBe('strong')
  })

  it('marks a high pass on the second attempt as strong', () => {
    expect(getLessonMastery({ completed: true, quizAttempts: [attempt(40, false, '2026-10-01T10:00:00Z'), attempt(88, true, '2026-10-02T10:00:00Z')] })).toBe('strong')
  })

  it('marks a low pass as shaky', () => {
    expect(getLessonMastery({ completed: true, quizAttempts: [attempt(72, true)] })).toBe('shaky')
  })

  it('marks a pass after multiple attempts as shaky even with a high score', () => {
    const attempts = [attempt(50, false, '2026-10-01T10:00:00Z'), attempt(60, false, '2026-10-02T10:00:00Z'), attempt(95, true, '2026-10-03T10:00:00Z')]
    expect(getLessonMastery({ completed: true, quizAttempts: attempts })).toBe('shaky')
  })

  it('marks a completed lesson with no quiz evidence as unverified', () => {
    expect(getLessonMastery({ completed: true, quizAttempts: [] })).toBe('unverified')
  })

  it('marks an unfinished lesson with no attempts as not started', () => {
    expect(getLessonMastery({ completed: false, quizAttempts: [] })).toBe('not_started')
  })

  it('marks an unpassed quiz as shaky', () => {
    expect(getLessonMastery({ completed: false, quizAttempts: [attempt(40, false)] })).toBe('shaky')
  })

  it('ignores attempts that were never submitted', () => {
    expect(getLessonMastery({ completed: false, quizAttempts: [attempt(null, null)] })).toBe('not_started')
  })
})

describe('countMasteryLevels', () => {
  it('counts each level', () => {
    expect(countMasteryLevels(['strong', 'shaky', 'strong', 'not_started'])).toEqual({ strong: 2, shaky: 1, unverified: 0, not_started: 1 })
  })
})
