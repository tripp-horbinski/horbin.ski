import { HIKER_ART } from './hiker-art'

// Tripp on the trail, framed for the About page: the print with room around
// it, half as wide as it's tall, and his shadow along the line through his
// feet, as the figures on /me/ have. The photo ends at the sole of his nearer
// shoe, so the frame ends there too.
const { x0, y0, x1, y1, footX, footY, inks } = HIKER_ART
const STANCE = { angle: 0.31, length: 136 }
const height = y1 - y0 + 18
const width = height / 2
export const HIKER_FRAME = { x: Math.round((x0 + x1) / 2 - width / 2), y: y0 - 18, width: Math.round(width), height }

export function hikerSvg() {
  const { x, y, width, height } = HIKER_FRAME
  const shadow = `<ellipse cx="${footX}" cy="${footY}" rx="${STANCE.length / 2 + 18}" ry="8" transform="rotate(${((STANCE.angle * 180) / Math.PI).toFixed(1)} ${footX} ${footY})" fill="#1B1E22" fill-opacity="0.18"/>`
  const paths = inks.map((ink) => `<path fill="${ink.color}" fill-rule="evenodd" d="${ink.d}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}">${shadow}${paths}</svg>`
}
