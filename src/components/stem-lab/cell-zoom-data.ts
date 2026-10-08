export type CellPart = { id: string; label: string; explanation: string; point: { x: number; y: number }; box: { x: number; y: number; side: 'left' | 'right' } }

export const BOX_WIDTH = 210
export const BOX_HEIGHT = 60

export const CELL_PARTS: CellPart[] = [
  { id: 'cytoplasm', label: 'Cytoplasm', explanation: 'Cytoplasm is the jelly-like material where many cell activities happen.', point: { x: 385, y: 230 }, box: { x: 12, y: 78, side: 'left' } },
  { id: 'membrane', label: 'Cell membrane', explanation: 'The cell membrane surrounds the cell and controls what enters and leaves.', point: { x: 270, y: 345 }, box: { x: 12, y: 294, side: 'left' } },
  { id: 'mitochondria', label: 'Mitochondria', explanation: 'Mitochondria release usable energy from food for the cell.', point: { x: 385, y: 388 }, box: { x: 12, y: 402, side: 'left' } },
  { id: 'ribosomes', label: 'Ribosomes', explanation: 'Ribosomes build proteins that cells need to grow and work.', point: { x: 585, y: 260 }, box: { x: 778, y: 78, side: 'right' } },
  { id: 'endoplasmic-reticulum', label: 'Endoplasmic reticulum', explanation: 'The endoplasmic reticulum helps make and move materials around the cell.', point: { x: 566, y: 316 }, box: { x: 778, y: 186, side: 'right' } },
  { id: 'nucleus', label: 'Nucleus', explanation: 'The nucleus holds genetic information and helps direct the cell’s activities.', point: { x: 500, y: 345 }, box: { x: 778, y: 294, side: 'right' } },
  { id: 'golgi', label: 'Golgi apparatus', explanation: 'The Golgi apparatus sorts and packages materials for the cell to use or send out.', point: { x: 580, y: 438 }, box: { x: 778, y: 402, side: 'right' } },
]

export const getCalloutLine = (part: CellPart) => ({
  x1: part.point.x,
  y1: part.point.y,
  x2: part.box.side === 'left' ? part.box.x + BOX_WIDTH : part.box.x,
  y2: part.box.y + BOX_HEIGHT / 2,
})
