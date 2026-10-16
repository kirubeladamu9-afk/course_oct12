import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { type FC, useEffect, useState } from 'react'
import { getSyllabusTopics, type SyllabusTopic } from '@/services/api'
import { type AdminLesson } from './admin-data'

const label = 'Syllabus topics covered (optional)'

const SyllabusTopicPicker: FC<{ grade: number; lesson: AdminLesson; updateLessonDraft: (lesson: AdminLesson) => void }> = ({ grade, lesson, updateLessonDraft }) => {
  const [topics, setTopics] = useState<SyllabusTopic[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setTopics(null)
    getSyllabusTopics(grade)
      .then((records) => { if (active) setTopics(records) })
      .catch((reason) => { if (active) setLoadError(reason instanceof Error ? reason.message : 'Unable to load official topics.') })
    return () => { active = false }
  }, [grade])

  if (loadError) return <FormHelperText error>{loadError}</FormHelperText>
  if (!topics) return <CircularProgress size={20} aria-label="Loading official syllabus topics" />

  const selectedIds = (lesson.syllabusTopicIds ?? []).filter((id) => topics.some((topic) => topic.id === id))

  return (
    <FormControl fullWidth disabled={topics.length === 0}>
      <InputLabel id="syllabus-topics-covered-label">{label}</InputLabel>
      <Select
        multiple
        labelId="syllabus-topics-covered-label"
        label={label}
        value={selectedIds}
        onChange={(event) => updateLessonDraft({ ...lesson, syllabusTopicIds: (event.target.value as number[]).map(Number) })}
        renderValue={(ids) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{ids.map((id) => <Chip key={id} size="small" label={topics.find((topic) => topic.id === id)?.title ?? id} />)}</Box>}
      >
        {topics.map((topic) => <MenuItem key={topic.id} value={topic.id}>{topic.title}</MenuItem>)}
      </Select>
      <FormHelperText>{topics.length === 0 ? `No official topics for Grade ${grade} yet. An admin can add them under Syllabus Topics.` : `Official Grade ${grade} topics this lesson covers. Leave empty if it covers none.`}</FormHelperText>
    </FormControl>
  )
}

export default SyllabusTopicPicker
