import { Document, HeadingLevel, Packer, Paragraph } from 'docx'
import JSZip from 'jszip'
import type { ArticleContentBlock } from './admin-data'

export type ImportableLessonType = 'article' | 'quiz' | 'practice'

export interface ImportedQuestion {
  number: number
  question: string
  topic: string
  options: string[]
  correctOption: number
  questionImageMarker?: string
  questionImage?: string
  optionImageMarkers: Array<string | undefined>
  optionImages?: Array<string | undefined>
  explanation: string
  explanationImageMarker?: string
  explanationImage?: string
}

export interface LessonImportPreview {
  title: string
  articleBody: string
  articleBlocks: ArticleContentBlock[]
  questions: ImportedQuestion[]
  issues: string[]
  fatalError: string | null
}

export type LessonParagraphPart = { type: 'text'; text: string } | { type: 'image'; imageUrl?: string; marker?: string }

export interface LessonParagraph {
  text: string
  heading: number | null
  parts?: LessonParagraphPart[]
}

const docxMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const paragraph = (text: string, heading?: typeof HeadingLevel[keyof typeof HeadingLevel]) => new Paragraph({ text, ...(heading ? { heading } : {}) })

const questionTemplateParagraphs = (type: 'quiz' | 'practice') => {
  const name = type === 'quiz' ? 'Quiz' : 'Practice'
  return [
    paragraph(`${name} template instructions`),
    paragraph('Replace the Heading 1 text with the lesson title. Keep each question as a Heading 2 named Question 1, Question 2, and so on.'),
    paragraph(type === 'quiz' ? 'For each question use: Question: text, Topic: name, optional Question image: [IMAGE: description], options A. and B. (add more if needed), optional A image: [IMAGE: description] after that option, Correct: one option letter, optional Explanation: text, and optional Explanation image: [IMAGE: description]. Image lines create upload slots in the import review.' : 'For every question, use one paragraph per line in this exact order: Question: text, Topic: name, options labeled A. and B. (add C. and more if needed), Correct: one option letter, and optional Explanation: text.'),
    paragraph('At least two non-empty options and exactly one valid Correct: letter are required. Empty question blocks are ignored. The filled first question is an example; replace it or remove it.'),
    paragraph(`LESSON TYPE: ${name.toUpperCase()}`),
    paragraph('[Enter lesson title]', HeadingLevel.HEADING_1),
    paragraph('Question 1', HeadingLevel.HEADING_2),
    paragraph('Question: What is 2 + 2?'),
    paragraph('Topic: Arithmetic'),
    ...(type === 'quiz' ? [paragraph('Question image: [IMAGE: number line or equation]')] : []),
    paragraph('A. 3'),
    ...(type === 'quiz' ? [paragraph('A image: [IMAGE: first answer illustration]')] : []),
    paragraph('B. 4'),
    ...(type === 'quiz' ? [paragraph('B image: [IMAGE: correct answer illustration]')] : []),
    paragraph('Correct: B'),
    paragraph('Explanation: Four is the sum of two and two.'),
    ...(type === 'quiz' ? [paragraph('Explanation image: [IMAGE: visual proof or worked solution]')] : []),
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
      paragraph('Embedded JPG, PNG, GIF, and WebP images are imported inline. You can also request an image with a standalone line such as [IMAGE: a close view of Jupiter]; that marker becomes an upload slot during import.'),
      paragraph('LESSON TYPE: ARTICLE'),
      paragraph('[Enter lesson title]', HeadingLevel.HEADING_1),
      paragraph('[Enter article content here]'),
      paragraph('[Enter subsection title]', HeadingLevel.HEADING_2),
      paragraph('[Enter subsection content here]'),
      paragraph('[IMAGE: add a short description of the image needed here]'),
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
const preview = (fatalError: string, title = ''): LessonImportPreview => ({ title, articleBody: '', articleBlocks: [], questions: [], issues: [], fatalError })
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
    'Embedded JPG, PNG, GIF, and WebP images are imported inline. You can also request an image with a standalone line such as [IMAGE: a close view of Jupiter]; that marker becomes an upload slot during import.',
    'LESSON TYPE: ARTICLE',
  ]
  const leadingContent = paragraphs.slice(0, titleIndex).filter(({ text }) => text && !instructions.includes(text))
  if (leadingContent.length) return preview('Article content must come after the Heading 1 lesson title.')

  const title = titleHeadings[0].text
  if (!title || isPlaceholder(title)) return preview('Enter a non-empty lesson title in the Heading 1 line.')
  const unexpectedHeading = paragraphs.slice(titleIndex + 1).find(({ heading }) => heading !== null && heading > 2)
  if (unexpectedHeading) return preview('The Article template contains an unsupported heading level. Use Heading 2 for subsections.')
  const content = paragraphs.slice(titleIndex + 1).filter(({ text, parts }) => (text || parts?.some((part) => part.type === 'image')) && !/^\[Enter (?:lesson title|article content here|subsection title|subsection content here)\]$/i.test(text.trim()) && !/^\[IMAGE:\s*add a short description of the image needed here\]$/i.test(text.trim()))
  const articleBlocks: ArticleContentBlock[] = []
  const paragraphIndexes: number[] = []
  const pushBlock = (block: ArticleContentBlock, paragraphIndex: number) => {
    articleBlocks.push(block)
    paragraphIndexes.push(paragraphIndex)
  }
  content.forEach(({ text, heading, parts }, paragraphIndex) => {
    const imageMarker = text.match(/^\[IMAGE:\s*(.*?)\]$/i)
    if (imageMarker) {
      pushBlock({ type: 'image', marker: imageMarker[1].trim(), caption: '' }, paragraphIndex)
      return
    }
    if (heading === 2) {
      pushBlock({ type: 'heading', text }, paragraphIndex)
      for (const part of parts ?? []) if (part.type === 'image') pushBlock({ type: 'image', imageUrl: part.imageUrl, marker: part.marker, caption: '' }, paragraphIndex)
      return
    }
    let textBuffer = ''
    const flushText = () => {
      const value = textBuffer.trim()
      if (value) pushBlock({ type: 'text', text: value }, paragraphIndex)
      textBuffer = ''
    }
    for (const part of parts ?? [{ type: 'text' as const, text }]) {
      if (part.type === 'text') textBuffer += part.text
      else {
        flushText()
        pushBlock({ type: 'image', imageUrl: part.imageUrl, marker: part.marker, caption: '' }, paragraphIndex)
      }
    }
    flushText()
  })
  for (let index = 0; index < articleBlocks.length; index += 1) {
    const image = articleBlocks[index]
    const following = articleBlocks[index + 1]
    if (image.type !== 'image' || following?.type !== 'text' || paragraphIndexes[index + 1] !== paragraphIndexes[index] + 1) continue
    const caption = following.text.trim()
    if (caption.length <= 120 && !/[.!?].+[.!?]/.test(caption)) {
      image.caption = caption
      articleBlocks.splice(index + 1, 1)
      paragraphIndexes.splice(index + 1, 1)
    }
  }
  return { title, articleBody: articleBlocks.filter((block) => block.type !== 'image').map((block) => block.text).join('\n'), articleBlocks, questions: [], issues: [], fatalError: null }
}

