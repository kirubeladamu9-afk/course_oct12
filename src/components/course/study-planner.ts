export interface PlannerTopic {
  lessonId: number
  title: string
  moduleTitle: string
  weakScore: number | null
}

export interface PlanPeriod {
  index: number
  startDate: string
  endDate: string
  topics: PlannerTopic[]
}

export interface StudyPlan {
  granularity: 'day' | 'week'
  periods: PlanPeriod[]
}

export const DAILY_PLAN_MAX_DAYS = 14

const DAY_MS = 86_400_000

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const getDaysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)

const addDays = (dateKey: string, days: number) =>
  new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

export const buildStudyPlan = (topics: PlannerTopic[], today: string, examDate: string): StudyPlan => {
  const daysUntilExam = getDaysBetween(today, examDate)
  const studyDays = Math.max(1, daysUntilExam)
  const granularity = daysUntilExam <= DAILY_PLAN_MAX_DAYS ? 'day' : 'week'
  const span = granularity === 'day' ? 1 : 7
  const periodCount = Math.ceil(studyDays / span)
  const periods: PlanPeriod[] = Array.from({ length: periodCount }, (_, index) => ({
    index,
    startDate: addDays(today, index * span),
    endDate: addDays(today, Math.min(studyDays - 1, index * span + span - 1)),
    topics: [],
  }))

  if (topics.length > 0) {
    topics.forEach((topic, index) => {
      periods[Math.floor((index * periodCount) / topics.length)].topics.push(topic)
    })
  }

  return { granularity, periods: periods.filter((period) => period.topics.length > 0) }
}
