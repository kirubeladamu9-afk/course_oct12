import { Document, HeadingLevel, Packer, Paragraph } from 'docx'
import JSZip from 'jszip'

export type ImportableLessonType = 'article' | 'quiz' | 'practice'

export interface ImportedQuestion {
  number: number
  question: string
  topic: string
  options: string[]
  correctOption: number
  explanation: string
}

export interface LessonImportPreview {
  title: string
  articleBody: string
  questions: ImportedQuestion[]
  issues: string[]
  fatalError: string | null
}

export interface LessonParagraph {
  text: string
  heading: number | null
}

const docxMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const paragraph = (text: string, heading?: typeof HeadingLevel[keyof typeof HeadingLevel]) => new Paragraph({ text, ...(heading ? { heading } : {}) })

const questionTemplateParagraphs = (type: 'quiz' | 'practice') => {
  const name = type === 'quiz' ? 'Quiz' : 'Practice'
  return [
    paragraph(`${name} template instructions`),
    paragraph('Replace the Heading 1 text with the lesson title. Keep each question as a Heading 2 named Question 1, Question 2, and so on.'),
    paragraph('For every question, use one paragraph per line in this exact order: Question: text, Topic: name, options labeled A. and B. (add C. and more if needed), Correct: one option letter, and optional Explanation: text.'),
    paragraph('At least two non-empty options and exactly one valid Correct: letter are required. Empty question blocks are ignored. The filled first question is an example; replace it or remove it.'),
    paragraph(`LESSON TYPE: ${name.toUpperCase()}`),
    paragraph('[Enter lesson title]', HeadingLevel.HEADING_1),
    paragraph('Question 1', HeadingLevel.HEADING_2),
    paragraph('Question: What is 2 + 2?'),
    paragraph('Topic: Arithmetic'),
    paragraph('A. 3'),
    paragraph('B. 4'),
    paragraph('Correct: B'),
    paragraph('Explanation: Four is the sum of two and two.'),
    paragraph('Question 2', HeadingLevel.HEADING_2),
    paragraph('Question:'),
    paragraph('Topic:'),
    paragraph('A.'),
    paragraph('B.'),
    paragraph('Correct:'),
    paragraph('Explanation:'),
  ]
}

const templateParagraphs = (type: ImportableLessonType) => type === 'article'
  ? [
      paragraph('Article template instructions'),
      paragraph('Use exactly one Heading 1 for the lesson title. Use Heading 2 for optional subsection titles, then write plain text paragraphs beneath them.'),
      paragraph('Formatting and images are not imported. Replace the bracketed example text with your lesson content.'),
      paragraph('LESSON TYPE: ARTICLE'),
      paragraph('[Enter lesson title]', HeadingLevel.HEADING_1),
      paragraph('[Enter article content here]'),
      paragraph('[Enter subsection title]', HeadingLevel.HEADING_2),
      paragraph('[Enter subsection content here]'),
    ]
  : questionTemplateParagraphs(type)

