export type PhotosynthesisInputs = { sunlight: number; water: number; co2: number }
export type PhotosynthesisFactor = keyof PhotosynthesisInputs
export type PhotosynthesisScenario = { inputs: PhotosynthesisInputs; limiting: PhotosynthesisFactor; rate: number }
export type PhotosynthesisRound = { targetRate: number; scenario: PhotosynthesisScenario }

const FACTORS: PhotosynthesisFactor[] = ['sunlight', 'water', 'co2']
const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

export const getPhotosynthesisRate = ({ sunlight, water, co2 }: PhotosynthesisInputs) => Math.min(sunlight, water, co2)
export const getLimitingFactor = (inputs: PhotosynthesisInputs) => FACTORS.reduce((lowest, factor) => inputs[factor] < inputs[lowest] ? factor : lowest, FACTORS[0])
export const getPhotosynthesisAnswer = (rate: number, maximumRate: number): 'quickly' | 'slowly' => rate >= maximumRate * .5 ? 'quickly' : 'slowly'

export const createPhotosynthesisScenario = (previousLimiting?: PhotosynthesisFactor): PhotosynthesisScenario => {
  const limiting = randomFrom(FACTORS.filter((factor) => factor !== previousLimiting))
  const isLimited = Math.random() < .5
  const inputs: PhotosynthesisInputs = { sunlight: 70 + Math.floor(Math.random() * 31), water: 70 + Math.floor(Math.random() * 31), co2: 70 + Math.floor(Math.random() * 31) }
  inputs[limiting] = isLimited ? 10 + Math.floor(Math.random() * 40) : 55 + Math.floor(Math.random() * 15)
  return { inputs, limiting: getLimitingFactor(inputs), rate: getPhotosynthesisRate(inputs) }
}

export const createPhotosynthesisRound = (previous?: PhotosynthesisRound): PhotosynthesisRound => {
  const targetRates = [90, 95, 100].filter((rate) => rate !== previous?.targetRate)
  return { targetRate: randomFrom(targetRates), scenario: createPhotosynthesisScenario(previous?.scenario.limiting) }
}
