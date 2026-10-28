// The trail marker post at the edge of the meadow, drawn in reference-frame
// units. Its colors are multiplied by the light so it darkens at dusk.

import { lit } from './palette'

const C = {
  post: '#45362B',
  postHi: '#5E4A3A',
  grain: '#33271F',
  sign: '#3D7A4D',
  sticker: '#E8E2D2',
  white: '#F4F0E4',
}

export function drawPost(ctx: CanvasRenderingContext2D, light: string) {
  const c = (hex: string) => lit(hex, light)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.fillStyle = c(C.post)
  ctx.fill(new Path2D('M88 672L90 520Q103 511 117 516L119 672Z'))
  ctx.fillStyle = c(C.postHi)
  ctx.fill(new Path2D('M90 520Q93 517 96 516L96 672L88 672Z'))
  ctx.strokeStyle = c(C.grain)
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(108, 575)
  ctx.lineTo(109, 672)
  ctx.moveTo(113, 600)
  ctx.lineTo(113.5, 660)
  ctx.stroke()

  // Green hiker blaze and a round sticker below it
  ctx.fillStyle = c(C.sign)
  ctx.beginPath()
  ctx.roundRect(93, 523, 12, 28, 1.5)
  ctx.fill()
  ctx.strokeStyle = c(C.white)
  ctx.fillStyle = c(C.white)
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.arc(99.5, 528.5, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(99.5, 531)
  ctx.lineTo(99, 539)
  ctx.lineTo(97, 546)
  ctx.moveTo(99, 539)
  ctx.lineTo(101.5, 546)
  ctx.moveTo(99.3, 533)
  ctx.lineTo(102.5, 537)
  ctx.lineTo(103, 545)
  ctx.stroke()
  ctx.fillStyle = c(C.sticker)
  ctx.beginPath()
  ctx.arc(99, 564, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = c(C.post)
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.arc(99, 564, 3.6, 0, Math.PI * 2)
  ctx.stroke()
}