const getImageMarker = (value: string) => value.match(/^\[IMAGE:\s*(.*?)\]$/i)?.[1].trim() || undefined

const parseQuestionBlock = (heading: string, paragraphs: LessonParagraph[], issues: string[]) => {
  const number = Number(heading.match(/\d+/)?.[0] ?? 0)
  const labelValues = new Map<string, string[]>()
  const options: Array<{ label: string; value: string }> = []
  const optionImageValues = new Map<string, string[]>()
  const lineKinds: string[] = []
  let questionImageValues: string[] = []
  let explanationImageValues: string[] = []
  let questionImage: string | undefined
  let explanationImage: string | undefined
  const optionImages = new Map<string, string>()
  const invalidImageMarkers: string[] = []
  let malformedOption = false
  let unexpectedLine = false

  for (const { text: line, parts } of paragraphs) {
    const embeddedImage = parts?.find((part): part is Extract<LessonParagraphPart, { type: 'image' }> => part.type === 'image')
    if (!line && !embeddedImage) continue
    const imageLabelMatch = line.match(/^(Question|Explanation) image:\s*(.*)$/i)
    if (imageLabelMatch) {
      const key = imageLabelMatch[1].toLowerCase()
      const value = imageLabelMatch[2].trim()
      lineKinds.push(`${key}-image`)
      if (value && !getImageMarker(value) && !embeddedImage) invalidImageMarkers.push(`${key} image`)
      if (key === 'question') {
        questionImageValues.push(value || embeddedImage?.marker || '')
        questionImage = embeddedImage?.imageUrl ?? questionImage
      } else {
        explanationImageValues.push(value || embeddedImage?.marker || '')
        explanationImage = embeddedImage?.imageUrl ?? explanationImage
      }
      continue
    }
    const optionImageMatch = line.match(/^([A-Z]) image:\s*(.*)$/i)
    if (optionImageMatch) {
      const key = optionImageMatch[1].toUpperCase()
      const value = optionImageMatch[2].trim()
      lineKinds.push('option-image')
      if (value && !getImageMarker(value) && !embeddedImage) invalidImageMarkers.push(`${key} image`)
      optionImageValues.set(key, [...(optionImageValues.get(key) ?? []), value || embeddedImage?.marker || ''])
      if (embeddedImage?.imageUrl) optionImages.set(key, embeddedImage.imageUrl)
      continue
    }
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
  const imageValues = [...questionImageValues, ...explanationImageValues, ...Array.from(optionImageValues.values()).flat()]
  const allValues = [...questionValues, ...topicValues, ...options.map(({ value }) => value), ...correctValues, ...explanationValues, ...imageValues]
  const allEmpty = allValues.every((value) => !value || isPlaceholder(value)) && !malformedOption && !unexpectedLine
  if (allEmpty) return null

  const errors: string[] = []
  if (questionValues.length !== 1 || !questionValues[0] || isPlaceholder(questionValues[0])) errors.push(questionValues.length > 1 ? 'has multiple Question: lines' : 'has no non-empty Question: line')
  if (topicValues.length !== 1 || !topicValues[0] || isPlaceholder(topicValues[0])) errors.push(topicValues.length > 1 ? 'has multiple Topic: lines' : 'has no non-empty Topic: line')
  if (lineKinds[0] !== 'question' || lineKinds[1] !== 'topic') errors.push('must start with Question: then Topic: before the answer options')
  const lastOptionLineIndex = Math.max(lineKinds.lastIndexOf('option'), lineKinds.lastIndexOf('option-image'))
  const correctLineIndex = lineKinds.indexOf('correct')
  if (correctLineIndex !== -1 && correctLineIndex !== lastOptionLineIndex + 1) errors.push('must place Correct: immediately after the answer options and their image slots')
  if (lineKinds.includes('explanation-image') && (lineKinds.lastIndexOf('explanation-image') !== lineKinds.length - 1 || !lineKinds.includes('explanation'))) errors.push('must place Explanation image: after Explanation:')
  if (lineKinds.includes('explanation') && lineKinds.indexOf('explanation') < correctLineIndex) errors.push('must place optional Explanation: after Correct:')
  if (options.filter(({ value }) => value && !isPlaceholder(value)).length < 2) errors.push('must have at least two non-empty options')
  if (malformedOption) errors.push('has a malformed option list; use A. option text, B. option text, and so on')
  if (new Set(options.map(({ label }) => label)).size !== options.length) errors.push('has duplicate option labels')
  if (options.some(({ value }) => !value || isPlaceholder(value))) errors.push('has an empty option')
  if (options.some(({ label }, index) => label !== String.fromCharCode(65 + index))) errors.push('option labels must be consecutive starting with A.')
  if (questionImageValues.length > 1) errors.push('has multiple Question image: lines')
  if (explanationImageValues.length > 1) errors.push('has multiple Explanation image: lines')
  for (const [label, values] of optionImageValues) {
    if (!options.some((option) => option.label === label)) errors.push(`has an image slot for missing option ${label}`)
    if (values.length > 1) errors.push(`has multiple ${label} image: lines`)
  }
  if (invalidImageMarkers.length) errors.push(`${invalidImageMarkers.join(' and ')} must use [IMAGE: description] or contain an embedded image`)
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
  const optionImageMarkers = options.map(({ label }) => getImageMarker(optionImageValues.get(label)?.[0] ?? '') ?? (optionImageValues.get(label)?.[0] || undefined))
  return { number, question: questionValues[0], topic: topicValues[0], options: options.map(({ value }) => value), correctOption, questionImageMarker: getImageMarker(questionImageValues[0] ?? '') ?? (questionImageValues[0] || undefined), questionImage, optionImageMarkers, optionImages: options.map(({ label }) => optionImages.get(label)), explanation: explanationValues[0] ?? '', explanationImageMarker: getImageMarker(explanationImageValues[0] ?? '') ?? (explanationImageValues[0] || undefined), explanationImage }
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
  return { title, articleBody: '', articleBlocks: [], questions, issues, fatalError: questions.length ? null : `No valid questions were found. ${issues.join(' ')}` }
}

export const parseLessonParagraphs = (type: ImportableLessonType, paragraphs: LessonParagraph[]): LessonImportPreview => type === 'article' ? parseArticle(paragraphs) : parseQuizOrPractice(paragraphs, type)

const relationshipsNamespace = 'http://schemas.openxmlformats.org/package/2006/relationships'
const drawingNamespace = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const relationshipNamespace = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const imageMimeTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }

