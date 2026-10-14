import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { navigateTo } from '@/lib/navigation'
import { getPracticeExams } from '@/services/api'
import { getPracticeResults, type PracticeExam, type PracticeResult } from './practice-data'

interface PracticeExamCatalogProps {
  darkMode: boolean
  onToggleDarkMode: () => void
}

const examsPerPage = 6

const PracticeExamCatalog: React.FC<PracticeExamCatalogProps> = ({ darkMode, onToggleDarkMode }) => {
  const [exams, setExams] = useState<PracticeExam[]>([])
  const [results, setResults] = useState<Record<number, PracticeResult>>(() => getPracticeResults())
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')

  useEffect(() => {
    let active = true
    getPracticeExams()
      .then((records) => {
        if (active) {
          setExams(records)
          setPage(1)
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load practice exams.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const refreshResults = () => setResults(getPracticeResults())
    window.addEventListener('storage', refreshResults)
    return () => window.removeEventListener('storage', refreshResults)
  }, [])

  const subjects = useMemo(() => [...new Set(exams.map((exam) => exam.subject))].sort(), [exams])
  const grades = useMemo(() => [...new Set(exams.map((exam) => exam.grade))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [exams])
  const normalizedQuery = query.trim().toLowerCase()
  const filteredExams = exams.filter((exam) => (subjectFilter === 'all' || exam.subject === subjectFilter) && (gradeFilter === 'all' || exam.grade === gradeFilter) && (!normalizedQuery || exam.title.toLowerCase().includes(normalizedQuery) || exam.subject.toLowerCase().includes(normalizedQuery)))
  const pageCount = Math.ceil(filteredExams.length / examsPerPage)
  const visibleExams = filteredExams.slice((page - 1) * examsPerPage, page * examsPerPage)

  return <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
    <Header darkMode={darkMode} onToggleDarkMode={onToggleDarkMode} />
    <Box component="main" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 8 } }}>
      <Box sx={{ maxWidth: 720, mb: 5 }}>
        <Chip label="Practice at your pace" color="primary" variant="outlined" sx={{ mb: 2 }} />
        <Typography variant="h2" sx={{ fontSize: { xs: '2.25rem', md: '3.5rem' }, mb: 1.5 }}>Practice exams for confident learning</Typography>
        <Typography color="text.secondary" sx={{ fontSize: '1.1rem' }}>Work through one question at a time, see the explanation right away, and build understanding without a timer or pressure.</Typography>
      </Box>
      <Typography variant="h5" sx={{ mb: 2.5 }}>Published practice exams</Typography>
      {isLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress aria-label="Loading practice exams" /></Box> : error ? <Alert severity="error">{error}</Alert> : exams.length === 0 ? <Alert severity="info">There are no published practice exams available yet.</Alert> : <>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
          <TextField size="small" fullWidth label="Search exams" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} />
          <FormControl size="small" sx={{ minWidth: { md: 180 } }}><InputLabel>Subject</InputLabel><Select label="Subject" value={subjectFilter} onChange={(event) => { setSubjectFilter(event.target.value); setPage(1) }}><MenuItem value="all">All subjects</MenuItem>{subjects.map((subject) => <MenuItem key={subject} value={subject}>{subject}</MenuItem>)}</Select></FormControl>
          <FormControl size="small" sx={{ minWidth: { md: 160 } }}><InputLabel>Grade</InputLabel><Select label="Grade" value={gradeFilter} onChange={(event) => { setGradeFilter(event.target.value); setPage(1) }}><MenuItem value="all">All grades</MenuItem>{grades.map((grade) => <MenuItem key={grade} value={grade}>{grade}</MenuItem>)}</Select></FormControl>
        </Stack>
        {filteredExams.length === 0 ? <Alert severity="info">No practice exams match your search or filters.</Alert> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
          {visibleExams.map((exam) => <Card key={exam.id} elevation={0} sx={{ border: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ minHeight: 132, p: 3, display: 'flex', alignItems: 'flex-end', background: 'linear-gradient(135deg, rgba(16, 125, 111, 0.18), rgba(16, 125, 111, 0.04))' }}><SchoolOutlinedIcon color="primary" sx={{ fontSize: 44 }} /></Box>
            <CardContent sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}><Chip label={exam.subject} size="small" color="primary" variant="outlined" /><Chip label={exam.grade} size="small" /></Stack>
              <Typography variant="h6" sx={{ mb: 1 }}>{exam.title}</Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>Relaxed practice with instant feedback and clear answer explanations.</Typography>
              {results[exam.id] && <Typography color="success.main" variant="body2" sx={{ mb: 2, fontWeight: 700 }}>Completed: {results[exam.id].correct}/{results[exam.id].total} correct</Typography>}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 'auto' }}><Typography color="success.main" sx={{ fontWeight: 700 }}>Free access</Typography><Button variant="contained" onClick={() => navigateTo(`/practice-exams/${exam.id}`)}>{results[exam.id] ? 'Practice again' : 'Start practicing'}</Button></Stack>
            </CardContent>
          </Card>)}
        </Box>}
        {pageCount > 1 && <Stack alignItems="center" sx={{ mt: 5 }}><Pagination count={pageCount} page={page} onChange={(_, value) => setPage(value)} color="primary" aria-label="Practice exam pages" /></Stack>}
      </>}
      <Box sx={{ mt: 5, p: 2.5, borderRadius: 2, backgroundColor: 'action.hover', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}><MenuBookOutlinedIcon color="primary" /><Box><Typography sx={{ fontWeight: 700 }}>Learn at your own pace</Typography><Typography color="text.secondary" variant="body2">These practice exams are currently free and open to everyone.</Typography></Box></Box>
    </Box>
    <Footer />
  </Box>
}

export default PracticeExamCatalog