export const downloadLessonTemplate = async (type: ImportableLessonType) => {
  const document = new Document({ sections: [{ children: templateParagraphs(type) }] })
  const blob = await Packer.toBlob(document)
  const url = URL.createObjectURL(new Blob([blob], { type: docxMimeType }))
  const link = window.document.createElement('a')
  link.href = url
  link.download = `coursespace-${type}-lesson-template.docx`
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const isPlaceholder = (value: string) => /^\[.*\]$/.test(value.trim())
const preview = (fatalError: string, title = ''): LessonImportPreview => ({ title, articleBody: '', questions: [], issues: [], fatalError })
const parseArticle = (paragraphs: LessonParagraph[]): LessonImportPreview => {
  const instructionMarker = paragraphs.find((paragraph) => /^(Article|Quiz|Practice) template instructions$/i.test(paragraph.text))?.text
  if (instructionMarker && !/^Article/i.test(instructionMarker)) return preview(`This file is a ${instructionMarker.split(' ')[0]} template, not an Article template.`)
  const lessonTypeMarker = paragraphs.find(({ text }) => /^LESSON TYPE: (ARTICLE|QUIZ|PRACTICE)$/i.test(text))?.text
  if (lessonTypeMarker && lessonTypeMarker !== 'LESSON TYPE: ARTICLE') return preview(`This file is marked as ${lessonTypeMarker.split(': ')[1]}, not Article. Choose the matching lesson type to import it.`)
  if (!lessonTypeMarker) return preview('The Article template is missing its required LESSON TYPE marker. Download a fresh Article template.')
  if (paragraphs.some(({ text, heading }) => heading === 2 && /^Question\s+\d+$/i.test(text))) return preview('This file looks like a Quiz or Practice template, not an Article template. Choose Quiz or Practice to import it.')

  const titleHeadings = paragraphs.filter(({ heading }) => heading === 1)
  if (titleHeadings.length !== 1) {
    const hasHeading = paragraphs.some(({ heading }) => heading !== null)
    return preview(hasHeading ? 'The Article lesson title must use Heading 1, and subsections must use Heading 2.' : 'An Article template must contain exactly one Heading 1 lesson title.')
  }

  const titleIndex = paragraphs.indexOf(titleHeadings[0])
  const instructions = [
    'Article template instructions',
    'Use exactly one Heading 1 for the lesson title. Use Heading 2 for optional subsection titles, then write plain text paragraphs beneath them.',
    'Formatting and images are not imported. Replace the bracketed example text with your lesson content.',
    'LESSON TYPE: ARTICLE',
  ]
  const leadingContent = paragraphs.slice(0, titleIndex).filter(({ text }) => text && !instructions.includes(text))
  if (leadingContent.length) return preview('Article content must come after the Heading 1 lesson title.')

  const title = titleHeadings[0].text
  if (!title || isPlaceholder(title)) return preview('Enter a non-empty lesson title in the Heading 1 line.')
  const unexpectedHeading = paragraphs.slice(titleIndex + 1).find(({ heading }) => heading !== null && heading > 2)
  if (unexpectedHeading) return preview('The Article template contains an unsupported heading level. Use Heading 2 for subsections.')
  const content = paragraphs.slice(titleIndex + 1).filter(({ text }) => text && !isPlaceholder(text)).map(({ text }) => text)
  return { title, articleBody: content.join('\n'), questions: [], issues: [], fatalError: null }
}

const parseQuestionBlock = (heading: string, paragraphs: LessonParagraph[], issues: string[]) => {
  const number = Number(heading.match(/\d+/)?.[0] ?? 0)
  const labelValues = new Map<string, string[]>()
  const options: Array<{ label: string; value: string }> = []
  const lineKinds: string[] = []
  let malformedOption = false
  let unexpectedLine = false

  for (const { text: line } of paragraphs) {
    if (!line) continue
    const labelMatch = line.match(/^(Question|Topic|Correct|Explanation):\s*(.*)$/i)
    if (labelMatch) {
      const key = labelMatch[1].toLowerCase()
      lineKinds.push(key)
      labelValues.set(key, [...(labelValues.get(key) ?? []), labelMatch[2].trim()])
      continue
    }
    const optionMatch = line.match(/^([A-Z])\.\s*(.*)$/)
    if (optionMatch) {
      lineKinds.push('option')
      options.push({ label: optionMatch[1], value: optionMatch[2].trim() })
      continue
    }
    if (/^(?:\*\s*)?[A-Z][.)]\s*/i.test(line) || /^(?:option|answer)\s+[A-Z]\b/i.test(line)) {
      lineKinds.push('invalid-option')
      malformedOption = true
    } else {
      lineKinds.push('unknown')
      unexpectedLine = true
    }
  }

  const questionValues = labelValues.get('question') ?? []
  const topicValues = labelValues.get('topic') ?? []
  const correctValues = labelValues.get('correct') ?? []
  const explanationValues = labelValues.get('explanation') ?? []
  const allEmpty = [...questionValues, ...topicValues, ...options.map(({ value }) => value), ...correctValues, ...explanationValues].every((value) => !value || isPlaceholder(value)) && !malformedOption && !unexpectedLine
  if (allEmpty) return null

  const errors: string[] = []
  if (questionValues.length !== 1 || !questionValues[0] || isPlaceholder(questionValues[0])) errors.push(questionValues.length > 1 ? 'has multiple Question: lines' : 'has no non-empty Question: line')
  if (topicValues.length !== 1 || !topicValues[0] || isPlaceholder(topicValues[0])) errors.push(topicValues.length > 1 ? 'has multiple Topic: lines' : 'has no non-empty Topic: line')
  if (lineKinds[0] !== 'question' || lineKinds[1] !== 'topic') errors.push('must start with Question: then Topic: before the answer options')
  const correctLineIndex = lineKinds.indexOf('correct')
  if (correctLineIndex !== -1 && correctLineIndex !== lineKinds.lastIndexOf('option') + 1) errors.push('must place Correct: immediately after the answer options')
  if (lineKinds.includes('explanation') && lineKinds.indexOf('explanation') !== lineKinds.length - 1) errors.push('must place optional Explanation: after Correct:')
  if (options.filter(({ value }) => value && !isPlaceholder(value)).length < 2) errors.push('must have at least two non-empty options')
  if (malformedOption) errors.push('has a malformed option list; use A. option text, B. option text, and so on')
  if (new Set(options.map(({ label }) => label)).size !== options.length) errors.push('has duplicate option labels')
  if (options.some(({ value }) => !value || isPlaceholder(value))) errors.push('has an empty option')
  if (options.some(({ label }, index) => label !== String.fromCharCode(65 + index))) errors.push('option labels must be consecutive starting with A.')
  if (correctValues.length > 1) errors.push('has multiple Correct: lines; mark exactly one option as correct')
  else if (!correctValues[0]) errors.push('has no option marked as correct; add one Correct: letter line')
  const correctOption = options.findIndex(({ label }) => label === correctValues[0]?.toUpperCase())
  if (correctValues.length === 1 && correctValues[0] && correctOption < 0) errors.push(`marks ${correctValues[0]} as correct, but that option does not exist`)
  if (explanationValues.length > 1) errors.push('has more than one Explanation: line')
  if (unexpectedLine) errors.push('contains an unrecognized line; use the labels shown in the template')
  if (errors.length) {
    issues.push(`Question ${number} ${errors.join('; ')}.`)
    return null
  }
  return { number, question: questionValues[0], topic: topicValues[0], options: options.map(({ value }) => value), correctOption, explanation: explanationValues[0] ?? '' }
}