const normalizeZipPath = (target: string) => {
  const segments: string[] = []
  for (const segment of target.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }
  return segments.join('/')
}

const parseLessonXml = async (type: ImportableLessonType, xml: string, archive: JSZip): Promise<LessonImportPreview> => {
  const xmlDocument = new DOMParser().parseFromString(xml, 'application/xml')
  if (xmlDocument.querySelector('parsererror')) return preview('This DOCX contains invalid document XML. Download a fresh template and try again.')
  const relationships = new Map<string, { target: string; external: boolean }>()
  if (type !== 'practice') {
    const relationshipFile = archive.file('word/_rels/document.xml.rels')
    if (relationshipFile) {
      const relationshipXml = new DOMParser().parseFromString(await relationshipFile.async('text'), 'application/xml')
      Array.from(relationshipXml.getElementsByTagNameNS(relationshipsNamespace, 'Relationship')).forEach((relationship) => {
        const id = relationship.getAttribute('Id')
        const target = relationship.getAttribute('Target')
        if (id && target) relationships.set(id, { target, external: relationship.getAttribute('TargetMode') === 'External' })
      })
    }
  }
  const paragraphs = await Promise.all(Array.from(xmlDocument.getElementsByTagNameNS(wordNamespace, 'p')).map(async (element): Promise<LessonParagraph> => {
    const style = element.getElementsByTagNameNS(wordNamespace, 'pStyle')[0]?.getAttributeNS(wordNamespace, 'val')?.toLowerCase()
    const outline = element.getElementsByTagNameNS(wordNamespace, 'outlineLvl')[0]?.getAttributeNS(wordNamespace, 'val')
    const styleLevel = style?.match(/^heading(\d+)$/)?.[1]
    const heading = styleLevel ? Number(styleLevel) : outline !== undefined ? Number(outline) + 1 : null
    if (type === 'practice') {
      const text = Array.from(element.getElementsByTagNameNS(wordNamespace, 't')).map((run) => run.textContent ?? '').join('').replace(/\u00a0/g, ' ').trim()
      return { text, heading }
    }
    const parts: LessonParagraphPart[] = []
    const appendText = (text: string) => {
      if (!text) return
      const previous = parts[parts.length - 1]
      if (previous?.type === 'text') previous.text += text
      else parts.push({ type: 'text', text })
    }
    const visit = async (node: Node): Promise<void> => {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).namespaceURI === wordNamespace && (node as Element).localName === 't') {
        appendText(node.textContent ?? '')
        return
      }
      if (node.nodeType === Node.ELEMENT_NODE && (((node as Element).namespaceURI === drawingNamespace && (node as Element).localName === 'blip') || ((node as Element).namespaceURI === wordNamespace && (node as Element).localName === 'imagedata'))) {
        const elementNode = node as Element
        const relationshipId = elementNode.getAttributeNS(relationshipNamespace, 'embed') || elementNode.getAttributeNS(relationshipNamespace, 'id')
        const relationship = relationshipId ? relationships.get(relationshipId) : undefined
        let imageUrl: string | undefined
        if (relationship && !relationship.external) {
          const target = normalizeZipPath(relationship.target.startsWith('/') ? relationship.target.slice(1) : `word/${relationship.target}`)
          const extension = target.split('.').pop()?.toLowerCase() ?? ''
          const media = target.startsWith('word/media/') && imageMimeTypes[extension] ? archive.file(target) : null
          if (media) imageUrl = `data:${imageMimeTypes[extension]};base64,${await media.async('base64')}`
        }
        parts.push({ type: 'image', imageUrl, marker: imageUrl ? undefined : 'Embedded image from DOCX' })
        return
      }
      for (const child of Array.from(node.childNodes)) await visit(child)
    }
    await visit(element)
    const text = parts.filter((part): part is Extract<LessonParagraphPart, { type: 'text' }> => part.type === 'text').map((part) => part.text).join('').replace(/\u00a0/g, ' ').trim()
    return { text, heading, parts }
  }))
  return parseLessonParagraphs(type, paragraphs)
}

export const parseLessonDocx = async (type: ImportableLessonType, arrayBuffer: ArrayBuffer): Promise<LessonImportPreview> => {
  try {
    const archive = await JSZip.loadAsync(arrayBuffer)
    const documentFile = archive.file('word/document.xml')
    if (!documentFile) return preview('This file is not a valid DOCX document. Download a fresh template and try again.')
    return await parseLessonXml(type, await documentFile.async('text'), archive)
  } catch {
    return preview('This file could not be read as a DOCX document. Download a fresh template and try again.')
  }
}
