import { JACKET_ART } from './jacket-art'

// Tripp in his gold AWS Certified jacket and jeans, framed for the About
// page: the print with room around it, cut off where the photo ends at his
// shins, so he runs off the bottom of the plate
const { x0, y0, x1, footY, inks } = JACKET_ART
export const JACKET_FRAME = { x: x0 - 16, y: y0 - 18, width: x1 - x0 + 32, height: footY - y0 + 18 }

export function jacketSvg() {
  const { x, y, width, height } = JACKET_FRAME
  const paths = inks.map((ink) => `<path fill="${ink.color}" fill-rule="evenodd" d="${ink.d}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}">${paths}</svg>`
}
