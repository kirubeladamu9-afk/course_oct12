import { describe, expect, it } from 'vitest'
import { countSyllabusCoverage, getSyllabusCoverage, type SyllabusCoverageStudent } from './syllabus-coverage'
import { type MasteryAttempt } from './study-mastery'

const topics = [
  { id: 1, title: "Newton's Third Law" },
  { id: 2, title: 'Ohm’s Law' },
  { id: 3, title: 'Photosynthesis' },
]

const strongAttempt = (lessonId: number): MasteryAttempt => ({ lessonId, startedAt: '2026-01-01T00:00:00Z', submittedAt: '2026-01-01T00:10:00Z', score: 95, passed: true })
const shakyAttempt = (lessonId: number): MasteryAttempt => ({ lessonId, startedAt: '2026-01-01T00:00:00Z', submittedAt: '2026-01-01T00:10:00Z', score: 60, passed: true })

const student = (completedLessonIds: number[], quizAttempts: MasteryAttempt[] = []): SyllabusCoverageStudent => ({ completedLessonIds, quizAttempts })

describe('getSyllabusCoverage', () => {
  it('marks a topic not covered when no lesson is tagged to it', () => {
    const coverage = getSyllabusCoverage({ topics, lessons: [{ id: 10, syllabusTopicIds: [2] }], students: [student([10], [strongAttempt(10)])] })

    expect(coverage.find((item) => item.topic.id === 1)?.status).toBe('not_covered')
  })

  it('marks a topic in progress when a tagged lesson is not completed', () => {
    const coverage = getSyllabusCoverage({ topics, lessons: [{ id: 10, syllabusTopicIds: [1] }], students: [student([])] })

    expect(coverage[0]).toMatchObject({ status: 'in_progress', taggedLessonCount: 1 })
  })

  it('treats a completed lesson without a passed quiz as in progress', () => {
    const coverage = getSyllabusCoverage({ topics, lessons: [{ id: 10, syllabusTopicIds: [1] }], students: [student([10])] })

    expect(coverage[0].status).toBe('in_progress')
  })

  it('counts Needs Practice mastery as covered for an individual student', () => {
    const coverage = getSyllabusCoverage({ topics, lessons: [{ id: 10, syllabusTopicIds: [1] }], students: [student([10], [shakyAttempt(10)])] })

    expect(coverage[0].status).toBe('covered')
  })

  it('requires two-thirds of the class before a topic is covered', () => {
    const lessons = [{ id: 10, syllabusTopicIds: [1] }]
    const oneOfThree = getSyllabusCoverage({ topics, lessons, students: [student([10], [strongAttempt(10)]), student([]), student([])] })
    const twoOfThree = getSyllabusCoverage({ topics, lessons, students: [student([10], [strongAttempt(10)]), student([10], [strongAttempt(10)]), student([])] })
    const twoOfFour = getSyllabusCoverage({ topics, lessons, students: [student([10], [strongAttempt(10)]), student([10], [strongAttempt(10)]), student([]), student([])] })
    const threeOfFour = getSyllabusCoverage({ topics, lessons, students: [student([10], [strongAttempt(10)]), student([10], [strongAttempt(10)]), student([10], [strongAttempt(10)]), student([])] })

    expect(oneOfThree[0].status).toBe('in_progress')
    expect(twoOfThree[0].status).toBe('covered')
    expect(twoOfFour[0].status).toBe('in_progress')
    expect(threeOfFour[0].status).toBe('covered')
  })

  it('covers a topic through any one of several tagged lessons', () => {
    const coverage = getSyllabusCoverage({
      topics,
      lessons: [{ id: 10, syllabusTopicIds: [3] }, { id: 11, syllabusTopicIds: [3] }],
      students: [student([11], [strongAttempt(11)])],
    })

    expect(coverage[2]).toMatchObject({ status: 'covered', taggedLessonCount: 2 })
  })

  it('lets one lesson cover several topics', () => {
    const coverage = getSyllabusCoverage({ topics, lessons: [{ id: 10, syllabusTopicIds: [1, 2] }], students: [student([10], [strongAttempt(10)])] })

    expect(coverage.slice(0, 2).map((item) => item.status)).toEqual(['covered', 'covered'])
  })

  it('does not cover a topic when the class is empty', () => {
    const coverage = getSyllabusCoverage({ topics, lessons: [{ id: 10, syllabusTopicIds: [1] }], students: [] })

    expect(coverage[0].status).toBe('in_progress')
  })
})

describe('countSyllabusCoverage', () => {
  it('summarises statuses across all official topics', () => {
    const coverage = getSyllabusCoverage({ topics, lessons: [{ id: 10, syllabusTopicIds: [1] }, { id: 11, syllabusTopicIds: [2] }], students: [student([10], [strongAttempt(10)])] })

    expect(countSyllabusCoverage(coverage)).toEqual({ total: 3, covered: 1, inProgress: 1, notCovered: 1 })
  })
})
