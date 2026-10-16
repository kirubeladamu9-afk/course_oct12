import { getLessonMastery, type MasteryAttempt } from './study-mastery'

export type SyllabusCoverageStatus = 'covered' | 'in_progress' | 'not_covered'

export const SYLLABUS_COVERAGE_LABELS: Record<SyllabusCoverageStatus, string> = {
  covered: 'Covered',
  in_progress: 'In Progress',
  not_covered: 'Not Covered',
}

export interface SyllabusCoverageTopic {
  id: number
  title: string
}

export interface SyllabusCoverageLesson {
  id: number
  syllabusTopicIds?: number[]
}

export interface SyllabusCoverageStudent {
  completedLessonIds: number[]
  quizAttempts: MasteryAttempt[]
}

export interface SyllabusTopicCoverage {
  topic: SyllabusCoverageTopic
  status: SyllabusCoverageStatus
  taggedLessonCount: number
}

const isMasteredOrPracticing = (lesson: SyllabusCoverageLesson, student: SyllabusCoverageStudent) => {
  const completed = student.completedLessonIds.includes(lesson.id)
  if (!completed) return false
  const mastery = getLessonMastery({ completed, quizAttempts: student.quizAttempts.filter((attempt) => attempt.lessonId === lesson.id) })
  return mastery === 'strong' || mastery === 'shaky'
}

export const getSyllabusCoverage = ({ topics, lessons, students }: {
  topics: SyllabusCoverageTopic[]
  lessons: SyllabusCoverageLesson[]
  students: SyllabusCoverageStudent[]
}): SyllabusTopicCoverage[] => {
  const requiredStudents = Math.ceil((students.length * 2) / 3)

  return topics.map((topic) => {
    const taggedLessons = lessons.filter((lesson) => lesson.syllabusTopicIds?.includes(topic.id))
    const isCovered = taggedLessons.some((lesson) => {
      const masteredCount = students.filter((student) => isMasteredOrPracticing(lesson, student)).length
      return masteredCount > 0 && masteredCount >= requiredStudents
    })
    const status: SyllabusCoverageStatus = isCovered ? 'covered' : taggedLessons.length > 0 ? 'in_progress' : 'not_covered'
    return { topic, status, taggedLessonCount: taggedLessons.length }
  })
}

export const countSyllabusCoverage = (coverage: SyllabusTopicCoverage[]) => ({
  total: coverage.length,
  covered: coverage.filter((item) => item.status === 'covered').length,
  inProgress: coverage.filter((item) => item.status === 'in_progress').length,
  notCovered: coverage.filter((item) => item.status === 'not_covered').length,
})
