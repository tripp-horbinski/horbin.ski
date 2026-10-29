import { RUNNER_ART } from '@/lib/meadow/runner-art'

export const dynamic = 'force-static'

// Tripp's finish-line print as a static SVG for the Stack page, in its own
// colors (the meadow multiplies them by the light) and his tan Cliftons, so
// the page doesn't ship the art as script
export function GET() {
  const { x0, y0, x1, y1, inks, shoes } = RUNNER_ART
  const paths = inks
    .map((ink) => `<path fill="${ink.shoe ? shoes.atps[ink.shoe] : ink.color}" fill-rule="evenodd" d="${ink.d}"/>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">${paths}</svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
}
