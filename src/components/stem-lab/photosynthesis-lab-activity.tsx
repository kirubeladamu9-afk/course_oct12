import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ReplayIcon from '@mui/icons-material/Replay'
import { type FC, useEffect, useState } from 'react'
import type { EnginePreviewProps } from './platform-engine-previews'
import { createPhotosynthesisRound, getLimitingFactor, getPhotosynthesisAnswer, getPhotosynthesisRate, type PhotosynthesisFactor as LimitingInput, type PhotosynthesisInputs as Inputs } from './photosynthesis-model'
const factorLabel: Record<LimitingInput, string> = { sunlight: 'sunlight', water: 'water', co2: 'CO₂' }
const factorSentence: Record<LimitingInput, string> = { sunlight: 'sunlight', water: 'water', co2: 'carbon dioxide' }

const inputControls: Array<{ key: LimitingInput; label: string; description: string; color: string }> = [
  { key: 'sunlight', label: 'Sunlight', description: 'Sunlight gives the plant energy to make food.', color: '#e9a72c' },
  { key: 'water', label: 'Water', description: 'Roots absorb water and carry it up to the leaves.', color: '#258bc1' },
  { key: 'co2', label: 'CO₂', description: 'Leaves take carbon dioxide from the air to build sugar.', color: '#738d65' },
]

