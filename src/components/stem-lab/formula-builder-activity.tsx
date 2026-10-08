import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ReplayIcon from '@mui/icons-material/Replay'
import { type DragEvent, type FC, useState } from 'react'
import { BOND_REFERENCES, CHEMICAL_ELEMENTS, TARGET_ANGLES_DEG, type ElementData } from './chemical-bonding-engine'

type AtomSlot = { symbol: string; x: number; y: number }
type Bond = { from: number; to: number; order: number; ionic?: boolean; wedge?: boolean }
type FormulaChallenge = {
  name: string
  formula: string
  composition: { symbol: string; count: number }[]
  atoms: AtomSlot[]
  bonds: Bond[]
  shape: string
}
type PlacedAtom = { id: string; symbol: string }

const CHALLENGES: FormulaChallenge[] = [
  { name: 'water', formula: 'H2O', composition: [{ symbol: 'H', count: 2 }, { symbol: 'O', count: 1 }], atoms: [{ symbol: 'O', x: 250, y: 128 }, { symbol: 'H', x: 153, y: 203 }, { symbol: 'H', x: 347, y: 203 }], bonds: [{ from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }], shape: `bent · ${TARGET_ANGLES_DEG.H2O}°` },
  { name: 'carbon dioxide', formula: 'CO2', composition: [{ symbol: 'C', count: 1 }, { symbol: 'O', count: 2 }], atoms: [{ symbol: 'C', x: 250, y: 150 }, { symbol: 'O', x: 125, y: 150 }, { symbol: 'O', x: 375, y: 150 }], bonds: [{ from: 0, to: 1, order: 2 }, { from: 0, to: 2, order: 2 }], shape: `linear · ${TARGET_ANGLES_DEG.CO2}°` },
  { name: 'oxygen', formula: 'O2', composition: [{ symbol: 'O', count: 2 }], atoms: [{ symbol: 'O', x: 195, y: 150 }, { symbol: 'O', x: 305, y: 150 }], bonds: [{ from: 0, to: 1, order: BOND_REFERENCES['O-O'].order }], shape: 'diatomic · double bond' },
  { name: 'methane', formula: 'CH4', composition: [{ symbol: 'C', count: 1 }, { symbol: 'H', count: 4 }], atoms: [{ symbol: 'C', x: 250, y: 148 }, { symbol: 'H', x: 250, y: 58 }, { symbol: 'H', x: 345, y: 148 }, { symbol: 'H', x: 250, y: 238 }, { symbol: 'H', x: 155, y: 148 }], bonds: [{ from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }, { from: 0, to: 3, order: 1 }, { from: 0, to: 4, order: 1 }], shape: `tetrahedral · ${TARGET_ANGLES_DEG.CH4}°` },
  { name: 'sodium chloride', formula: 'NaCl', composition: [{ symbol: 'Na', count: 1 }, { symbol: 'Cl', count: 1 }], atoms: [{ symbol: 'Na', x: 195, y: 150 }, { symbol: 'Cl', x: 305, y: 150 }], bonds: [{ from: 0, to: 1, order: 1, ionic: true }], shape: 'ionic pair · alternating charges' },
  { name: 'ammonia', formula: 'NH3', composition: [{ symbol: 'N', count: 1 }, { symbol: 'H', count: 3 }], atoms: [{ symbol: 'N', x: 250, y: 140 }, { symbol: 'H', x: 250, y: 55 }, { symbol: 'H', x: 170, y: 190 }, { symbol: 'H', x: 330, y: 190 }], bonds: [{ from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }, { from: 0, to: 3, order: 1 }], shape: `trigonal pyramidal · ${TARGET_ANGLES_DEG.NH3}°` },
]

const TRAY_SYMBOLS = ['H', 'C', 'N', 'O', 'Na', 'Cl']
const TRAY_ATOMS = TRAY_SYMBOLS.flatMap((symbol) => Array.from({ length: 6 }, (_, index) => ({ id: `${symbol}-${index}`, symbol })))
const elementFor = (symbol: string): ElementData => CHEMICAL_ELEMENTS.find((element) => element.symbol === symbol)!
const getCounts = (atoms: PlacedAtom[]) => atoms.reduce<Record<string, number>>((counts, atom) => ({ ...counts, [atom.symbol]: (counts[atom.symbol] ?? 0) + 1 }), {})
const formatFormula = (composition: { symbol: string; count: number }[], showOnes = false) => composition.map(({ symbol, count }) => <Box key={symbol} component="span">{symbol}{(showOnes || count > 1) && <Box component="sub" sx={{ fontSize: '.62em', verticalAlign: 'baseline', position: 'relative', bottom: '-.2em' }}>{count}</Box>}</Box>)

