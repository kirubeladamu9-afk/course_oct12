import { afterEach, describe, expect, it, vi } from 'vitest'
import { getNextLessonId } from './admin-data'

afterEach(() => vi.useRealTimers())

describe('getNextLessonId', () => {
  it('does not reuse an ID if the newest lesson was deleted', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'))
    const modules = [{ id: 1, title: 'Module', lessons: [{ id: 1, title: 'Existing', type: 'simulation' as const, duration: null, resources: [] }] }]

    const firstId = getNextLessonId(modules)
    const secondId = getNextLessonId(modules)

    expect(secondId).toBeGreaterThan(firstId)
    expect(Number.isSafeInteger(secondId)).toBe(true)
  })
})