const PhotosynthesisLabActivity: FC<EnginePreviewProps> = ({ onComplete }) => {
  const [inputs, setInputs] = useState<Inputs>({ sunlight: 50, water: 50, co2: 50 })
  const [round, setRound] = useState(() => createPhotosynthesisRound())
  const [conceptAnswer, setConceptAnswer] = useState<'quickly' | 'slowly' | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [validated, setValidated] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [glucose, setGlucose] = useState(0)
  const [oxygen, setOxygen] = useState(0)
  const rate = getPhotosynthesisRate(inputs)
  const scenarioAnswer = getPhotosynthesisAnswer(round.scenario.rate, 100)
  const limitingFactor = getLimitingFactor(inputs)
  const fastestCorrect = rate >= round.targetRate
  const conceptCorrect = conceptAnswer === scenarioAnswer
  const bubbleCount = rate === 0 ? 0 : Math.min(7, Math.ceil(rate / 16))

  useEffect(() => {
    if (rate === 0 || (glucose >= 100 && oxygen >= 100)) return
    const timer = window.setInterval(() => {
      setGlucose((current) => Math.min(100, current + rate * .025))
      setOxygen((current) => Math.min(100, current + rate * .04))
    }, 250)
    return () => window.clearInterval(timer)
  }, [glucose, oxygen, rate])

  const changeInput = (factor: LimitingInput, value: number) => {
    setInputs((current) => ({ ...current, [factor]: value }))
    setFeedback(null)
    setValidated(false)
    setCompleted(false)
  }
  const checkActivity = () => {
    const isCorrect = fastestCorrect && conceptCorrect
    setValidated(isCorrect)
    setCompleted(false)
    setFeedback(isCorrect
      ? { correct: true, message: round.scenario.rate < 50 ? `Right! Even with plenty of ${round.scenario.limiting === 'water' ? 'sunlight and CO₂' : round.scenario.limiting === 'co2' ? 'sunlight and water' : 'water and CO₂'}, low ${factorSentence[round.scenario.limiting]} was the limiting factor. The lowest input sets the rate for the whole process.` : `Right! The plant had enough sunlight, water, and CO₂ to make food quickly. The smallest input, ${factorSentence[round.scenario.limiting]}, still sets the rate.` }
      : { correct: false, message: !fastestCorrect ? 'Hint: One input is holding the rate below this round’s goal. Compare the three bars and raise the shortest one.' : 'Hint: Compare all three values in the example. The smallest one controls the rate, even when the other two are high.' })
  }
  const reset = () => {
    setRound((current) => createPhotosynthesisRound(current))
    setInputs({ sunlight: 50, water: 50, co2: 50 })
    setConceptAnswer(null)
    setFeedback(null)
    setValidated(false)
    setCompleted(false)
    setGlucose(0)
    setOxygen(0)
  }

  return <Box sx={{ '@keyframes oxygenRise': { '0%': { opacity: .05, transform: 'translateY(8px) scale(.7)' }, '20%': { opacity: .95 }, '100%': { opacity: 0, transform: 'translateY(-82px) scale(1.08)' } }, '@keyframes leafGlow': { '0%, 100%': { filter: 'drop-shadow(0 0 1px rgba(44,139,74,.15))' }, '50%': { filter: 'drop-shadow(0 0 7px rgba(44,139,74,.62))' } }, '@keyframes successGlow': { '0%, 100%': { boxShadow: '0 0 0 rgba(70,175,105,0)' }, '50%': { boxShadow: '0 0 25px rgba(70,175,105,.48)' } } }}>
    <Stack spacing={2.25}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: 1, borderColor: 'divider', borderRadius: 3, background: 'linear-gradient(135deg, rgba(245,187,74,.12), rgba(94,166,110,.12))' }}>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}><Box><Chip label="Foundation" color="success" variant="outlined" sx={{ mb: .75, fontWeight: 800 }} /><Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: '-.04em' }}>Photosynthesis Lab</Typography><Typography color="text.secondary" sx={{ mt: .35 }}>See how plants make their own food using sunlight.</Typography></Box><Chip label="Live model · limiting factors" color="success" /></Stack>
          <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, border: 1, borderColor: 'rgba(69,127,84,.2)', backgroundColor: 'rgba(255,255,255,.7)' }}><Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>The word equation</Typography><Typography variant="h6" sx={{ color: '#365c40', fontWeight: 800, lineHeight: 1.5 }}>Sunlight + Water + Carbon Dioxide → Food (Glucose) + Oxygen</Typography></Paper>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ overflow: 'hidden', border: 1, borderColor: 'divider', borderRadius: 3, background: 'linear-gradient(180deg, #e8f6ff 0%, #f4fbff 69%, #614b38 69%, #513d2d 100%)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 1.5 }}><Typography variant="subtitle2" sx={{ color: '#37566a', fontWeight: 800 }}>Inside the plant’s environment</Typography><Chip size="small" label={`Photosynthesis rate · ${rate}%`} sx={{ backgroundColor: rate === 0 ? '#edf0f1' : '#e1f2df', color: '#315a3d', fontWeight: 800 }} /></Stack>
        <Box component="svg" viewBox="0 0 700 330" role="img" aria-label={`Plant using sunlight, water, and carbon dioxide at a relative photosynthesis rate of ${rate} percent`} sx={{ display: 'block', width: '100%', height: { xs: 230, sm: 290 }, p: { xs: .5, sm: 1 } }}>
          <defs><marker id="photoArrowGreen" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#567e59" /></marker><marker id="photoArrowBlue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#398bb7" /></marker></defs>
          <circle cx="105" cy="72" r="35" fill="#f8c856" stroke="#efb339" strokeWidth="3" /><g stroke="#efb339" strokeWidth="4" strokeLinecap="round">{Array.from({ length: 8 }, (_, index) => { const angle = index * Math.PI / 4; return <line key={index} x1={105 + Math.cos(angle) * 45} y1={72 + Math.sin(angle) * 45} x2={105 + Math.cos(angle) * 58} y2={72 + Math.sin(angle) * 58} /> })}</g>
          <text x="105" y="133" textAnchor="middle" fill="#78591f" fontSize="14" fontWeight="700">Sunlight</text><path d="M143 102 Q190 136 261 145" fill="none" stroke="#e8b947" strokeWidth="3" strokeDasharray="7 8" opacity={.35 + inputs.sunlight / 160} />
          <rect x="0" y="226" width="700" height="104" fill="#614b38" /><path d="M0 226 Q110 218 220 226 T440 226 T700 226" fill="none" stroke="#446a43" strokeWidth="9" />
          <path d="M345 232 C343 202 352 173 350 137" fill="none" stroke="#487f47" strokeWidth="12" strokeLinecap="round" /><path d="M350 178 C320 163 299 142 284 119 M350 164 C377 151 396 130 411 104 M350 195 C325 186 307 176 293 160" fill="none" stroke="#528b4b" strokeWidth="7" strokeLinecap="round" />
          <g style={{ animation: rate > 0 ? 'leafGlow 2.5s ease-in-out infinite' : 'none' }}>
            <path d="M332 173 C296 179 274 153 280 121 C315 116 340 137 332 173Z" fill={rate === 0 ? '#849276' : '#58a65e'} stroke="#387c48" strokeWidth="2" /><path d="M287 128 Q308 146 329 166" fill="none" stroke="#d4edb4" strokeWidth="2" />
            <path d="M370 159 C369 124 390 99 425 94 C431 129 408 155 370 159Z" fill={rate === 0 ? '#849276' : '#65b86d'} stroke="#387c48" strokeWidth="2" /><path d="M375 153 Q398 127 419 101" fill="none" stroke="#d4edb4" strokeWidth="2" />
            <path d="M339 199 C312 204 292 192 287 169 C312 162 334 174 339 199Z" fill={rate === 0 ? '#849276' : '#6ab96d'} stroke="#387c48" strokeWidth="2" /><path d="M296 173 Q317 184 335 195" fill="none" stroke="#d4edb4" strokeWidth="2" />
          </g>
          <text x="350" y="149" textAnchor="middle" fill="#f7fff3" fontSize="13" fontWeight="800">Leaves</text>
          <path d="M349 225 C344 250 325 262 312 284 M351 226 C359 249 380 263 392 289 M349 232 C344 262 343 281 344 305 M347 247 C327 253 309 253 293 250 M354 250 C375 251 393 247 409 239" fill="none" stroke="#d9c18c" strokeWidth="4" strokeLinecap="round" />
          <text x="351" y="319" textAnchor="middle" fill="#fff4da" fontSize="13" fontWeight="700">Roots take up water from soil</text>
          <path d="M139 172 C197 179 237 166 284 151" fill="none" stroke="#567e59" strokeWidth="3" strokeDasharray="6 5" markerEnd="url(#photoArrowGreen)" /><text x="194" y="198" fill="#3e6442" fontSize="13" fontWeight="700">CO₂ from air → leaf</text>
          <path d="M432 183 C407 179 400 166 412 147" fill="none" stroke="#398bb7" strokeWidth="3" markerEnd="url(#photoArrowBlue)" /><text x="453" y="191" fill="#2b7091" fontSize="13" fontWeight="700">Water → leaf</text>
          <path d="M338 164 C319 153 317 139 324 128" fill="none" stroke="#6f9b60" strokeWidth="2" strokeDasharray="4 4" /><text x="245" y="93" fill="#426b49" fontSize="13" fontWeight="700">Glucose made in leaves</text>
          {Array.from({ length: bubbleCount }, (_, index) => <g key={`oxygen-${index}`} style={{ animation: `oxygenRise ${Math.max(1.4, 3.2 - rate / 55)}s ease-out infinite`, animationDelay: `${index * .23}s`, transformBox: 'fill-box', transformOrigin: 'center' }}><circle cx={438 + (index % 3) * 12} cy={103 + Math.floor(index / 3) * 14} r={4 + (index % 2)} fill="#fff" stroke="#63aecd" strokeWidth="2" /><text x={451 + (index % 3) * 12} y={108 + Math.floor(index / 3) * 14} fill="#26799a" fontSize="11" fontWeight="800">O₂</text></g>)}
          <text x="507" y="75" fill="#26799a" fontSize="13" fontWeight="700">Oxygen released</text>
          <g transform="translate(560 123)"><rect width="105" height="114" rx="14" fill="rgba(255,255,255,.86)" stroke="#b9d8c0" strokeWidth="2" /><text x="52" y="24" textAnchor="middle" fill="#476e4e" fontSize="12" fontWeight="800">FOOD · GLUCOSE</text><rect x="21" y="40" width="63" height="55" rx="8" fill="#f1f6ed" stroke="#8bae81" strokeWidth="2" /><rect x="23" y={93 - glucose * .48} width="59" height={glucose * .48} rx="5" fill="#7abb60" /><text x="52" y="108" textAnchor="middle" fill="#426b49" fontSize="12" fontWeight="700">{Math.round(glucose)}%</text></g>
          {rate === 0 && <text x="350" y="58" textAnchor="middle" fill="#5c6370" fontSize="14" fontWeight="800">No photosynthesis without all three inputs</text>}
        </Box>
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        {inputControls.map((control) => <Paper key={control.key} elevation={0} sx={{ flex: 1, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2.5 }}><Stack spacing={.75}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography sx={{ fontWeight: 800 }}>{control.label}</Typography><Chip size="small" label={`${inputs[control.key]}%`} sx={{ color: control.color, fontWeight: 800 }} /></Stack><Slider min={0} max={100} step={1} value={inputs[control.key]} onChange={(_, value) => changeInput(control.key, Array.isArray(value) ? value[0] : value)} aria-label={control.label} sx={{ color: control.color, py: .5 }} /><Typography variant="caption" color="text.secondary" sx={{ minHeight: 36 }}>{control.description}</Typography></Stack></Paper>)}
      </Stack>

      <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: rate === 0 ? 'warning.main' : 'success.main', borderRadius: 2.5, backgroundColor: rate === 0 ? 'warning.light' : 'rgba(231,246,231,.65)' }}><Stack spacing={1}><Typography sx={{ fontWeight: 800, color: rate === 0 ? 'warning.dark' : 'success.dark' }}>{rate === 0 ? 'Photosynthesis has stopped because one input is at zero.' : rate < 50 ? `Photosynthesis is slow because ${factorLabel[limitingFactor]} is the limiting factor.` : `${factorLabel[limitingFactor]} is setting the current rate — the lowest input limits the process.`}</Typography><Typography variant="caption" color="text.secondary">This simplified model uses the lowest input to set the relative rate: {rate} out of 100. If one input is low, extra amounts of the others cannot make photosynthesis go faster.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><Box sx={{ flex: 1 }}><Stack direction="row" justifyContent="space-between"><Typography variant="caption" sx={{ fontWeight: 700 }}>Glucose made</Typography><Typography variant="caption">{Math.round(glucose)}%</Typography></Stack><Box sx={{ height: 10, mt: .5, borderRadius: 8, bgcolor: 'rgba(50,95,60,.13)', overflow: 'hidden' }}><Box sx={{ height: '100%', width: `${glucose}%`, bgcolor: '#62a950', transition: 'width .25s linear' }} /></Box></Box><Box sx={{ flex: 1 }}><Stack direction="row" justifyContent="space-between"><Typography variant="caption" sx={{ fontWeight: 700 }}>Oxygen released</Typography><Typography variant="caption">{oxygen.toFixed(1)} relative units</Typography></Stack><Box sx={{ height: 10, mt: .5, borderRadius: 8, bgcolor: 'rgba(44,127,157,.13)', overflow: 'hidden' }}><Box sx={{ height: '100%', width: `${oxygen}%`, bgcolor: '#3b9dc0', transition: 'width .25s linear' }} /></Box></Box></Stack></Stack></Paper>

      <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2.5 }}><Button aria-expanded={whyOpen} onClick={() => setWhyOpen((open) => !open)} sx={{ p: 0, textTransform: 'none', fontWeight: 800 }}>Why does a plant need all three inputs? {whyOpen ? '−' : '+'}</Button>{whyOpen && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Light supplies energy. Water from the roots and carbon dioxide from the air provide the materials the plant rearranges into glucose. Leaves use chlorophyll to capture light, and oxygen is released as a product. If any one supply runs short, the plant must slow down even when the other supplies are plentiful.</Typography>}</Paper>

      <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, border: 1, borderColor: 'divider', borderRadius: 2.5 }}><Stack spacing={1.5}><Box><Chip label="Two-part challenge" color="primary" variant="outlined" sx={{ mb: .75 }} /><Typography variant="h6" sx={{ fontWeight: 800 }}>Check what you understand</Typography></Box>
        <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: fastestCorrect ? 'success.main' : 'divider', borderRadius: 2 }}><Typography sx={{ fontWeight: 750 }}>1. Set all three inputs so the plant produces oxygen at its fastest rate.</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .4 }}>This round’s target is at least {round.targetRate}% of the maximum. Current computed rate: {rate}%.</Typography></Paper>
        <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}><Typography sx={{ fontWeight: 750 }}>2. In this example, will the plant make food quickly or slowly?</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Sunlight {round.scenario.inputs.sunlight}% · Water {round.scenario.inputs.water}% · CO₂ {round.scenario.inputs.co2}% → computed rate {round.scenario.rate}%. “Quickly” means a computed rate of at least 50%.</Typography><Stack direction="row" spacing={1} sx={{ mt: 1 }}><Button size="small" variant={conceptAnswer === 'quickly' ? 'contained' : 'outlined'} onClick={() => { setConceptAnswer('quickly'); setFeedback(null); setValidated(false); setCompleted(false) }}>Quickly</Button><Button size="small" variant={conceptAnswer === 'slowly' ? 'contained' : 'outlined'} onClick={() => { setConceptAnswer('slowly'); setFeedback(null); setValidated(false); setCompleted(false) }}>Slowly</Button></Stack></Paper>
        {feedback && <Paper role="status" aria-live="polite" elevation={0} sx={{ p: 1.5, border: 1, borderColor: feedback.correct ? 'success.main' : 'warning.main', backgroundColor: feedback.correct ? 'success.light' : 'warning.light', animation: feedback.correct ? 'successGlow .8s ease-in-out 3' : 'none' }}><Typography sx={{ fontWeight: 750, color: feedback.correct ? 'success.dark' : 'warning.dark' }}>{feedback.message}</Typography></Paper>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" onClick={checkActivity} disabled={completed} startIcon={<CheckCircleOutlineIcon />}>Check Activity</Button><Button variant="contained" color="success" disabled={!validated || !fastestCorrect || !conceptCorrect || completed} onClick={() => { setCompleted(true); onComplete?.() }} startIcon={<CheckCircleOutlineIcon />}>{completed ? 'Completed' : 'Complete Activity'}</Button><Button variant="text" onClick={reset} startIcon={<ReplayIcon />}>Reset · New round</Button></Stack>
      </Stack></Paper>
    </Stack>
  </Box>
}

export default PhotosynthesisLabActivity
