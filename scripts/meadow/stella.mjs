// Builds Stella, Tripp's border collie, as a screen print to match his
// figures, from the same parts (screenprint.mjs), from his photo of her with
// her tennis ball by the window one July afternoon: cut her out with Apple's
// Vision framework and separate flat inks traced with potrace into
// src/lib/meadow/stella-art.ts. Vision's person mask isn't meant for a dog,
// so she's cut out by its foreground mask alone. On the way, her ball is
// taken out of her mouth, and the warmth and shade are taken back out of her
// white, so she prints black and white as she is.
//
//   npm run meadow:stella -- stella.jpg
//
// The phone keeps the photo sideways with a note to turn it, which Vision
// doesn't read, so it's turned upright and shrunk to 1500×2000 first, and
// everything below is placed in those pixels. The photo and the intermediate
// images stay in .cache; only the traced inks are committed.

import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CACHE } from './config.mjs'
import { canvas, lab, POSTER, preview, rgbOf, segment, separate, shrink, writeFigure } from './screenprint.mjs'

const OUT = new URL('../../src/lib/meadow/stella-art.ts', import.meta.url)
const WORK = new URL('stella/', CACHE)
const WIDTH = 1500
const NOSE = [1000, 720] // segment() looks for a person here, and finds none
// The meadow shows her far smaller than this photo does, so it's shrunk to a
// quarter before separating, as Pretzel's is: still more detail than the
// meadow ever shows, her face's features among it, at less weight than
// Tripp's print
const SCALE = 0.25
// The sun behind her lights the tips of her coat as a bright rim round her
// black, so her outline is shaved in by this much
const SHAVE = 3
// Her face and throat, brow to chest, which get the finer inks. Its edge runs
// through the black under her ears and down her neck, where its inks and the
// body's agree.
const FACE = [[850, 560], [930, 540], [1010, 545], [1080, 580], [1090, 650], [1075, 730], [1060, 820], [1060, 930], [1000, 990], [940, 990], [900, 930], [885, 820], [855, 730], [840, 640]]
// She's black and white all over, so she can print white anywhere
const EVERYWHERE = [[0, 0], [WIDTH, 0], [WIDTH, 2000], [0, 2000]]
// Closer to the photo than the runner figures, as Pretzel's is: more inks,
// keeping smaller patches, her face finest of all, and with no outline, so
// her coat reads as fur; smoothed a little more than Pretzel's, since her
// black is all shading, which would otherwise take a great many paths
const DETAIL = {
  ...POSTER,
  inks: { body: 18, head: 22 },
  smooth: { body: [[3, 2, 24], [3, 2, 20]], head: [[2, 1, 10]] },
  majority: { radius: 1, passes: 1 },
  islands: { body: 16, head: 1 },
  turd: { body: 10, head: 1 },
  outline: false,
}
// There's no tattoo to find, so its search is pointed at the carpet in front
// of her
const NOWHERE = [[900, 1700], [916, 1700], [916, 1716], [900, 1716]]
// Her tennis ball, hanging under her tongue against her chest: its center and
// radius, taking in its fuzz. It stands out past her neck to the right, so
// her outline there is cut back to the line her neck follows above and below
// it; within that, her tongue's tip, which hangs behind it, is drawn on as a
// rounded end (its center and radii), and the rest is filled in from the fur
// around it.
const BALL = [988, 913, 64]
const NECK = [[1060, 855], [1020, 975]]
const TIP = [966, 856, 36, 30]
// Her tongue above the ball, both lobes of it. The crease where they fold
// together is a dull pink, too gray to tell from her fur by its color, and
// would print as a white speck, so whatever isn't the dark of her mouth in
// here is tongue.
const TONGUE = [[935, 788], [1002, 778], [1006, 852], [944, 852]]
// Where she stands: between her near hind paw and her near forepaw. She's
// turned toward the camera, so the forepaw is lower in the photo.
const FEET = [[465, 1318], [760, 1428]]

// Her tones, in Lab, for the print. Her tongue keeps its pink. Otherwise the
// room's warmth and the sky's blue are pulled most of the way back to
// neutral, so her black prints black; and her white is in shade, gray beside
// the sunlit carpet, so the lighter a tone the more it's lifted toward white.
// The sun glances off her black as a gray sheen that would print as gray
// patches, but it's duller than her sunlit white and cool with the sky where
// her shaded white is warm, so what's dull and cool is dimmed toward her
// black instead. Her black coat is all but black in the photo and would print
// as a silhouette, so its deepest darks are spread apart, as a printer would
// pull a charcoal for its sheen, for her shoulder and haunch to show.
const isTongue = ([l, a, b]) => a > 6 && b < a * 1.2 && l > 35
function retone([l, a, b], tongue = false) {
  if ((tongue && l > 30) || isTongue([l, a, b])) return [l, a * 1.3, b]
  const white = Math.min(1, Math.max(0, (l - 34) / 20 + (b - 1.5) / 4))
  if (l > 20) l -= (l - 20) * 0.5 * (1 - white)
  else l = 20 * (l / 20) ** 0.75
  return [l + (95 - l) * 0.7 * white, a * 0.2, b * 0.2]
}