const parseQuizOrPractice = (paragraphs: LessonParagraph[], type: 'quiz' | 'practice'): LessonImportPreview => {
  const hint = type === 'quiz' ? 'Quiz' : 'Practice'
  const instructionMarker = paragraphs.find((paragraph) => /^(Article|Quiz|Practice) template instructions$/i.test(paragraph.text))?.text
  if (instructionMarker && !new RegExp(`^${hint}`, 'i').test(instructionMarker)) return preview(`This file is a ${instructionMarker.split(' ')[0]} template, not a ${hint} template.`)
  const lessonTypeMarker = paragraphs.find(({ text }) => /^LESSON TYPE: (QUIZ|PRACTICE)$/i.test(text))?.text
  if (lessonTypeMarker && !lessonTypeMarker.toLowerCase().endsWith(hint.toLowerCase())) return preview(`This file is marked as ${lessonTypeMarker.split(': ')[1]}, not ${hint}. Choose the matching lesson type to import it.`)
  if (!lessonTypeMarker) return preview(`The ${hint} template is missing its required LESSON TYPE marker. Download a fresh ${hint} template.`)

  const titleHeadings = paragraphs.filter(({ heading }) => heading === 1)
  const questionHeadings = paragraphs.filter(({ heading, text }) => heading === 2 && /^Question\s+\d+$/i.test(text))
  const otherHeadings = paragraphs.filter(({ heading, text }) => heading !== null && heading !== 1 && !(heading === 2 && /^Question\s+\d+$/i.test(text)))
  const wrongLevelQuestion = paragraphs.find(({ heading, text }) => heading !== 2 && /^Question\s+\d+$/i.test(text))
  if (wrongLevelQuestion) return preview(`${wrongLevelQuestion.text} must use Heading 2 in the ${hint} template.`)
  if (otherHeadings.length) return preview(`The ${hint} template requires the lesson title as Heading 1 and each Question heading as Heading 2.`)
  if (titleHeadings.length !== 1) return preview(`The ${hint} template must contain exactly one Heading 1 lesson title.`)
  const title = titleHeadings[0].text
  if (!title || isPlaceholder(title)) return preview(`Enter a non-empty lesson title in the ${hint} template's Heading 1 line.`)
  if (!questionHeadings.length) return preview(`The ${hint} template must contain at least one Heading 2 named Question 1. If this is an Article document, choose Article to import it.`)

  const issues: string[] = []
  if (questionHeadings.some((heading, index) => Number(heading.text.match(/\d+/)?.[0]) !== index + 1)) issues.push('Question headings are not numbered consecutively; valid question blocks will still be checked and imported.')
  const questions = questionHeadings.flatMap((heading, index) => {
    const start = paragraphs.indexOf(heading) + 1
    const nextHeading = questionHeadings[index + 1]
    const end = nextHeading ? paragraphs.indexOf(nextHeading) : paragraphs.length
    const parsed = parseQuestionBlock(heading.text, paragraphs.slice(start, end), issues)
    return parsed ? [parsed] : []
  })
  return { title, articleBody: '', questions, issues, fatalError: questions.length ? null : `No valid questions were found. ${issues.join(' ')}` }
}

