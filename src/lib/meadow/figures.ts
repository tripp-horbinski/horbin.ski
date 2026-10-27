// The two hikers from the photograph and the trail marker beside them, drawn
// in photo units. Their colors are multiplied by the light so they fall into
// silhouette at dusk.

import { lit } from './palette'

export interface FigureState {
  // Pointing arm: direction in radians (0 = right, negative = up) and how raised it is
  armAngle: number
  armRaise: number
  // -1..1, where the man is looking
  look: number
  // 0..1, the woman lifting her camera to her eye, and the flash
  snap: number
  flash: number
  // Hair and strap sway
  sway: number
  breath: number
}

export const SHOULDER: [number, number] = [266, 466]

const C = {
  skin: '#C98F6C',
  skinShade: '#A36E52',
  shirt: '#222529',
  shirtHi: '#363A40',
  pants: '#474B52',
  pantsShade: '#33363C',
  cap: '#17191C',
  hair: '#2A211C',
  pack: '#1B1C1F',
  packHi: '#33363C',
  trim: '#3E8E6C',
  watch: '#3B7FC2',
  top: '#73429A',
  topShade: '#4F2C6C',
  hairW: '#4E2622',
  hairWHi: '#723B2D',
  pantsW: '#25282D',
  bag: '#141518',
  post: '#45362B',
  postHi: '#5E4A3A',
  postGrain: '#33271F',
  sign: '#3D7A4D',
  sticker: '#E8E2D2',
  white: '#F4F0E4',
}

type Pt = [number, number]

function limb(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = w
  ctx.beginPath()
  ctx.moveTo(a[0], a[1])
  ctx.lineTo(b[0], b[1])
  ctx.stroke()
}

function shape(ctx: CanvasRenderingContext2D, color: string, d: string) {
  ctx.fillStyle = color
  ctx.fill(new Path2D(d))
}

// Elbow and hand for the man's raised arm, blended from a relaxed pose
function armJoints(st: FigureState): { elbow: Pt; hand: Pt; dir: number } {
  const [sx, sy] = SHOULDER
  const bend = 0.28 * (1 - Math.max(0, -Math.sin(st.armAngle)) * 0.5)
  const up: Pt = [sx + Math.cos(st.armAngle - bend) * 26, sy + Math.sin(st.armAngle - bend) * 26]
  const pointHand: Pt = [up[0] + Math.cos(st.armAngle + bend * 0.5) * 24, up[1] + Math.sin(st.armAngle + bend * 0.5) * 24]
  const restElbow: Pt = [sx + 4, sy + 25]
  const restHand: Pt = [sx + 2, sy + 48]
  const k = st.armRaise
  const elbow: Pt = [restElbow[0] + (up[0] - restElbow[0]) * k, restElbow[1] + (up[1] - restElbow[1]) * k]
  const hand: Pt = [restHand[0] + (pointHand[0] - restHand[0]) * k, restHand[1] + (pointHand[1] - restHand[1]) * k]
  return { elbow, hand, dir: Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) }
}

