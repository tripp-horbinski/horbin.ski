// Tripp after the 2024 Milwaukee Lakefront Marathon, a screen print traced
// from the finish photo by scripts/meadow/runner.mjs. Each ink is multiplied
// by the light so the figure can stand in the meadow at any hour.

import { lit } from './palette'
import { RUNNER_ART } from './runner-art'

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

// Path2D on first draw, since this module also loads during server rendering
let inks: Path2D[] | null = null

// His shoes come in either colorway; the traced inks are the same shapes
export type Shoes = keyof typeof RUNNER_ART.shoes

export function drawRunner(ctx: CanvasRenderingContext2D, light: string, shoes: Shoes = 'atps') {
  inks ??= RUNNER_ART.inks.map((ink) => new Path2D(ink.d))
  RUNNER_ART.inks.forEach((ink, i) => {
    ctx.fillStyle = lit(ink.shoe ? RUNNER_ART.shoes[shoes][ink.shoe] : ink.color, light)
    // potrace leaves holes to the even-odd rule
    ctx.fill(inks![i], 'evenodd')
  })
}

// Whether a point, in the transform he's drawn with, lands on him rather than
// on the meadow around him
export function onRunner(ctx: CanvasRenderingContext2D, x: number, y: number) {
  inks ??= RUNNER_ART.inks.map((ink) => new Path2D(ink.d))
  return inks.some((ink) => ctx.isPointInPath(ink, x, y, 'evenodd'))
}
