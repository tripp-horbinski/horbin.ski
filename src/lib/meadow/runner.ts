// Tripp at the 2024 Milwaukee Lakefront Marathon, screen prints traced from
// his race photos by scripts/meadow/runner.mjs (after the finish) and
// runner-bridge.mjs (crossing the Hoan Bridge). Each ink is multiplied by the
// light so the figures can stand in the meadow at any hour.

import { lit } from './palette'
import { RUNNER_ART } from './runner-art'
import { RUNNER_BRIDGE_ART } from './runner-bridge-art'

type Art = typeof RUNNER_ART

// Where the figure sits in the photo's pixels: everything is inside this box,
// and it stands at (footX, footY), between its feet
export const RUNNER = {
  x0: RUNNER_ART.x0,
  y0: RUNNER_ART.y0,
  x1: RUNNER_ART.x1,
  y1: RUNNER_ART.y1,
  footX: RUNNER_ART.footX,
  footY: RUNNER_ART.footY,
  // His eyes, to stand him at the right height in the meadow
  eyeY: 244,
}

// The line through his feet, for a shadow under both: his left foot is
// nearer the camera, lower in the photo
export const STANCE = { angle: 0.16, length: 200 }

// Each figure: its traced inks, his eyes, and the line through his feet. On
// the bridge he's mid-stride, so the line runs from under his trailing toe,
// off the road, to his leading foot.
export const FIGURES = {
  finish: { art: RUNNER_ART, eyeY: RUNNER.eyeY, stance: STANCE },
  bridge: { art: RUNNER_BRIDGE_ART, eyeY: 1375, stance: { angle: 0.12, length: 205 } },
}
export type FigureName = keyof typeof FIGURES

// Path2D on first draw, since this module also loads during server rendering
const paths = new Map<Art, Path2D[]>()

// His shoes come in either colorway; the traced inks are the same shapes
export type Shoes = keyof typeof RUNNER_ART.shoes

function inksOf(art: Art) {
  if (!paths.has(art)) paths.set(art, art.inks.map((ink) => new Path2D(ink.d)))
  return paths.get(art)!
}

export function drawFigure(ctx: CanvasRenderingContext2D, art: Art, light: string, shoes: Shoes = 'atps') {
  const inks = inksOf(art)
  art.inks.forEach((ink, i) => {
    ctx.fillStyle = lit(ink.shoe ? art.shoes[shoes][ink.shoe] : ink.color, light)
    // potrace leaves holes to the even-odd rule
    ctx.fill(inks[i], 'evenodd')
  })
}

export function drawRunner(ctx: CanvasRenderingContext2D, light: string, shoes: Shoes = 'atps') {
  drawFigure(ctx, RUNNER_ART, light, shoes)
}

// Whether a point, in the transform a figure's drawn with, lands on it rather
// than on the meadow around it
export function onFigure(ctx: CanvasRenderingContext2D, art: Art, x: number, y: number) {
  return inksOf(art).some((ink) => ctx.isPointInPath(ink, x, y, 'evenodd'))
}

export function onRunner(ctx: CanvasRenderingContext2D, x: number, y: number) {
  return onFigure(ctx, RUNNER_ART, x, y)
}
