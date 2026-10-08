import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ReplayIcon from '@mui/icons-material/Replay'
import { type DragEvent, type FC, useState } from 'react'
import type { EnginePreviewProps } from './platform-engine-previews'
import { BOX_HEIGHT, BOX_WIDTH, CELL_PARTS, getCalloutLine, type CellPart } from './cell-zoom-data'

type Feedback = { kind: 'success' | 'warning' | 'info'; text: string } | null

const shuffle = <T,>(items: T[]) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

const CellZoomActivity: FC<EnginePreviewProps> = ({ onComplete }) => {
  const [tray, setTray] = useState(() => shuffle(CELL_PARTS.map((part) => part.id)))
  const [placements, setPlacements] = useState<Record<string, string | null>>(() => Object.fromEntries(CELL_PARTS.map((part) => [part.id, null])))
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [hoverSlot, setHoverSlot] = useState<string | null>(null)
  const [invalidSlots, setInvalidSlots] = useState<string[]>([])
  const [motion, setMotion] = useState<{ id: string; kind: 'pop' | 'wrong' } | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [completed, setCompleted] = useState(false)
  const labeledCount = Object.values(placements).filter(Boolean).length
  const allFilled = labeledCount === CELL_PARTS.length
  const getPart = (id: string) => CELL_PARTS.find((part) => part.id === id)!

  const reset = () => {
    setTray(shuffle(CELL_PARTS.map((part) => part.id)))
    setPlacements(Object.fromEntries(CELL_PARTS.map((part) => [part.id, null])))
    setSelectedLabel(null)
    setHoverSlot(null)
    setInvalidSlots([])
    setMotion(null)
    setFeedback(null)
    setChecked(false)
    setCorrect(false)
    setCompleted(false)
  }

  const placeLabel = (slotId: string, labelId: string) => {
    const part = getPart(labelId)
    setSelectedLabel(null)
    setHoverSlot(null)
    setInvalidSlots([])
    setChecked(false)
    setCorrect(false)
    setCompleted(false)
    if (slotId !== labelId) {
      setMotion({ id: labelId, kind: 'wrong' })
      setFeedback({ kind: 'warning', text: 'That label bounced back to the tray. Try another pointer.' })
      window.setTimeout(() => setMotion(null), 520)
      return
    }
    setPlacements((current) => ({ ...current, [slotId]: labelId }))
    setTray((current) => current.filter((id) => id !== labelId))
    setMotion({ id: labelId, kind: 'pop' })
    setFeedback({ kind: 'info', text: `${part.label} snapped into place. Read its explanation below the diagram.` })
    window.setTimeout(() => setMotion(null), 520)
  }

  const handleDragStart = (event: DragEvent<HTMLElement>, labelId: string) => {
    event.dataTransfer.setData('application/x-cell-label', labelId)
    event.dataTransfer.effectAllowed = 'move'
    setSelectedLabel(null)
  }
  const handleDrop = (event: DragEvent<SVGElement>, slotId: string) => {
    event.preventDefault()
    const labelId = event.dataTransfer.getData('application/x-cell-label') || selectedLabel
    if (labelId) placeLabel(slotId, labelId)
  }
  const checkActivity = () => {
    const wrongSlots = CELL_PARTS.filter((part) => placements[part.id] && placements[part.id] !== part.id).map((part) => part.id)
    const emptySlots = CELL_PARTS.filter((part) => !placements[part.id]).map((part) => part.id)
    const correctCount = CELL_PARTS.length - wrongSlots.length - emptySlots.length
    setChecked(true)
    if (wrongSlots.length) {
      setPlacements((current) => wrongSlots.reduce((next, slotId) => ({ ...next, [slotId]: null }), current))
      setTray((current) => shuffle([...current, ...wrongSlots.map((slotId) => placements[slotId]!).filter(Boolean)]))
    }
    setInvalidSlots([...wrongSlots, ...emptySlots])
    if (wrongSlots.length || emptySlots.length) {
      setCorrect(false)
      setFeedback({ kind: 'warning', text: `${CELL_PARTS.length - correctCount} label${CELL_PARTS.length - correctCount === 1 ? '' : 's'} left to correct. Empty or incorrect boxes are highlighted in red.` })
      return
    }
    setCorrect(true)
    setFeedback({ kind: 'success', text: 'You labeled every part of the cell! Each structure has a different job that helps the cell live and work.' })
  }

  const renderCallout = (part: CellPart) => {
    const placedId = placements[part.id]
    const isFilled = Boolean(placedId)
    const isHovered = hoverSlot === part.id
    const isInvalid = checked && invalidSlots.includes(part.id)
    const line = getCalloutLine(part)
    return <g key={part.id}>
      <line {...line} stroke={isInvalid ? '#d84a4a' : isFilled ? '#3a9461' : '#587181'} strokeWidth="2.5" />
      <circle cx={part.point.x} cy={part.point.y} r="4" fill={isInvalid ? '#d84a4a' : '#405b6c'} />
      <g role="button" tabIndex={0} aria-label={`${part.label} drop label here box${isFilled ? `, filled with ${getPart(placedId!).label}` : ', empty'}`} onClick={() => selectedLabel && placeLabel(part.id, selectedLabel)} onKeyDown={(event) => { if (selectedLabel && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); placeLabel(part.id, selectedLabel) } }} onDragOver={(event) => { event.preventDefault(); setHoverSlot(part.id) }} onDragLeave={() => setHoverSlot(null)} onDrop={(event) => handleDrop(event, part.id)} style={{ cursor: selectedLabel ? 'pointer' : 'default' }}>
        <rect x={part.box.x} y={part.box.y} width={BOX_WIDTH} height={BOX_HEIGHT} rx="9" fill={isInvalid ? '#fff0f0' : isFilled ? '#e7f5eb' : isHovered ? '#e7f2f8' : '#ffffff'} stroke={isInvalid ? '#d84a4a' : isFilled ? '#3a9461' : isHovered ? '#397ca0' : '#77909e'} strokeWidth={isInvalid ? 3 : 2} strokeDasharray={isFilled ? undefined : '7 5'} />
        <text x={part.box.x + BOX_WIDTH / 2} y={part.box.y + 36} textAnchor="middle" fontSize={isFilled ? 16 : 15} fontWeight="700" fill={isInvalid ? '#a83737' : isFilled ? '#2c6744' : '#465e6c'}>{isFilled ? part.label : 'Drop label here'}</text>
      </g>
    </g>
  }

  return <Box sx={{ '@keyframes labelPop': { '0%': { transform: 'scale(.82)', opacity: .55 }, '70%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)', opacity: 1 } }, '@keyframes labelWobble': { '0%, 100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-5px)' }, '75%': { transform: 'translateX(5px)' } }, '@keyframes cellCelebrate': { '0%, 100%': { boxShadow: '0 0 0 rgba(66,165,104,0)' }, '50%': { boxShadow: '0 0 25px rgba(66,165,104,.5)' } } }}>
    <Stack spacing={2}>
      <Box><Chip label="Foundation" color="secondary" sx={{ mb: .75 }} /><Typography variant="h5" sx={{ fontWeight: 800 }}>Cell Zoom</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>Discover that living things are made of tiny building blocks called cells.</Typography></Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}><Chip label={`${labeledCount} of ${CELL_PARTS.length} labeled`} color={allFilled ? 'success' : 'default'} /><Typography variant="body2" color="text.secondary">Drag a word to its matching pointer box, or tap a word and a box.</Typography></Stack>
      <Box sx={{ overflowX: 'auto', borderRadius: 2.5 }}><Box sx={{ minWidth: { xs: 760, md: '100%' }, maxWidth: 1060, mx: 'auto', border: 1, borderColor: correct ? 'success.main' : 'divider', borderRadius: 2.5, backgroundColor: '#f1f8fc', overflow: 'hidden', animation: correct ? 'cellCelebrate .8s ease-in-out 3' : 'none' }}>
        <Box component="svg" viewBox="0 0 1000 510" role="img" aria-label="Animal cell diagram with seven straight pointer lines ending at individual label boxes" sx={{ display: 'block', width: '100%', height: 'auto', touchAction: 'none' }}>
          <defs><radialGradient id="animalCellFill"><stop offset="0%" stopColor="#a9e5f0" /><stop offset="100%" stopColor="#64bfd7" /></radialGradient><linearGradient id="nucleusFill" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#a57be5" /><stop offset="100%" stopColor="#7047b5" /></linearGradient></defs>
          <ellipse cx="500" cy="345" rx="239" ry="160" fill="url(#animalCellFill)" stroke="#1768ad" strokeWidth="13" /><ellipse cx="500" cy="345" rx="225" ry="147" fill="none" stroke="#f0cd73" strokeWidth="5" />
          <g fill="#d9a7e8" stroke="#8550b8" strokeWidth="1.5"><circle cx="330" cy="265" r="5" /><circle cx="360" cy="330" r="4" /><circle cx="405" cy="300" r="4" /><circle cx="425" cy="365" r="4" /><circle cx="605" cy="265" r="4" /><circle cx="640" cy="340" r="5" /><circle cx="550" cy="250" r="4" /><circle cx="360" cy="410" r="4" /><circle cx="550" cy="450" r="4" /></g>
          <path d="M362 406 C333 377 346 347 377 350 C407 353 405 383 380 392 C359 400 365 372 386 372 M614 256 C583 233 600 210 626 220 C652 230 638 252 619 244 C605 238 619 225 631 233" fill="#e85c69" stroke="#ad3347" strokeWidth="3" /><path d="M355 380 Q372 363 390 376 M606 238 Q619 226 631 238" fill="none" stroke="#ffcf90" strokeWidth="3" />
          <ellipse cx="500" cy="345" rx="66" ry="59" fill="url(#nucleusFill)" stroke="#5b378f" strokeWidth="4" /><ellipse cx="517" cy="340" rx="17" ry="15" fill="#d6539b" stroke="#9d337d" strokeWidth="2" /><ellipse cx="500" cy="345" rx="72" ry="65" fill="none" stroke="#d9c4fb" strokeWidth="3" />
          <g fill="none" stroke="#f3d55b" strokeWidth="5" strokeLinecap="round"><path d="M434 277 C451 263 463 286 446 296 C431 305 453 315 463 300" /><path d="M566 378 C585 360 596 386 578 398 C560 411 587 416 601 398" /><path d="M414 430 C431 417 441 440 425 449" /></g><g fill="#f5dc67"><circle cx="430" cy="279" r="3" /><circle cx="456" cy="293" r="3" /><circle cx="574" cy="382" r="3" /><circle cx="590" cy="397" r="3" /></g>
          <g stroke="#11879c" strokeWidth="4" fill="none" strokeLinecap="round"><path d="M534 291 C556 271 575 291 555 307 C539 320 563 331 584 313" /><path d="M535 301 C557 281 576 301 556 317 C540 330 564 341 585 323" /><path d="M535 311 C557 291 576 311 556 327 C540 340 564 351 585 333" /></g>
          <g fill="#346d9c">{[[420,250],[435,255],[450,251],[426,263],[442,268],[456,260],[575,250],[588,257],[597,247],[583,269],[601,274],[571,279]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" />)}</g>
          <g fill="none" stroke="#eaad38" strokeWidth="5" strokeLinecap="round"><path d="M563 417 C589 401 606 414 580 426 C554 438 577 449 603 437" /><path d="M560 426 C586 410 603 423 577 435 C551 447 574 458 600 446" /><path d="M557 435 C583 419 600 432 574 444 C548 456 571 467 597 455" /></g>
          <text x="500" y="495" textAnchor="middle" fill="#456171" fontSize="15" fontWeight="700">Animal cell · simplified diagram, not to scale</text>
          {CELL_PARTS.map(renderCallout)}
        </Box>
      </Box></Box>

      <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}><Typography variant="subtitle2" sx={{ mb: 1 }}>Label tray</Typography><Stack direction="row" flexWrap="wrap" gap={1}>{tray.map((id) => { const part = getPart(id); return <Button key={id} draggable onDragStart={(event) => handleDragStart(event, id)} onClick={() => setSelectedLabel((current) => current === id ? null : id)} variant={selectedLabel === id ? 'contained' : 'outlined'} sx={{ textTransform: 'none', animation: motion?.id === id ? motion.kind === 'wrong' ? 'labelWobble .24s ease-in-out 2' : 'labelPop .42s ease-out' : 'none' }}>{part.label}</Button> })}</Stack></Paper>

      {CELL_PARTS.some((part) => placements[part.id]) && <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider', backgroundColor: 'rgba(31,116,146,.05)', borderRadius: 2 }}><Typography variant="subtitle2" sx={{ mb: 1 }}>What each part does</Typography><Stack spacing={.75}>{CELL_PARTS.filter((part) => placements[part.id] === part.id).map((part) => <Typography key={part.id} variant="body2"><Box component="strong">{part.label}:</Box> {part.explanation}</Typography>)}</Stack></Paper>}

      {feedback && <Paper role="status" aria-live="polite" elevation={0} sx={{ p: 1.5, border: 1, borderColor: feedback.kind === 'success' ? 'success.main' : feedback.kind === 'warning' ? 'error.main' : 'info.main', backgroundColor: feedback.kind === 'success' ? 'success.light' : feedback.kind === 'warning' ? 'error.light' : 'info.light' }}><Typography sx={{ fontWeight: 700 }}>{feedback.text}</Typography></Paper>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" onClick={checkActivity} disabled={!allFilled || completed} startIcon={<CheckCircleOutlineIcon />}>Check Activity</Button><Button variant="contained" color="success" onClick={() => { setCompleted(true); onComplete?.() }} disabled={!correct || !checked || completed} startIcon={<CheckCircleOutlineIcon />}>{completed ? 'Completed' : 'Complete Activity'}</Button><Button variant="text" onClick={reset} startIcon={<ReplayIcon />}>Reset</Button></Stack>
    </Stack>
  </Box>
}

export default CellZoomActivity
