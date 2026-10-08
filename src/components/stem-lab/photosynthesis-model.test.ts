import { describe, expect, it } from 'vitest'
import { createPhotosynthesisRound, createPhotosynthesisScenario, getLimitingFactor, getPhotosynthesisAnswer, getPhotosynthesisRate } from './photosynthesis-model'

describe('photosynthesis model', () => {
  it('uses the lowest input to calculate the rate and limiting factor', () => {
    const inputs = { sunlight: 92, water: 31, co2: 84 }
    expect(getPhotosynthesisRate(inputs)).toBe(31)
    expect(getLimitingFactor(inputs)).toBe('water')
  })

  it('classifies the computed rate against the available maximum', () => {
    expect(getPhotosynthesisAnswer(49, 100)).toBe('slowly')
    expect(getPhotosynthesisAnswer(50, 100)).toBe('quickly')
  })

  it('generates low-input and balanced scenarios with calculated outcomes', () => {
    for (let index = 0; index < 100; index += 1) {
      const scenario = createPhotosynthesisScenario()
      expect(scenario.rate).toBe(getPhotosynthesisRate(scenario.inputs))
      expect(scenario.limiting).toBe(getLimitingFactor(scenario.inputs))
      expect(scenario.limiting).toBeDefined()
    }
  })

  it('changes the target rate and limiting factor between rounds', () => {
    const previous = createPhotosynthesisRound()
    const next = createPhotosynthesisRound(previous)
    expect(next.targetRate).not.toBe(previous.targetRate)
    expect(next.scenario.limiting).not.toBe(previous.scenario.limiting)
  })
})