export const parseLessonParagraphs = (type: ImportableLessonType, paragraphs: LessonParagraph[]): LessonImportPreview => type === 'article' ? parseArticle(paragraphs) : parseQuizOrPractice(paragraphs, type)

const parseLessonXml = (type: ImportableLessonType, xml: string): LessonImportPreview => {
  const xmlDocument = new DOMParser().parseFromString(xml, 'application/xml')
  if (xmlDocument.querySelector('parsererror')) return preview('This DOCX contains invalid document XML. Download a fresh template and try again.')
  const paragraphs = Array.from(xmlDocument.getElementsByTagNameNS(wordNamespace, 'p')).map((element): LessonParagraph => {
    const style = element.getElementsByTagNameNS(wordNamespace, 'pStyle')[0]?.getAttributeNS(wordNamespace, 'val')?.toLowerCase()
    const outline = element.getElementsByTagNameNS(wordNamespace, 'outlineLvl')[0]?.getAttributeNS(wordNamespace, 'val')
    const styleLevel = style?.match(/^heading(\d+)$/)?.[1]
    const heading = styleLevel ? Number(styleLevel) : outline !== undefined ? Number(outline) + 1 : null
    const text = Array.from(element.getElementsByTagNameNS(wordNamespace, 't')).map((run) => run.textContent ?? '').join('').replace(/\u00a0/g, ' ').trim()
    return { text, heading }
  })
  return parseLessonParagraphs(type, paragraphs)
}

export const parseLessonDocx = async (type: ImportableLessonType, arrayBuffer: ArrayBuffer): Promise<LessonImportPreview> => {
  try {
    const archive = await JSZip.loadAsync(arrayBuffer)
    const documentFile = archive.file('word/document.xml')
    if (!documentFile) return preview('This file is not a valid DOCX document. Download a fresh template and try again.')
    return parseLessonXml(type, await documentFile.async('text'))
  } catch {
    return preview('This file could not be read as a DOCX document. Download a fresh template and try again.')
  }
}
