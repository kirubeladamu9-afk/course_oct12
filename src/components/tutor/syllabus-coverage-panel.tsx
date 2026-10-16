import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useState } from 'react'
import { type AdminModule } from '@/components/admin/admin-data'
import { countSyllabusCoverage, getSyllabusCoverage, SYLLABUS_COVERAGE_LABELS, type SyllabusCoverageStatus } from '@/components/course/syllabus-coverage'
import { getSyllabusTopics, type SyllabusTopic, type TutorClassStudent } from '@/services/api'

const statusColor: Record<SyllabusCoverageStatus, 'success' | 'warning' | 'error'> = {
  covered: 'success',
  in_progress: 'warning',
  not_covered: 'error',
}

const statusBorderColor: Record<SyllabusCoverageStatus, string> = {
  covered: 'success.main',
  in_progress: 'warning.main',
  not_covered: 'error.main',
}

const classView = 'class'

const SyllabusCoveragePanel = ({ grade, modules, students }: { grade: number; modules: AdminModule[]; students: TutorClassStudent[] }) => {
  const [topics, setTopics] = useState<SyllabusTopic[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [view, setView] = useState<number | typeof classView>(classView)

  useEffect(() => {
    let active = true
    setTopics(null)
    setLoadError(null)
    getSyllabusTopics(grade)
      .then((records) => { if (active) setTopics(records) })
      .catch((reason) => { if (active) setLoadError(reason instanceof Error ? reason.message : 'Unable to load official topics.') })
    return () => { active = false }
  }, [grade])

  const coverage = useMemo(() => {
    if (!topics) return []
    const scopedStudents = view === classView ? students : students.filter((student) => student.id === view)
    return getSyllabusCoverage({
      topics,
      lessons: modules.flatMap((module) => module.lessons),
      students: scopedStudents,
    })
  }, [topics, modules, students, view])

  const summary = countSyllabusCoverage(coverage)

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 3, border: 1, borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6">Syllabus coverage</Typography>
          <Typography variant="body2" color="text.secondary">Official Grade {grade} Ministry topics, checked against the lessons you tagged in this class. Separate from course completion.</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
          <InputLabel id="syllabus-coverage-view-label">View</InputLabel>
          <Select labelId="syllabus-coverage-view-label" label="View" value={view} onChange={(event) => setView(event.target.value === classView ? classView : Number(event.target.value))}>
            <MenuItem value={classView}>Whole class</MenuItem>
            {students.map((student) => <MenuItem key={student.id} value={student.id}>{student.studentName}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {!topics && !loadError && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} aria-label="Loading official syllabus topics" /><Typography color="text.secondary">Loading official topics...</Typography></Stack>}
      {loadError && <Alert severity="error">{loadError}</Alert>}
      {topics && topics.length === 0 && <Typography color="text.secondary">No official topics for Grade {grade} have been added yet.</Typography>}

      {topics && topics.length > 0 && <Stack spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{summary.covered} of {summary.total} official topics covered</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            <Chip size="small" color="success" label={`${summary.covered} covered`} />
            <Chip size="small" color="warning" label={`${summary.inProgress} in progress`} />
            <Chip size="small" color="error" label={`${summary.notCovered} not covered`} />
          </Stack>
        </Box>

        {students.length === 0 && <Typography variant="body2" color="text.secondary">Coverage will count students once they enroll in this class.</Typography>}

        <Stack spacing={1}>
          {coverage.map(({ topic, status, taggedLessonCount }) => (
            <Stack key={topic.id} direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderLeft: 4, borderLeftColor: statusBorderColor[status] }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{topic.title}</Typography>
                <Typography variant="caption" color="text.secondary">{taggedLessonCount === 0 ? 'No lessons tagged' : `Tagged in ${taggedLessonCount} ${taggedLessonCount === 1 ? 'lesson' : 'lessons'}`}</Typography>
              </Box>
              <Chip size="small" label={SYLLABUS_COVERAGE_LABELS[status]} color={statusColor[status]} sx={{ flexShrink: 0 }} />
            </Stack>
          ))}
        </Stack>
      </Stack>}
    </Paper>
  )
}

export default SyllabusCoveragePanel
