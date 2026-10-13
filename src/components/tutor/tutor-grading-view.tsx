import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
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
import { useEffect, useState } from 'react'
import { toast } from '@/components/toast'
import { getTutorQuizSubmissions, saveTutorQuizReview, type TutorQuizSubmission } from '@/services/api'

type StatusFilter = 'all' | 'ungraded' | 'completed'

const formatDate = (value: string) => new Date(value).toLocaleString()

const getSubmittedAnswer = (selectedOption: number | null, options: string[]) => selectedOption === null ? 'No answer' : options[selectedOption] ?? 'No answer'

const StatusChip = ({ status }: { status: TutorQuizSubmission['status'] }) => <Chip size="small" label={status === 'completed' ? 'Completed' : 'Ungraded'} color={status === 'completed' ? 'success' : 'warning'} variant="outlined" />

export const TutorGradingView = () => {
  const [submissions, setSubmissions] = useState<TutorQuizSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draftComment, setDraftComment] = useState('')
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const selected = submissions.find((submission) => submission.id === selectedId) ?? null

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

  const openSubmission = (submission: TutorQuizSubmission) => {
    setSelectedId(submission.id)
    setDraftComment(submission.comment)
    setDraftNotes(submission.questionNotes)
  }

  const saveReview = async (completed: boolean) => {
    if (!selected) return
    const review = {
      comment: draftComment,
      questionNotes: Object.fromEntries(Object.entries(draftNotes).filter(([, note]) => note.trim() !== '')),
      completed,
    }
    setSaving(true)
    try {
      await saveTutorQuizReview(selected.id, review)
      setSubmissions((current) => current.map((submission) => submission.id === selected.id ? { ...submission, ...review, status: completed ? 'completed' : 'ungraded', reviewedAt: new Date().toISOString() } : submission))
      toast.add({ type: 'success', title: completed ? 'Review completed' : 'Review saved', description: `${selected.studentName}'s quiz review was saved.` })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save review.'
      toast.add({ type: 'error', title: 'Review save failed', description: message })
    } finally {
      setSaving(false)
    }
  }

  if (selected) return <>
    <Button onClick={() => setSelectedId(null)} sx={{ mb: 2 }}>Back to grading queue</Button>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ mb: 0.5 }}>{selected.lessonTitle}</Typography>
        <Typography color="text.secondary">{selected.studentName} · {selected.studentEmail}</Typography>
        <Typography variant="body2" color="text.secondary">{selected.contentTitle} · Submitted {formatDate(selected.submittedAt)}</Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip label={`Score ${selected.score}%`} variant="outlined" />
        <StatusChip status={selected.status} />
      </Stack>
    </Stack>
    <Stack spacing={2} sx={{ mb: 2 }}>
      {selected.questions.map((question, index) => <Paper key={question.id} elevation={0} sx={{ p: 2.5, border: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 700 }}>{index + 1}. {question.question}</Typography>
          <Chip size="small" label={question.isCorrect ? 'Correct' : 'Incorrect'} color={question.isCorrect ? 'success' : 'error'} variant="outlined" />
        </Stack>
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          <Typography variant="body2"><Box component="span" sx={{ fontWeight: 700 }}>Submitted answer:</Box> {getSubmittedAnswer(question.selectedOption, question.options)}</Typography>
          <Typography variant="body2"><Box component="span" sx={{ fontWeight: 700 }}>Correct answer:</Box> {question.options[question.correctOption]}</Typography>
        </Stack>
        <TextField fullWidth multiline minRows={2} label="Correction note" placeholder="Explain the correct reasoning for the student" value={draftNotes[String(question.id)] ?? ''} onChange={(event) => setDraftNotes((current) => ({ ...current, [String(question.id)]: event.target.value }))} />
      </Paper>)}
    </Stack>
    <Paper elevation={0} sx={{ p: 2.5, border: 1, borderColor: 'divider' }}>
      <TextField fullWidth multiline minRows={3} label="Comment for student" placeholder="Share overall feedback on this submission" value={draftComment} onChange={(event) => setDraftComment(event.target.value)} sx={{ mb: 2 }} />
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button variant="outlined" disabled={saving} onClick={() => void saveReview(selected.status === 'completed')}>Save notes</Button>
        <Button variant="contained" disabled={saving} onClick={() => void saveReview(selected.status !== 'completed')}>{selected.status === 'completed' ? 'Reopen review' : 'Mark as completed'}</Button>
      </Stack>
    </Paper>
  </>

  const ungradedCount = submissions.filter((submission) => submission.status === 'ungraded').length
  const completedCount = submissions.length - ungradedCount
  const visibleSubmissions = submissions.filter((submission) => (statusFilter === 'all' || submission.status === statusFilter) && `${submission.studentName} ${submission.studentEmail} ${submission.contentTitle} ${submission.lessonTitle}`.toLowerCase().includes(search.trim().toLowerCase()))

  return <>
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="h4" sx={{ mb: 0.75 }}>Grading</Typography>
      <Typography color="text.secondary">Compare submitted answers with correct answers, add comments and correction notes, and track review progress.</Typography>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
      <Paper elevation={0} sx={{ flex: 1, p: 2, border: 1, borderColor: 'divider' }}><Typography variant="body2" color="text.secondary">Submissions</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{submissions.length}</Typography></Paper>
      <Paper elevation={0} sx={{ flex: 1, p: 2, border: 1, borderColor: 'divider' }}><Typography variant="body2" color="text.secondary">Ungraded</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{ungradedCount}</Typography></Paper>
      <Paper elevation={0} sx={{ flex: 1, p: 2, border: 1, borderColor: 'divider' }}><Typography variant="body2" color="text.secondary">Completed</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{completedCount}</Typography></Paper>
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
      <TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, course, or quiz..." inputProps={{ 'aria-label': 'Search submissions' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon color="action" /></InputAdornment> }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
      <FormControl sx={{ minWidth: { xs: '100%', sm: 190 } }}>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} startAdornment={<InputAdornment position="start"><FilterListOutlinedIcon color="action" /></InputAdornment>} IconComponent={KeyboardArrowDownRoundedIcon} inputProps={{ 'aria-label': 'Submission status filter' }} sx={{ borderRadius: 2.5, height: 56 }}>
          <MenuItem value="all">All submissions</MenuItem>
          <MenuItem value="ungraded">Ungraded</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
        </Select>
      </FormControl>
    </Stack>
    {error && <Paper sx={{ p: 2, mb: 2, border: 1, borderColor: 'error.main' }}><Typography color="error">{error}</Typography></Paper>}
    {loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} aria-label="Loading submissions" /><Typography color="text.secondary">Loading submissions...</Typography></Stack>}
    {!loading && visibleSubmissions.length === 0 && <Typography color="text.secondary">No quiz submissions match these filters.</Typography>}
    <Stack spacing={1.5}>
      {visibleSubmissions.map((submission) => <Paper key={submission.id} elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: 1, borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>{submission.lessonTitle}</Typography>
            <Typography variant="body2" color="text.secondary">{submission.studentName} · {submission.studentEmail}</Typography>
            <Typography variant="body2" color="text.secondary">{submission.contentTitle} · Submitted {formatDate(submission.submittedAt)}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={`${submission.score}%`} variant="outlined" />
            <StatusChip status={submission.status} />
            <Button variant="outlined" onClick={() => openSubmission(submission)}>Review</Button>
          </Stack>
        </Stack>
      </Paper>)}
    </Stack>
  </>
}
