import { describe, expect, it } from 'vitest'
import { buildStudyPlan, getDaysBetween, prioritizePlannerTopics, type PlannerTopic } from './study-planner'
import type { MasteryLevel } from './study-mastery'

const topic = (lessonId: number, weakScore: number | null = null, mastery: MasteryLevel = 'not_started'): PlannerTopic => ({ lessonId, title: `Lesson ${lessonId}`, moduleTitle: 'Module', weakScore, mastery })

describe('prioritizePlannerTopics', () => {
  it('excludes strong topics and orders shaky, not started, then unverified', () => {
    const topics = [topic(1, null, 'unverified'), topic(2, null, 'strong'), topic(3, null, 'not_started'), topic(4, 65, 'shaky')]
    expect(prioritizePlannerTopics(topics).map((item) => item.lessonId)).toEqual([4, 3, 1])
  })
})

describe('buildStudyPlan', () => {
  it('uses daily periods when the exam is within 14 days', () => {
    const plan = buildStudyPlan([topic(1), topic(2)], '2026-10-16', '2026-10-26')
    expect(plan.granularity).toBe('day')
    expect(plan.periods).toHaveLength(2)
    expect(plan.periods[0].startDate).toBe('2026-10-16')
    expect(plan.periods[0].endDate).toBe('2026-10-16')
  })

  it('uses weekly periods when the exam is further away', () => {
    const topics = Array.from({ length: 6 }, (_, index) => topic(index + 1))
    const plan = buildStudyPlan(topics, '2026-10-16', '2026-12-16')
    expect(plan.granularity).toBe('week')
    expect(plan.periods[0].startDate).toBe('2026-10-16')
    expect(plan.periods[0].endDate).toBe('2026-10-22')
  })

  it('front-loads weak topics and spreads the rest evenly', () => {
    const topics = [topic(1, 20), topic(2, 40), topic(3), topic(4), topic(5), topic(6)]
    const plan = buildStudyPlan(topics, '2026-10-16', '2026-10-26')
    const scheduled = plan.periods.flatMap((period) => period.topics.map((item) => item.lessonId))
    expect(scheduled).toEqual([1, 2, 3, 4, 5, 6])
    expect(plan.periods[0].topics.map((item) => item.lessonId)).toEqual([1])
    expect(plan.periods.every((period) => period.topics.length <= 2)).toBe(true)
  })

  it('returns no periods when there are no topics', () => {
    expect(buildStudyPlan([], '2026-10-16', '2026-10-26').periods).toEqual([])
  })

  it('counts days between dates', () => {
    expect(getDaysBetween('2026-10-16', '2026-10-28')).toBe(12)
  })
})
