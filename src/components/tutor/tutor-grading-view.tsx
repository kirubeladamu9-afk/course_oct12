import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { useEffect, useMemo, useState } from 'react'
import { getTutorQuizSubmissions, type TutorQuizSubmission } from '@/services/api'

type LearnerResult = { key: string; studentName: string; studentEmail: string; lessonTitle: string; attempts: TutorQuizSubmission[]; best: TutorQuizSubmission }
type ContentGroup = { key: string; contentType: TutorQuizSubmission['contentType']; title: string; attempts: TutorQuizSubmission[]; results: LearnerResult[] }

const PAGE_SIZE = 10

const formatDate = (value: string) => new Date(value).toLocaleString()

const getSubmittedAnswer = (selectedOption: number | null, options: string[]) => selectedOption === null ? 'No answer' : options[selectedOption] ?? 'No answer'

const buildResults = (attempts: TutorQuizSubmission[]): LearnerResult[] => {
  const attemptsByLearnerQuiz = new Map<string, TutorQuizSubmission[]>()
  for (const attempt of attempts) {
    const key = `${attempt.studentId}-${attempt.lessonId}`
    attemptsByLearnerQuiz.set(key, [...(attemptsByLearnerQuiz.get(key) ?? []), attempt])
  }
  return [...attemptsByLearnerQuiz.entries()].map(([key, learnerAttempts]) => {
    const newestFirst = [...learnerAttempts].sort((first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime())
    const best = newestFirst.reduce((top, current) => current.score > top.score ? current : top, newestFirst[0])
    return { key, studentName: best.studentName, studentEmail: best.studentEmail, lessonTitle: best.lessonTitle, attempts: newestFirst, best }
  })
}

const countUniqueStudents = (attempts: TutorQuizSubmission[]) => new Set(attempts.map((attempt) => attempt.studentId)).size

const averageBestScore = (results: LearnerResult[]) => results.length
  ? Math.round(results.reduce((total, result) => total + result.best.score, 0) / results.length)
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
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null)
  const [page, setPage] = useState(1)

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
    const byKey = new Map<string, TutorQuizSubmission[]>()
    for (const submission of submissions) {
      const key = `${submission.contentType}-${submission.contentId}`
      byKey.set(key, [...(byKey.get(key) ?? []), submission])
    }
    return [...byKey.entries()]
      .map(([key, attempts]) => ({ key, contentType: attempts[0].contentType, title: attempts[0].contentTitle, attempts, results: buildResults(attempts) }))
      .sort((first, second) => first.title.localeCompare(second.title))
  }, [submissions])

  const allResults = useMemo(() => buildResults(submissions), [submissions])
  const query = search.trim().toLowerCase()
  const visibleGroups = groups
    .filter((group) => groupFilter === 'all' || group.key === groupFilter)
    .map((group) => ({
      ...group,
      visibleResults: group.results.filter((result) => `${result.studentName} ${result.studentEmail} ${result.lessonTitle} ${group.title}`.toLowerCase().includes(query)),
    }))
    .filter((group) => group.visibleResults.length > 0)

  const flatRows = visibleGroups.flatMap((group) => group.visibleResults.map((result) => ({ group, result })))
  const pageCount = Math.max(1, Math.ceil(flatRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageGroups = flatRows.slice(pageStart, pageStart + PAGE_SIZE).reduce<Array<ContentGroup & { visibleResults: LearnerResult[] }>>((acc, { group, result }) => {
    const last = acc[acc.length - 1]
    if (last && last.key === group.key) last.visibleResults.push(result)
    else acc.push({ ...group, visibleResults: [result] })
    return acc
  }, [])

  const toggleResult = (rowKey: string) => {
    setExpandedKey(expandedKey === rowKey ? null : rowKey)
    setSelectedAttemptId(null)
  }

  return <>
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="h4" sx={{ mb: 0.75 }}>Grading</Typography>
      <Typography color="text.secondary">Quizzes are graded automatically. Each learner&apos;s retakes are grouped under one result per quiz, showing their best score.</Typography>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
      <SummaryCard label="Quiz results" value={allResults.length} />
      <SummaryCard label="Quiz takers" value={countUniqueStudents(submissions)} />
      <SummaryCard label="Courses" value={groups.filter((group) => group.contentType === 'course').length} />
      <SummaryCard label="Classes" value={groups.filter((group) => group.contentType === 'class').length} />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
      <TextField fullWidth value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search student, course, or quiz..." inputProps={{ 'aria-label': 'Search results' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon color="action" /></InputAdornment> }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
      <FormControl sx={{ minWidth: { xs: '100%', sm: 260 } }}>
        <Select value={groupFilter} onChange={(event) => { setGroupFilter(event.target.value); setPage(1) }} startAdornment={<InputAdornment position="start"><FilterListOutlinedIcon color="action" /></InputAdornment>} IconComponent={KeyboardArrowDownRoundedIcon} inputProps={{ 'aria-label': 'Course or class filter' }} sx={{ borderRadius: 2.5, height: 56 }}>
          <MenuItem value="all">All courses and classes</MenuItem>
          {groups.map((group) => <MenuItem key={group.key} value={group.key}>{group.contentType === 'class' ? 'Class' : 'Course'}: {group.title}</MenuItem>)}
        </Select>
      </FormControl>
    </Stack>
    {error && <Paper sx={{ p: 2, mb: 2, border: 1, borderColor: 'error.main' }}><Typography color="error">{error}</Typography></Paper>}
    {loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} aria-label="Loading results" /><Typography color="text.secondary">Loading results...</Typography></Stack>}
    {!loading && visibleGroups.length === 0 && <Typography color="text.secondary">No quiz results match these filters.</Typography>}
    <Stack spacing={2.5}>
      {pageGroups.map((group) => {
        const retakes = group.attempts.length - group.results.length
        return <Paper key={group.key} elevation={0} sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1.5} sx={{ p: 2.5, backgroundColor: 'background.default' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Chip size="small" label={group.contentType === 'class' ? 'Class' : 'Course'} color="primary" variant="outlined" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{group.title}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`${group.results.length} quiz results`} variant="outlined" />
              <Chip size="small" label={`${countUniqueStudents(group.attempts)} quiz takers`} variant="outlined" />
              <Chip size="small" label={`${retakes} retakes`} variant="outlined" />
              <Chip size="small" label={`${group.results.filter((result) => result.best.passed).length} passed`} color="success" variant="outlined" />
              <Chip size="small" label={`Average ${averageBestScore(group.results)}%`} variant="outlined" />
            </Stack>
          </Stack>
          <Divider />
          {group.visibleResults.map((result, index) => {
            const rowKey = `${group.key}:${result.key}`
            const isExpanded = expandedKey === rowKey
            const shownAttempt = result.attempts.find((attempt) => attempt.id === selectedAttemptId) ?? result.attempts[0]
            return <Box key={rowKey}>
              {index > 0 && <Divider />}
              <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ p: 2.5 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{result.studentName}</Typography>
                  <Typography variant="body2" color="text.secondary">{result.studentEmail}</Typography>
                  <Typography variant="body2" color="text.secondary">{result.lessonTitle} · Latest attempt {formatDate(result.attempts[0].submittedAt)}</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {result.attempts.length > 1 && <Chip size="small" label={`${result.attempts.length} attempts`} variant="outlined" />}
                  <Chip size="small" label={`Best ${result.best.score}%`} variant="outlined" />
                  <Chip size="small" label={result.best.passed ? 'Passed' : 'Not passed'} color={result.best.passed ? 'success' : 'error'} variant="outlined" />
                  <Button variant="outlined" onClick={() => toggleResult(rowKey)}>{isExpanded ? 'Hide attempts' : 'View attempts'}</Button>
                </Stack>
              </Stack>
              {isExpanded && <Stack spacing={1.5} sx={{ px: 2.5, pb: 2.5 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {result.attempts.map((attempt, attemptIndex) => <Button key={attempt.id} size="small" variant={attempt.id === shownAttempt.id ? 'contained' : 'outlined'} onClick={() => setSelectedAttemptId(attempt.id)}>
                    Attempt {result.attempts.length - attemptIndex} · {attempt.score}% · {formatDate(attempt.submittedAt)}
                  </Button>)}
                </Stack>
                {shownAttempt.questions.map((question, questionIndex) => <Paper key={question.id} elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{questionIndex + 1}. {question.question}</Typography>
                    <Chip size="small" label={question.isCorrect ? 'Correct' : 'Incorrect'} color={question.isCorrect ? 'success' : 'error'} variant="outlined" />
                  </Stack>
                  <Typography variant="body2"><Box component="span" sx={{ fontWeight: 700 }}>Submitted answer:</Box> {getSubmittedAnswer(question.selectedOption, question.options)}</Typography>
                  <Typography variant="body2"><Box component="span" sx={{ fontWeight: 700 }}>Correct answer:</Box> {question.options[question.correctOption]}</Typography>
                </Paper>)}
              </Stack>}
            </Box>
          })}
        </Paper>
      })}
    </Stack>
    {flatRows.length > 0 && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={1.5} sx={{ mt: 2.5 }}>
      <Typography variant="body2" color="text.secondary">Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, flatRows.length)} of {flatRows.length} results</Typography>
      {pageCount > 1 && <Pagination count={pageCount} page={currentPage} onChange={(_, value) => setPage(value)} color="primary" shape="rounded" />}
    </Stack>}
  </>
}
