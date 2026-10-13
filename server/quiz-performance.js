export const getLatestSubmittedQuizAttempts = (attempts) => {
  const latestAttempts = new Map()
  for (const attempt of Array.isArray(attempts) ? attempts : []) {
    if (!attempt?.submittedAt) continue
    const previousAttempt = latestAttempts.get(attempt.lessonId)
    if (!previousAttempt || Date.parse(attempt.submittedAt) > Date.parse(previousAttempt.submittedAt)) {
      latestAttempts.set(attempt.lessonId, attempt)
    }
  }
  return [...latestAttempts.values()]
}