const AtomSphere: FC<{ element: ElementData; size?: number; onClick?: () => void; draggable?: boolean; onDragStart?: (event: DragEvent<HTMLButtonElement>) => void; label: string; disabled?: boolean }> = ({ element, size = 48, onClick, draggable, onDragStart, label, disabled }) => <Button aria-label={label} draggable={draggable} onDragStart={onDragStart} onClick={onClick} disabled={disabled} sx={{ width: size, minWidth: size, height: size, p: 0, borderRadius: '50%', color: element.symbol === 'H' ? '#263746' : '#fff', background: `radial-gradient(circle at 32% 25%, #ffffff 0%, ${element.cpkColor} 36%, ${element.color} 100%)`, border: '1px solid rgba(25,45,60,.22)', boxShadow: 'inset -4px -5px 8px rgba(0,0,0,.2), 0 3px 7px rgba(25,45,60,.18)', textShadow: element.symbol === 'H' ? 'none' : '0 1px 2px rgba(0,0,0,.6)', fontWeight: 800, fontSize: size * .28, '&:hover': { background: `radial-gradient(circle at 32% 25%, #ffffff 0%, ${element.cpkColor} 36%, ${element.color} 100%)`, filter: 'brightness(1.08)', transform: 'translateY(-2px)' }, '&:disabled': { opacity: .36 }, transition: 'transform .18s ease, filter .18s ease' }}>{element.symbol}</Button>

