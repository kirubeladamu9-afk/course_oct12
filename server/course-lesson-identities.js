const getLessons = (modules) => Array.isArray(modules)
  ? modules.flatMap((module) => Array.isArray(module?.lessons) ? module.lessons : [])
  : []

export const remapReusedCourseLessonIds = (previousModules, nextModules, progressLessonIds) => {
  const previousIds = new Set(getLessons(previousModules).map((lesson) => String(lesson.id)))
  const staleProgressIds = new Set(progressLessonIds.map(String))
  const nextLessonIds = new Set(getLessons(nextModules).map((lesson) => String(lesson.id)))
  const reusedIds = new Set([...nextLessonIds].filter((id) => !previousIds.has(id) && staleProgressIds.has(id)))
  if (!reusedIds.size) return nextModules

  let nextId = Math.max(
    0,
    ...getLessons(nextModules).map((lesson) => Number(lesson.id)),
    ...[...staleProgressIds].map(Number),
  ) + 1

  return nextModules.map((module) => ({
    ...module,
    lessons: (module.lessons ?? []).map((lesson) => {
      if (previousIds.has(String(lesson.id)) || !reusedIds.has(String(lesson.id))) return lesson
      return { ...lesson, id: nextId++ }
    }),
  }))
}