export function drawFigures(ctx: CanvasRenderingContext2D, light: string, st: FigureState) {
  const c = (hex: string) => lit(hex, light)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const b = st.breath

  // --- The woman, half turned toward the mountains with her camera ---
  shape(ctx, c(C.pantsW), 'M139 548L177 548L179 645L160 645L158 596L156 645L136 645Z')
  shape(ctx, c(C.bag), 'M112 548Q112 540 120 540L140 540Q148 540 148 548L148 594Q148 602 140 602L120 602Q112 602 112 594Z')
  limb(ctx, [147, 484], [131, 543], 2.6, c(C.bag))
  limb(ctx, [137, 486], [128, 521], 6.5, c(C.skin))
  ctx.save()
  ctx.translate(0, -b * 0.6)
  shape(ctx, c(C.top), 'M135 482Q152 473 168 480L176 502Q178 528 175 551L137 553Q130 520 135 482Z')
  shape(ctx, c(C.topShade), 'M163 479L168 480L176 502Q178 528 175 551L161 552Q166 516 163 479Z')
  limb(ctx, [139, 482], [129, 545], 2.4, c(C.bag))
  shape(ctx, c(C.skin), 'M148 466L158 466L159 481L147 481Z')

  // Head turned toward the mountains: a sliver of face on the right, hair over the
  // crown and falling down her back
  ctx.fillStyle = c(C.skin)
  ctx.beginPath()
  ctx.ellipse(157, 461, 8.5, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  const sw = st.sway
  shape(
    ctx,
    c(C.hairW),
    `M165 456Q164 449 157 449Q148 449 146 456Q144 466 145 480Q${149 + sw * 4} 508 ${147 + sw * 7} 534Q${142 + sw * 6} 536 ${139 + sw * 5} 530Q${139 + sw * 2} 506 141 486Q141 472 149 470Q155 469 156 462Q158 457 165 456Z`,
  )
  shape(ctx, c(C.hairWHi), `M150 452Q154 450 158 451Q152 454 151 462L149 478Q148 494 ${149 + sw * 3} 512L146 512Q145 488 146 466Q146 456 150 452Z`)
  limb(ctx, [159.5, 459], [165, 459], 2, c(C.bag))
  ctx.restore()

  // Camera hand: held at her chest, lifted to her eye when something catches her
  const s = st.snap
  const elbowW: Pt = [171 + 5 * s, 516 - 18 * s]
  const cam: Pt = [181 - 9 * s, 540 - 79 * s]
  limb(ctx, [168, 486], elbowW, 6.5, c(C.skin))
  limb(ctx, elbowW, cam, 5.5, c(C.skin))
  ctx.fillStyle = c(C.bag)
  ctx.beginPath()
  ctx.roundRect(cam[0] - 2, cam[1] - 5, 12, 9, 2)
  ctx.fill()
  ctx.fillStyle = c(C.shirtHi)
  ctx.beginPath()
  ctx.arc(cam[0] + 9, cam[1] - 0.5, 2.6, 0, Math.PI * 2)
  ctx.fill()

  // --- The man, backpack on, pointing out across the meadow ---
  shape(ctx, c(C.pants), 'M204 548L240 548L238 600L236 648L214 648L208 600Z')
  shape(ctx, c(C.pantsShade), 'M236 548L272 548L270 600L268 648L246 648L240 590Z')
  ctx.save()
  ctx.translate(0, -b)
  shape(ctx, c(C.shirt), 'M202 468Q206 459 226 458L252 458Q268 459 272 469L274 552L203 554Q199 510 202 468Z')

  // Left forearm raised across his front, watch on the wrist
  limb(ctx, [205, 469], [203, 482], 11, c(C.shirt))
  limb(ctx, [203, 480], [199, 508], 7.5, c(C.skin))
  limb(ctx, [199, 508], [190, 490], 6.5, c(C.skin))
  limb(ctx, [193, 497], [192, 495], 7, c(C.watch))
  ctx.fillStyle = c(C.skin)
  ctx.beginPath()
  ctx.arc(189, 487, 4, 0, Math.PI * 2)
  ctx.fill()

  // Backpack with green trim
  ctx.fillStyle = c(C.pack)
  ctx.beginPath()
  ctx.roundRect(219, 467, 63, 86, [14, 14, 9, 9])
  ctx.fill()
  shape(ctx, c(C.packHi), 'M268 498Q284 500 283 520L282 544Q276 550 268 546Z')
  ctx.strokeStyle = c(C.trim)
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(224, 480)
  ctx.quadraticCurveTo(250, 466, 278, 478)
  ctx.moveTo(228, 506)
  ctx.lineTo(262, 504)
  ctx.stroke()
  ctx.strokeStyle = c(C.packHi)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(226, 492)
  ctx.quadraticCurveTo(250, 486, 276, 492)
  ctx.moveTo(230, 528)
  ctx.quadraticCurveTo(250, 534, 268, 528)
  ctx.stroke()

  // Head, cap brim swinging toward whatever he's looking at
  shape(ctx, c(C.skin), 'M226 452L240 452L241 467L225 467Z')
  ctx.fillStyle = c(C.hair)
  ctx.beginPath()
  ctx.ellipse(232, 449, 11.5, 12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = c(C.skinShade)
  ctx.beginPath()
  ctx.ellipse(240.5 + st.look, 451, 2.4, 3.6, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = c(C.cap)
  ctx.beginPath()
  ctx.ellipse(232, 441, 13, 8.5, 0, Math.PI, 0)
  ctx.lineTo(245, 444)
  ctx.lineTo(219, 444)
  ctx.fill()
  const brim = 244 + st.look * 7
  shape(ctx, c(C.cap), `M240 438L${brim + 8} ${441 - st.look}L${brim} 446L238 445Z`)

  // Pointing arm
  const { elbow, hand, dir } = armJoints(st)
  limb(ctx, SHOULDER, [SHOULDER[0] + (elbow[0] - SHOULDER[0]) * 0.3, SHOULDER[1] + (elbow[1] - SHOULDER[1]) * 0.3], 11, c(C.shirt))
  limb(ctx, [SHOULDER[0] + (elbow[0] - SHOULDER[0]) * 0.25, SHOULDER[1] + (elbow[1] - SHOULDER[1]) * 0.25], elbow, 7.5, c(C.skin))
  limb(ctx, elbow, hand, 6.5, c(C.skinShade))
  ctx.fillStyle = c(C.skinShade)
  ctx.beginPath()
  ctx.arc(hand[0], hand[1], 4, 0, Math.PI * 2)
  ctx.fill()
  const finger = 7 * st.armRaise
  limb(ctx, hand, [hand[0] + Math.cos(dir) * finger, hand[1] + Math.sin(dir) * finger], 2.4, c(C.skinShade))
  ctx.restore()

  // --- Trail marker post ---
  shape(ctx, c(C.post), 'M88 672L90 520Q103 511 117 516L119 672Z')
  shape(ctx, c(C.postHi), 'M90 520Q93 517 96 516L96 672L88 672Z')
  ctx.strokeStyle = c(C.postGrain)
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(108, 575)
  ctx.lineTo(109, 672)
  ctx.moveTo(113, 600)
  ctx.lineTo(113.5, 660)
  ctx.stroke()
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

  // Camera flash, drawn last so it blooms over everything nearby
  if (st.flash > 0) {
    const g = ctx.createRadialGradient(cam[0] + 9, cam[1], 0, cam[0] + 9, cam[1], 34)
    g.addColorStop(0, `rgba(255,252,240,${0.95 * st.flash})`)
    g.addColorStop(1, 'rgba(255,252,240,0)')
    ctx.fillStyle = g
    ctx.fillRect(cam[0] - 30, cam[1] - 40, 80, 80)
  }
}