const FormulaBuilderActivity: FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [challenge, setChallenge] = useState(() => CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)])
  const [placedAtoms, setPlacedAtoms] = useState<PlacedAtom[]>([])
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [validated, setValidated] = useState(false)
  const [completed, setCompleted] = useState(false)
  const counts = getCounts(placedAtoms)
  const targetCounts = Object.fromEntries(challenge.composition.map(({ symbol, count }) => [symbol, count]))
  const availableAtoms = TRAY_ATOMS.filter((atom) => !placedAtoms.some((placed) => placed.id === atom.id))
  const correct = challenge.composition.every(({ symbol, count }) => counts[symbol] === count) && Object.keys(counts).every((symbol) => counts[symbol] === targetCounts[symbol])

  const addAtom = (atomId: string) => {
    const atom = TRAY_ATOMS.find((item) => item.id === atomId)
    if (!atom || placedAtoms.some((item) => item.id === atom.id) || placedAtoms.length >= 12) return
    setPlacedAtoms((current) => [...current, atom])
    setFeedback(null)
    setValidated(false)
    setCompleted(false)
  }
  const removeAtom = (atomId: string) => {
    setPlacedAtoms((current) => current.filter((atom) => atom.id !== atomId))
    setFeedback(null)
    setValidated(false)
    setCompleted(false)
  }
  const receiveAtom = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const atomId = event.dataTransfer.getData('text/plain')
    if (atomId) addAtom(atomId)
  }
  const checkActivity = () => {
    const missing = challenge.composition.find(({ symbol, count }) => (counts[symbol] ?? 0) < count)
    const excess = Object.keys(counts).find((symbol) => (counts[symbol] ?? 0) > (targetCounts[symbol] ?? 0))
    const isCorrect = !missing && !excess
    setFeedback(isCorrect
      ? { correct: true, message: `Right! ${challenge.composition.map(({ symbol, count }) => `${count === 1 ? 'one' : count} ${elementFor(symbol).name.toLowerCase()}${count === 1 ? '' : ' atoms'}`).join(' and ')} make ${challenge.formula}, ${challenge.name}.` }
      : { correct: false, message: excess ? `There is an extra ${elementFor(excess).name.toLowerCase()} atom in the molecule.` : `Try adding a ${elementFor(missing!.symbol).name.toLowerCase()} atom.` })
    setValidated(isCorrect)
    setCompleted(false)
  }
  const reset = () => {
    const next = CHALLENGES.filter((item) => item.formula !== challenge.formula)
    setChallenge(next[Math.floor(Math.random() * next.length)])
    setPlacedAtoms([])
    setFeedback(null)
    setValidated(false)
    setCompleted(false)
  }

  const assignedSlots = new Map<number, PlacedAtom>()
  const extras: PlacedAtom[] = []
  placedAtoms.forEach((atom) => {
    const slot = challenge.atoms.findIndex((target, index) => target.symbol === atom.symbol && !assignedSlots.has(index))
    if (slot >= 0) assignedSlots.set(slot, atom)
    else extras.push(atom)
  })
  const extraPositions = extras.map((_, index) => ({ x: 78 + (index % 7) * 58, y: 278 }))

  const bondLines = challenge.bonds.flatMap((bond, index) => {
    const startAtom = assignedSlots.get(bond.from)
    const endAtom = assignedSlots.get(bond.to)
    if (!startAtom || !endAtom) return []
    const start = challenge.atoms[bond.from]
    const end = challenge.atoms[bond.to]
    const length = Math.hypot(end.x - start.x, end.y - start.y) || 1
    return Array.from({ length: bond.order }, (_, lineIndex) => {
      const offset = (lineIndex - (bond.order - 1) / 2) * 8
      const dx = -(end.y - start.y) / length * offset
      const dy = (end.x - start.x) / length * offset
      return <line key={`${index}-${lineIndex}`} x1={start.x + dx} y1={start.y + dy} x2={end.x + dx} y2={end.y + dy} stroke={bond.ionic ? '#9a75d5' : '#52748b'} strokeWidth={bond.ionic ? 4 : 5} strokeDasharray={bond.ionic ? '7 7' : undefined} strokeLinecap="round" />
    })
  })

  return <Box sx={{ '@keyframes moleculeCelebrate': { '0%, 100%': { transform: 'scale(1) rotate(-1deg)', filter: 'drop-shadow(0 0 0 rgba(62,190,134,0))' }, '50%': { transform: 'scale(1.035) rotate(1deg)', filter: 'drop-shadow(0 0 15px rgba(62,190,134,.8))' } }, '@keyframes atomPop': { '0%': { transform: 'scale(.4)', opacity: 0 }, '75%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)', opacity: 1 } } }}>
    <Stack spacing={2.25}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: 1, borderColor: 'divider', borderRadius: 3, background: 'linear-gradient(135deg, rgba(61,132,178,.12), rgba(105,190,165,.12))' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5}>
          <Box><Chip label="CHEMISTRY · CORE" size="small" color="primary" variant="outlined" sx={{ mb: .75, fontWeight: 800 }} /><Typography variant="overline" color="text.secondary" sx={{ display: 'block', fontWeight: 800 }}>Formula Builder</Typography><Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: '-.04em' }}>Build {formatFormula(challenge.composition)}</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>Assemble the correct chemical formula from elements.</Typography></Box>
          <Paper elevation={0} sx={{ px: 2.5, py: 1.5, border: 1, borderColor: 'divider', borderRadius: 2.5, textAlign: 'center', minWidth: { sm: 200 } }}><Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Current formula</Typography><Typography aria-live="polite" variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'primary.main' }}>{challenge.composition.map(({ symbol }) => <Box key={symbol} component="span">{symbol}{counts[symbol] ?? 0}</Box>)}</Typography></Paper>
        </Stack>
      </Paper>

      <Paper elevation={0} onDragOver={(event) => event.preventDefault()} onDrop={receiveAtom} sx={{ position: 'relative', overflow: 'hidden', border: 1, borderColor: feedback?.correct ? 'success.main' : 'divider', borderRadius: 3, background: 'radial-gradient(ellipse at 50% 40%, rgba(89,170,180,.10), transparent 65%), linear-gradient(145deg, #f9fcfd, #edf4f5)', minHeight: 310 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ position: 'absolute', zIndex: 1, left: 16, right: 16, top: 12 }}><Typography variant="subtitle2" sx={{ color: '#42586a', fontWeight: 800 }}>Molecule construction zone</Typography><Chip size="small" label={challenge.shape} sx={{ bgcolor: 'rgba(255,255,255,.8)', color: '#536979' }} /></Stack>
        <Box component="svg" viewBox="0 0 500 310" role="img" aria-label={`${challenge.name} molecular construction zone`} sx={{ display: 'block', width: '100%', minHeight: 300, maxHeight: 380, p: { xs: 0, sm: 1 } }}>
          <defs><radialGradient id="builderBackdrop"><stop offset="0%" stopColor="#edf6f7" /><stop offset="100%" stopColor="#f8fbfc" /></radialGradient></defs>
          <rect x="0" y="0" width="500" height="310" rx="20" fill="url(#builderBackdrop)" />
          {challenge.atoms.map((slot, index) => <circle key={`slot-${index}`} cx={slot.x} cy={slot.y} r="33" fill="rgba(255,255,255,.38)" stroke="#bdcdd5" strokeWidth="2" strokeDasharray="5 6" />)}
          {bondLines}
          {challenge.atoms.map((slot, index) => {
            const atom = assignedSlots.get(index)
            if (!atom) return null
            const element = elementFor(atom.symbol)
            return <g key={atom.id} role="button" tabIndex={0} aria-label={`Remove ${element.name} atom`} onClick={() => removeAtom(atom.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); removeAtom(atom.id) } }} style={{ cursor: 'pointer', animation: feedback?.correct ? 'moleculeCelebrate 1.5s ease-in-out infinite' : 'atomPop .35s ease-out' }}><title>{element.name}; select to remove</title><circle cx={slot.x} cy={slot.y} r="32" fill={element.cpkColor} stroke="rgba(36,55,70,.28)" strokeWidth="2" /><circle cx={slot.x - 9} cy={slot.y - 11} r="10" fill="#fff" opacity=".45" /><text x={slot.x} y={slot.y + 7} textAnchor="middle" fontSize={atom.symbol.length > 1 ? 18 : 22} fontWeight="800" fill={atom.symbol === 'H' ? '#263746' : '#fff'} style={{ pointerEvents: 'none' }}>{atom.symbol}</text></g>
          })}
          {extras.map((atom, index) => { const { x, y } = extraPositions[index]; const element = elementFor(atom.symbol); return <g key={atom.id} role="button" tabIndex={0} aria-label={`Remove extra ${element.name} atom`} onClick={() => removeAtom(atom.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); removeAtom(atom.id) } }} style={{ cursor: 'pointer', animation: 'atomPop .35s ease-out' }}><title>{element.name}; select to remove</title><circle cx={x} cy={y} r="22" fill={element.cpkColor} stroke="rgba(36,55,70,.28)" strokeWidth="2" /><text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill={atom.symbol === 'H' ? '#263746' : '#fff'} style={{ pointerEvents: 'none' }}>{atom.symbol}</text></g> })}
          {!placedAtoms.length && <text x="250" y="168" textAnchor="middle" fill="#758995" fontSize="15">Drag atom spheres here or tap an atom in the tray</text>}
          {placedAtoms.length > 0 && <text x="250" y="302" textAnchor="middle" fill="#758995" fontSize="11">Select a built atom to return it to the tray</text>}
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, border: 1, borderColor: 'divider', borderRadius: 3 }}>
        <Stack spacing={1.5}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={.5}><Box><Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Element tray</Typography><Typography variant="body2" color="text.secondary">Choose carefully—there are spare atoms of every type.</Typography></Box><Typography variant="caption" color="text.secondary" sx={{ alignSelf: { sm: 'center' } }}>Drag a sphere or tap to add it</Typography></Stack>
          <Stack direction="row" flexWrap="wrap" gap={1.25}>
            {TRAY_SYMBOLS.map((symbol) => {
              const element = elementFor(symbol)
              const atoms = availableAtoms.filter((atom) => atom.symbol === symbol)
              return <Paper key={symbol} elevation={0} sx={{ p: 1, minWidth: 100, border: 1, borderColor: 'divider', borderRadius: 2, backgroundColor: 'background.default' }}><Stack spacing={.8} alignItems="center"><Stack direction="row" spacing={.45} alignItems="center"><Typography variant="caption" sx={{ fontWeight: 800 }}>{element.name}</Typography><Chip size="small" label={`${atoms.length} left`} sx={{ height: 20, fontSize: 10 }} /></Stack><Stack direction="row" flexWrap="wrap" justifyContent="center" gap={.5}>{atoms.map((atom) => <AtomSphere key={atom.id} element={element} size={36} label={`Add ${element.name} atom`} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', atom.id)} onClick={() => addAtom(atom.id)} />)}</Stack></Stack></Paper>
            })}
          </Stack>
        </Stack>
      </Paper>

      {feedback && <Paper role="status" aria-live="polite" elevation={0} sx={{ p: 1.5, border: 1, borderColor: feedback.correct ? 'success.main' : 'warning.main', backgroundColor: feedback.correct ? 'success.light' : 'warning.light', animation: feedback.correct ? 'moleculeCelebrate 1.5s ease-in-out infinite' : 'none' }}><Typography sx={{ fontWeight: 750, color: feedback.correct ? 'success.dark' : 'warning.dark' }}>{feedback.message}</Typography></Paper>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button variant="outlined" disabled={!placedAtoms.length || completed} onClick={checkActivity} startIcon={<CheckCircleOutlineIcon />}>Check Activity</Button>
        <Button variant="contained" color="success" disabled={!validated || !correct || completed} onClick={() => { setCompleted(true); onComplete?.() }} startIcon={<CheckCircleOutlineIcon />}>{completed ? 'Completed' : 'Complete Activity'}</Button>
        <Button variant="text" onClick={reset} startIcon={<ReplayIcon />}>Reset · New molecule</Button>
      </Stack>
    </Stack>
  </Box>
}

export default FormulaBuilderActivity
