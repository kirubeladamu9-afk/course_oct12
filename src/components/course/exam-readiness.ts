import { countMasteryLevels, type MasteryLevel } from '@/components/course/study-mastery'

export type ReadinessTier = 'on_track' | 'needs_work' | 'at_risk'

export interface ExamReadiness {
  tier: ReadinessTier
  percentage: number
  counts: Record<MasteryLevel, number>
  total: number
}

export const READINESS_TIER_LABELS: Record<ReadinessTier, string> = {
  on_track: 'On Track',
  needs_work: 'Needs Work',
  at_risk: 'At Risk',
}

const MASTERY_WEIGHTS: Record<MasteryLevel, number> = { strong: 1, shaky: 0.5, unverified: 0.2, not_started: 0 }
const ON_TRACK_MASTERED_SHARE = 0.75
const ON_TRACK_MAX_OPEN_SHARE = 0.1
const AT_RISK_OPEN_SHARE = 0.5
const AT_RISK_WINDOW_DAYS = 30

export const getExamReadiness = (levels: MasteryLevel[], daysUntilExam: number): ExamReadiness | null => {
  const total = levels.length
  if (total === 0) return null

  const counts = countMasteryLevels(levels)
  const masteredShare = counts.strong / total
  const openShare = (counts.unverified + counts.not_started) / total
  const weightedTotal = levels.reduce((sum, level) => sum + MASTERY_WEIGHTS[level], 0)

  let tier: ReadinessTier = 'needs_work'
  if (masteredShare >= ON_TRACK_MASTERED_SHARE && openShare <= ON_TRACK_MAX_OPEN_SHARE) tier = 'on_track'
  else if (openShare >= AT_RISK_OPEN_SHARE && daysUntilExam <= AT_RISK_WINDOW_DAYS) tier = 'at_risk'

  return { tier, percentage: Math.round((weightedTotal / total) * 100), counts, total }
}
