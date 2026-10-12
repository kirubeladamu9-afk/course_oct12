import { describe, expect, it } from 'vitest'
import { parseLessonParagraphs, type LessonParagraph } from './lesson-docx'

const paragraph = (text: string, heading: number | null = null): LessonParagraph => ({ text, heading })
const questionTemplate = (type: 'QUIZ' | 'PRACTICE'): LessonParagraph[] => [
  paragraph(`${type[0]}${type.slice(1).toLowerCase()} template instructions`),
  paragraph(`LESSON TYPE: ${type}`),
  paragraph('Fractions', 1),
]

const validQuestion = (number: number): LessonParagraph[] => [
  paragraph(`Question ${number}`, 2),
  paragraph('Question: What is one half?'),
  paragraph('Topic: Fractions'),
  paragraph('A. 1/2'),
  paragraph('B. 1/3'),
  paragraph('Correct: A'),
  paragraph('Explanation: One half is 1/2.'),
]

describe('parseLessonParagraphs', () => {
  it('imports an Article body as plain text under its Heading 1 title', () => {
    const result = parseLessonParagraphs('article', [
      paragraph('Article template instructions'),
      paragraph('LESSON TYPE: ARTICLE'),
      paragraph('Light and Exposure', 1),
      paragraph('Exposure controls brightness.'),
      paragraph('Aperture', 2),
      paragraph('A wider aperture lets in more light.'),
    ])

    expect(result).toMatchObject({ title: 'Light and Exposure', articleBody: 'Exposure controls brightness.\nAperture\nA wider aperture lets in more light.', fatalError: null })
  })

  it('keeps valid questions and identifies malformed questions by source number', () => {
    const result = parseLessonParagraphs('quiz', [
      ...questionTemplate('QUIZ'),
      ...validQuestion(1),
      paragraph('Question 2', 2),
      paragraph('Question: Which option is correct?'),
      paragraph('Topic: Science'),
      paragraph('A. First'),
      paragraph('B. Second'),
    ])

    expect(result.questions).toHaveLength(1)
    expect(result.questions[0]).toMatchObject({ number: 1, correctOption: 0 })
    expect(result.issues).toContain('Question 2 has no option marked as correct; add one Correct: letter line.')
    expect(result.fatalError).toBeNull()
  })

  it('rejects importing a Quiz template as Practice', () => {
    const result = parseLessonParagraphs('practice', [...questionTemplate('QUIZ'), ...validQuestion(1)])

    expect(result.fatalError).toBe('This file is a Quiz template, not a Practice template.')
  })

  it('reports when a question heading uses the wrong level', () => {
    const result = parseLessonParagraphs('quiz', [
      ...questionTemplate('QUIZ'),
      ...validQuestion(1).map((item) => item.text === 'Question 1' ? { ...item, heading: 3 } : item),
    ])

    expect(result.fatalError).toBe('Question 1 must use Heading 2 in the Quiz template.')
  })
})
