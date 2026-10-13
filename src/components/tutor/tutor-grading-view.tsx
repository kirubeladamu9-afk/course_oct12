import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { useEffect, useMemo, useState } from 'react'
import { getTutorQuizSubmissions, type TutorQuizSubmission } from '@/services/api'

type ContentGroup = { key: string; contentType: TutorQuizSubmission['contentType']; title: string; submissions: TutorQuizSubmission[] }

const formatDate = (value: string) => new Date(value).toLocaleString()

const getSubmittedAnswer = (selectedOption: number | null, options: string[]) => selectedOption === null ? 'No answer' : options[selectedOption] ?? 'No answer'

const countQuizTakers = (submissions: TutorQuizSubmission[]) => new Set(submissions.map((submission) => submission.studentId)).size

const averageScore = (submissions: TutorQuizSubmission[]) => submissions.length
  ? Math.round(submissions.reduce((total, submission) => total + submission.score, 0) / submissions.length)
  : 0

const SummaryCard = ({ label, value }: { label: string; value: number }) => <Paper elevation={0} sx={{ flex: 1, p: 2, border: 1, borderColor: 'divider' }}>
  <Typography variant="body2" color="text.secondary">{label}</Typography>
  <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}</Typography>
</Paper>

export const TutorGradingView = () => {
  const [submissions, setSubmissions] = useState<TutorQuizSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const loadSubmissions = async (background = false) => {
    if (!background) setLoading(true)
    try {
      setSubmissions(await getTutorQuizSubmissions())
      setError('')
    } catch (loadError) {
      if (background) return
      setError(loadError instanceof Error ? loadError.message : 'Unable to load submissions.')
    } finally {
      if (!background) setLoading(false)
    }
  }

  useEffect(() => {
    void loadSubmissions()
    const refresh = () => { void loadSubmissions(true) }
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const groups = useMemo<ContentGroup[]>(() => {
    const byKey = new Map<string, ContentGroup>()
    for (const submission of submissions) {
      const key = `${submission.contentType}-${submission.contentId}`
      const group = byKey.get(key) ?? { key, contentType: submission.contentType, title: submission.contentTitle, submissions: [] }
      group.submissions.push(submission)
      byKey.set(key, group)
    }
    return [...byKey.values()].sort((first, second) => first.title.localeCompare(second.title))
  }, [submissions])

  const query = search.trim().toLowerCase()
  const visibleGroups = groups
    .filter((group) => groupFilter === 'all' || group.key === groupFilter)
    .map((group) => ({
      ...group,
      visible: group.submissions.filter((submission) => `${submission.studentName} ${submission.studentEmail} ${submission.lessonTitle} ${submission.contentTitle}`.toLowerCase().includes(query)),
    }))
    .filter((group) => group.visible.length > 0)

  return <>
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="h4" sx={{ mb: 0.75 }}>Grading</Typography>
      <Typography color="text.secondary">Quizzes are graded automatically. Review each student&apos;s submitted answers against the correct answers, grouped by course or class.</Typography>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
      <SummaryCard label="Total submissions" value={submissions.length} />
      <SummaryCard label="Quiz takers" value={countQuizTakers(submissions)} />
      <SummaryCard label="Courses" value={groups.filter((group) => group.contentType === 'course').length} />
      <SummaryCard label="Classes" value={groups.filter((group) => group.contentType === 'class').length} />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
      <TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, course, or quiz..." inputProps={{ 'aria-label': 'Search submissions' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon color="action" /></InputAdornment> }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
      <FormControl sx={{ minWidth: { xs: '100%', sm: 260 } }}>
        <Select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} startAdornment={<InputAdornment position="start"><FilterListOutlinedIcon color="action" /></InputAdornment>} IconComponent={KeyboardArrowDownRoundedIcon} inputProps={{ 'aria-label': 'Course or class filter' }} sx={{ borderRadius: 2.5, height: 56 }}>
          <MenuItem value="all">All courses and classes</MenuItem>
          {groups.map((group) => <MenuItem key={group.key} value={group.key}>{group.contentType === 'class' ? 'Class' : 'Course'}: {group.title}</MenuItem>)}
        </Select>
      </FormControl>
    </Stack>
    {error && <Paper sx={{ p: 2, mb: 2, border: 1, borderColor: 'error.main' }}><Typography color="error">{error}</Typography></Paper>}
    {loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} aria-label="Loading submissions" /><Typography color="text.secondary">Loading submissions...</Typography></Stack>}
    {!loading && visibleGroups.length === 0 && <Typography color="text.secondary">No quiz submissions match these filters.</Typography>}
    <Stack spacing={2.5}>
      {visibleGroups.map((group) => <Paper key={group.key} elevation={0} sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1.5} sx={{ p: 2.5, backgroundColor: 'background.default' }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Chip size="small" label={group.contentType === 'class' ? 'Class' : 'Course'} color="primary" variant="outlined" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{group.title}</Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${group.submissions.length} submissions`} variant="outlined" />
            <Chip size="small" label={`${countQuizTakers(group.submissions)} quiz takers`} variant="outlined" />
            <Chip size="small" label={`${group.submissions.filter((submission) => submission.passed).length} passed`} color="success" variant="outlined" />
            <Chip size="small" label={`Average ${averageScore(group.submissions)}%`} variant="outlined" />
          </Stack>
        </Stack>
        <Divider />
        {group.visible.map((submission, index) => <Box key={submission.id}>
          {index > 0 && <Divider />}
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ p: 2.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>{submission.studentName}</Typography>
              <Typography variant="body2" color="text.secondary">{submission.studentEmail}</Typography>
              <Typography variant="body2" color="text.secondary">{submission.lessonTitle} · Submitted {formatDate(submission.submittedAt)}</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={`${submission.score}%`} variant="outlined" />
              <Chip size="small" label={submission.passed ? 'Passed' : 'Not passed'} color={submission.passed ? 'success' : 'error'} variant="outlined" />
              <Button variant="outlined" onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}>{expandedId === submission.id ? 'Hide answers' : 'View answers'}</Button>
            </Stack>
          </Stack>
          {expandedId === submission.id && <Stack spacing={1.5} sx={{ px: 2.5, pb: 2.5 }}>
            {submission.questions.map((question, questionIndex) => <Paper key={question.id} elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{questionIndex + 1}. {question.question}</Typography>
                <Chip size="small" label={question.isCorrect ? 'Correct' : 'Incorrect'} color={question.isCorrect ? 'success' : 'error'} variant="outlined" />
              </Stack>
              <Typography variant="body2"><Box component="span" sx={{ fontWeight: 700 }}>Submitted answer:</Box> {getSubmittedAnswer(question.selectedOption, question.options)}</Typography>
              <Typography variant="body2"><Box component="span" sx={{ fontWeight: 700 }}>Correct answer:</Box> {question.options[question.correctOption]}</Typography>
            </Paper>)}
          </Stack>}
        </Box>)}
      </Paper>)}
    </Stack>
  </>
}
