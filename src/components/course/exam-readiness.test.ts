import { describe, expect, it } from 'vitest'
import { getExamReadiness } from './exam-readiness'
import type { MasteryLevel } from './study-mastery'

const levels = (counts: Partial<Record<MasteryLevel, number>>): MasteryLevel[] => Object.entries(counts).flatMap(([level, count]) => Array.from({ length: count ?? 0 }, () => level as MasteryLevel))

describe('getExamReadiness', () => {
  it('returns null when there are no topics', () => {
    expect(getExamReadiness([], 60)).toBeNull()
  })

  it('is On Track when most lessons are mastered and few are open', () => {
    const readiness = getExamReadiness(levels({ strong: 9, shaky: 1 }), 60)
    expect(readiness?.tier).toBe('on_track')
    expect(readiness?.percentage).toBe(95)
  })

  it('is Needs Work for a mix of practice and open lessons', () => {
    const readiness = getExamReadiness(levels({ strong: 4, shaky: 3, unverified: 2, not_started: 1 }), 60)
    expect(readiness?.tier).toBe('needs_work')
    expect(readiness?.counts).toEqual({ strong: 4, shaky: 3, unverified: 2, not_started: 1 })
  })

  it('is At Risk when many lessons are open close to the exam', () => {
    expect(getExamReadiness(levels({ strong: 2, not_started: 5, unverified: 3 }), 20)?.tier).toBe('at_risk')
  })

  it('stays Needs Work when many lessons are open but the exam is far away', () => {
    expect(getExamReadiness(levels({ strong: 2, not_started: 5, unverified: 3 }), 90)?.tier).toBe('needs_work')
  })

  it('weights mastery levels into the estimated percentage', () => {
    expect(getExamReadiness(levels({ strong: 1, shaky: 2, unverified: 1 }), 60)?.percentage).toBe(55)
  })
})
