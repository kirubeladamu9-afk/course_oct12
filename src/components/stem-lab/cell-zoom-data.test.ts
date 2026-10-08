import { describe, expect, it } from 'vitest'
import { BOX_HEIGHT, BOX_WIDTH, CELL_PARTS, getCalloutLine } from './cell-zoom-data'

describe('Cell Zoom callouts', () => {
  it('keeps seven unique labels and structures', () => {
    expect(CELL_PARTS).toHaveLength(7)
    expect(new Set(CELL_PARTS.map((part) => part.id)).size).toBe(7)
    expect(new Set(CELL_PARTS.map((part) => part.label)).size).toBe(7)
  })

  it('ends every straight pointer at the exact center of its drop-box edge', () => {
    for (const part of CELL_PARTS) {
      const line = getCalloutLine(part)
      expect(line.x1).toBe(part.point.x)
      expect(line.y1).toBe(part.point.y)
      expect(line.x2).toBe(part.box.side === 'left' ? part.box.x + BOX_WIDTH : part.box.x)
      expect(line.y2).toBe(part.box.y + BOX_HEIGHT / 2)
    }
  })

  it('keeps pointer lines from crossing one another', () => {
    const orientation = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    const lines = CELL_PARTS.map(getCalloutLine)
    for (let first = 0; first < lines.length; first += 1) {
      for (let second = first + 1; second < lines.length; second += 1) {
        const a = lines[first]
        const b = lines[second]
        const crosses = orientation(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1) * orientation(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2) < 0
          && orientation(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1) * orientation(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2) < 0
        expect(crosses).toBe(false)
      }
    }
  })
})
