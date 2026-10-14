const getQuestionSeconds = (question) => {
  const kind = `${question?.type ?? ''} ${question?.category ?? ''}`.toLowerCase()
  if (/true|false|boolean/.test(kind)) return 30
  if (/multiple|choice/.test(kind)) return 90
  if (/matching|ordering|order/.test(kind)) return 90
  if (/fill|short|text/.test(kind)) return 180
  if (/calculation|data|numeric|math/.test(kind)) return 240
  if (/essay|file|upload/.test(kind)) return 900
  return 90
}

export const getQuizTimeLimitSeconds = (questions) => (Array.isArray(questions) ? questions : []).reduce((total, question) => total + getQuestionSeconds(question), 0)

export const hasScheduledClassQuizzes = (modules) => (Array.isArray(modules) ? modules : []).flatMap((module) => Array.isArray(module?.lessons) ? module.lessons : []).every((lesson) => lesson?.type !== 'quiz' || (typeof lesson.scheduledAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(lesson.scheduledAt) && Number.isFinite(Date.parse(lesson.scheduledAt))))

export const getQuizDeadline = (scheduledAt, timeLimitSeconds) => new Date(Date.parse(scheduledAt) + timeLimitSeconds * 1000).toISOString()

export const isQuizExpired = (deadlineAt, now = Date.now()) => now >= Date.parse(deadlineAt)

export const expireQuizAnswers = (answers, questions) => Object.fromEntries((Array.isArray(questions) ? questions : []).map((question) => {
  const answer = answers?.[question.id]
  return [question.id, answer?.status === 'answered' ? answer : { status: 'expired', value: null }]
}))