// Whether (x, y) is inside the polygon `pts`
function inPoly(pts, x, y) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inTongue = (i, W) => inPoly(TONGUE, i % W, (i / W) | 0)

// Takes her ball out of the photo, `img` as floats, with her in `mask`
function unball(img, mask, W, H) {
  const [bx, by, br] = BALL
  const [[ax, ay], [cx, cy]] = NECK
  const neckX = (y) => ax + ((y - ay) * (cx - ax)) / (cy - ay)
  const toneAt = (i) => lab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2])
  const ball = new Uint8Array(W * H)
  for (let y = by - br; y <= by + br; y++) {
    for (let x = bx - br; x <= bx + br; x++) {
      const i = y * W + x
      if ((x - bx) ** 2 + (y - by) ** 2 > br * br || !mask[i]) continue
      if (x > neckX(y)) mask[i] = 0
      else ball[i] = 1
    }
  }
  // The tongue's tip, in the tongue's color just above the ball
  const [tx, ty, rx, ry] = TIP
  const pink = [0, 0, 0]
  let n = 0
  for (let y = by - br - 14; y < by - br + 4; y++) {
    for (let x = tx - rx; x <= tx + rx; x++) {
      const i = y * W + x
      if (ball[i] || !isTongue(toneAt(i))) continue
      for (let c = 0; c < 3; c++) pink[c] += img[i * 3 + c]
      n++
    }
  }
  // The rest from her fur around it, but not from her tongue
  const known = Uint8Array.from(mask, (v, i) => (v && !ball[i] && !inTongue(i, W) && !isTongue(toneAt(i)) ? 1 : 0))
  canvas(img, mask, W, H).inpaint(ball, known, 200)
  for (let i = 0; i < W * H; i++) {
    if (!ball[i]) continue
    const [x, y] = [i % W, (i / W) | 0]
    if (((x - tx) / rx) ** 2 + ((y - ty) / ry) ** 2 <= 1) img.set(pink.map((v) => v / n), i * 3)
  }
}

// The mask without the pixels within r of its edge
function shave(mask, W, H, r) {
  const disc = []
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) disc.push(dy * W + dx)
  const out = new Uint8Array(W * H)
  for (let y = r; y < H - r; y++) {
    for (let x = r; x < W - r; x++) {
      const i = y * W + x
      if (mask[i] && disc.every((d) => mask[i + d])) out[i] = 1
    }
  }
  return out
}

async function main() {
  const original = process.argv[2]
  if (!original) throw new Error('usage: npm run meadow:stella -- stella.jpg')
  await mkdir(WORK, { recursive: true })
  const photo = fileURLToPath(new URL('upright.png', WORK))
  await sharp(original).rotate().resize({ width: WIDTH }).png().toFile(photo)
  const { width: W, height: H } = await sharp(photo).metadata()
  const { fg } = await segment(photo, WORK, NOSE)
  const photoPx = await sharp(photo).removeAlpha().raw().toBuffer()
  const img = Float32Array.from(photoPx)
  const cut = Uint8Array.from(fg, (v) => (v > 127 ? 1 : 0))
  unball(img, cut, W, H)
  const mask = shave(cut, W, H, SHAVE)

  const rgb = Buffer.alloc(W * H * 3, 255)
  let [x0, y0, x1, y1] = [W, H, 0, 0]
  for (let i = 0; i < W * H; i++) {
    if (!mask[i]) continue
    rgb.set(rgbOf(retone(lab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2]), inTongue(i, W))), i * 3)
    const x = i % W
    const y = (i / W) | 0
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  const prepared = { W, H, rgb, mask, paint: Buffer.alloc(W * H * 4), photoPx }
  await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toFile(fileURLToPath(new URL('repaired.png', WORK)))

  // separate() works a few pixels out from the figure, so it's given room
  // for them at the shrunk scale
  const pad = Math.ceil(6 / SCALE)
  const box = [Math.max(0, x0 - pad), Math.max(0, y0 - pad), Math.min(W, x1 + pad + 1), Math.min(H, y1 + pad + 1)]
  const small = await shrink(prepared, box, SCALE)
  const print = await separate(small.prepared, { head: FACE, whiteOk: [EVERYWHERE], tattoo: { box: NOWHERE, area: NOWHERE }, origin: small.origin, unit: small.unit, detail: DETAIL })
  print.layers = print.layers.filter((l) => l.d)
  const [[hx, hy], [fx, fy]] = FEET
  await writeFigure(OUT, 'STELLA_ART', "scripts/meadow/stella.mjs from Tripp's photo of Stella, his border collie", print, [Math.round((hx + fx) / 2), Math.round((hy + fy) / 2)])
  await preview(print.box, print.layers, new URL('preview.png', WORK))
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
