// The trail marker post at the edge of the meadow, drawn in reference-frame
// units. Its colors are multiplied by the light so it darkens at dusk.

import { lit } from './palette'

const C = {
  post: '#45362B',
  postHi: '#5E4A3A',
  top: '#6E5848',
  grain: '#33271F',
  sign: '#3D7A4D',
  sticker: '#E8E2D2',
  white: '#F4F0E4',
}

// A square post with a corner toward you: the narrow lit face on the left, the
// wide face on the right that carries the signs, and the cut top between them
const CORNER = 99
const FACE_SLOPE = (517.5 - 523) / (119 - CORNER) // the right face's top edge

export function drawPost(ctx: CanvasRenderingContext2D, light: string) {
  const c = (hex: string) => lit(hex, light)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.fillStyle = c(C.postHi)
  ctx.fill(new Path2D(`M88 519L${CORNER} 523L${CORNER} 672L88 672Z`))
  ctx.fillStyle = c(C.post)
  ctx.fill(new Path2D(`M${CORNER} 523L119 517.5L119 672L${CORNER} 672Z`))
  ctx.fillStyle = c(C.top)
  ctx.fill(new Path2D(`M88 519L${CORNER} 523L119 517.5L108 513.5Z`))
  ctx.strokeStyle = c(C.grain)
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(106, 582)
  ctx.lineTo(106.5, 672)
  ctx.moveTo(115, 598)
  ctx.lineTo(115.5, 664)
  ctx.stroke()

  // Green hiker blaze and a round sticker below it, on the right face and
  // slanted with it
  ctx.save()
  ctx.transform(1, FACE_SLOPE, 0, 1, 0, -FACE_SLOPE * CORNER)
  ctx.fillStyle = c(C.sign)
  ctx.beginPath()
  ctx.roundRect(103, 529, 12, 28, 1.5)
  ctx.fill()
  ctx.strokeStyle = c(C.white)
  ctx.fillStyle = c(C.white)
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.arc(109.5, 534.5, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(109.5, 537)
  ctx.lineTo(109, 545)
  ctx.lineTo(107, 552)
  ctx.moveTo(109, 545)
  ctx.lineTo(111.5, 552)
  ctx.moveTo(109.3, 539)
  ctx.lineTo(112.5, 543)
  ctx.lineTo(113, 551)
  ctx.stroke()
  ctx.fillStyle = c(C.sticker)
  ctx.beginPath()
  ctx.ellipse(109, 568, 5.4, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = c(C.post)
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.ellipse(109, 568, 3.2, 3.6, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

// A milepost for the career walk, cut like the trail post: a square post with
// a corner toward you, its number on a plate. Its foot is at the origin and
// it's drawn at the trail post's scale; the engine sizes it for its distance
export const MILEPOST_FOOT = 672

export function drawMilepost(ctx: CanvasRenderingContext2D, light: string, n: number) {
  const c = (hex: string) => lit(hex, light)
  ctx.fillStyle = c(C.postHi)
  ctx.fill(new Path2D('M-8 -118L-1 -115L-1 0L-8 0Z'))
  ctx.fillStyle = c(C.post)
  ctx.fill(new Path2D('M-1 -115L9 -120L9 0L-1 0Z'))
  ctx.fillStyle = c(C.top)
  ctx.fill(new Path2D('M-8 -118L1 -122.5L9 -120L-1 -115Z'))
  // The plate, its number routed in
  ctx.fillStyle = c(C.sticker)
  ctx.fill(new Path2D('M0.5 -108L8 -111.5L8 -88L0.5 -84.5Z'))
  ctx.fillStyle = c(C.grain)
  ctx.font = '700 14px "Josefin Sans", "Futura", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(n), 4.3, -97)
}
