// Builds Pretzel, Tripp's Australian shepherd, as a screen print to match his
// figures, from the same parts (screenprint.mjs), from his photo of Pretzel
// standing on the landing of a wooden stair: cut out with Apple's Vision
// framework and separated into flat inks traced with potrace into
// src/lib/meadow/pretzel-art.ts. Vision's person mask doesn't see a dog, so
// Pretzel's cut out by its foreground mask alone, which takes in the toy
// Santa behind; that's cut away along the rump. On the way, the lamplight's
// warmth is taken back out of the coat, so the blue merle prints blue.
//
//   npm run meadow:pretzel -- pretzel.jpg
//
// Everything below is placed in that photo's pixels (1239×929). The photo and
// the intermediate images stay in .cache; only the traced inks are committed.

import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CACHE } from './config.mjs'
import { canvas, lab, POSTER, preview, rgbOf, segment, separate, shrink, writeFigure } from './screenprint.mjs'

const OUT = new URL('../../src/lib/meadow/pretzel-art.ts', import.meta.url)
const WORK = new URL('pretzel/', CACHE)
const NOSE = [940, 237] // segment() looks for a person here, and finds none
// The photo shows Pretzel at about twice the scale of Tripp's finish photo,
// and the meadow shows Pretzel smaller than him, so it's shrunk to about a
// third before separating: still more detail than the meadow ever shows, at
// less weight than his print
const SCALE = 0.35
// The toy Santa standing behind the rump: everything left of this line, and
// of the white cloth under it. The fur over Santa is thin, and colored by
// him, so the line runs where it thickens to the gray of the coat.
const SANTA = [[0, 360], [272, 360], [276, 390], [275, 420], [278, 440], [280, 460], [280, 480], [278, 500], [278, 520], [280, 540], [282, 560], [285, 580], [288, 600], [292, 620], [297, 640], [303, 652], [312, 660], [326, 662], [0, 662]]
// Santa's red, showing through the wisps of fur along that line, is filled
// in from the gray around it
const WISPS = [[270, 370], [320, 370], [320, 670], [270, 670]]
// The feathering under the chest and belly is white and gray, but the dark
// floor through it makes it tan, so it's pulled back to neutral like the
// rest of the coat however warm it is
const FEATHERS = [[505, 565], [700, 565], [700, 730], [590, 730], [505, 610]]
// The face, brow to chin, which gets the finer inks. Its edge runs through
// the black behind the eye and under the ear, where its inks and the body's
// agree.
const FACE = [[790, 100], [860, 92], [910, 110], [940, 150], [955, 200], [968, 235], [955, 270], [920, 292], [870, 300], [830, 290], [800, 260], [785, 210], [780, 150]]
// The coat is white at the collar, blaze and legs, so it can print white anywhere
const EVERYWHERE = [[0, 0], [1239, 0], [1239, 929], [0, 929]]
// Closer to the photo than the runner figures, like Stella: more inks, smoothed
// less, keeping smaller patches, the face finest of all, and with no outline,
// so the coat reads as fur
const DETAIL = {
  ...POSTER,
  inks: { body: 18, head: 22 },
  smooth: { body: [[3, 2, 20], [3, 2, 16]], head: [[2, 1, 10]] },
  majority: { radius: 1, passes: 1 },
  islands: { body: 12, head: 1 },
  turd: { body: 8, head: 1 },
  outline: false,
}
// There's no tattoo to find, so its search is pointed at the floor in front
const NOWHERE = [[540, 860], [556, 860], [556, 876], [540, 876]]
// Where Pretzel stands: between the near hind paw and the near forepaw
const FEET = [[375, 788], [712, 798]]

// The coat's tones, in Lab, for the print. The lamplight and the wood all
// round warm everything, which would print the gray of a blue merle as
// brown: what's near neutral is pulled most of the way back to it, the mid
// grays a little past it toward blue, while the copper points, which are
// more strongly colored, keep theirs; in the shade, where the black fur
// takes on a brown cast, it takes more color to count as copper. The black
// patches are all but black in the photo, so their deepest darks are spread
// apart for their form to show.
function retone([l, a, b], feathers = false) {
  const copper = 9 + 5 * Math.min(1, Math.max(0, (35 - l) / 12))
  const keep = feathers ? 0 : Math.min(1, Math.max(0, (Math.hypot(a, b) - copper) / 6)) * Math.min(1, Math.max(0, (76 - l) / 8))
  const pull = 0.85 * (1 - keep)
  const blue = 5 * Math.max(0, 1 - Math.abs(l - 45) / 30) * (1 - keep)
  if (l < 20) l = 20 * (l / 20) ** 0.8
  return [l, a * (1 - pull), b * (1 - pull) - blue]
}

// Vision's outline takes in the wisps at the edge of the coat, through which
// the wood behind shows, and they'd print as a brown rim. The copper points
// are too near the wood in color to pick them out by it alone, so each pixel
// within RIM of the edge is weighed against the photo just outside (within
// OUTSIDE) and the coat just inside (within INSIDE), and peeled off if it's
// nearer the outside.
const RIM = 10
const [OUTSIDE, INSIDE] = [8, 14]
function peel(mask, px, W, H) {
  const L = new Float32Array(W * H * 3)
  for (let i = 0; i < W * H; i++) L.set(lab(px[i * 3], px[i * 3 + 1], px[i * 3 + 2]), i * 3)
  // How far in from the edge each pixel is, counted to RIM + 1
  const depth = Uint8Array.from(mask, (v) => (v ? RIM + 1 : 0))
  let ring = []
  for (let i = 0; i < W * H; i++) if (!mask[i]) ring.push(i)
  for (let d = 1; d <= RIM && ring.length; d++) {
    const next = []
    for (const i of ring) {
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j >= 0 && j < W * H && depth[j] > d) {
          depth[j] = d
          next.push(j)
        }
      }
    }
    ring = next
  }
  const mean = (x, y, r, where) => {
    const m = [0, 0, 0]
    let n = 0
    for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) {
      for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) {
        const j = yy * W + xx
        if (!where(j)) continue
        for (let c = 0; c < 3; c++) m[c] += L[j * 3 + c]
        n++
      }
    }
    return n && m.map((v) => v / n)
  }
  const far = (i, c) => (L[i * 3] - c[0]) ** 2 + (L[i * 3 + 1] - c[1]) ** 2 + (L[i * 3 + 2] - c[2]) ** 2
  const out = mask.slice()
  for (let i = 0; i < W * H; i++) {
    if (!mask[i] || depth[i] > RIM) continue
    const [x, y] = [i % W, (i / W) | 0]
    const outside = mean(x, y, OUTSIDE, (j) => !mask[j])
    const inside = mean(x, y, INSIDE, (j) => depth[j] > RIM)
    if (outside && inside && far(i, outside) < far(i, inside)) out[i] = 0
  }
  return out
}

async function main() {
  const photo = process.argv[2]
  if (!photo) throw new Error('usage: npm run meadow:pretzel -- pretzel.jpg')
  await mkdir(WORK, { recursive: true })
  const { width: W, height: H } = await sharp(photo).metadata()
  const { fg } = await segment(photo, WORK, NOSE)
  const mask = Uint8Array.from(fg, (v) => (v > 127 ? 1 : 0))
  const photoPx = await sharp(photo).removeAlpha().raw().toBuffer()
  const img = Float32Array.from(photoPx)
  const repair = canvas(img, mask, W, H)
  const [santa, wisps, feathers] = await Promise.all([repair.poly(SANTA), repair.poly(WISPS), repair.poly(FEATHERS)])
  for (let i = 0; i < W * H; i++) if (santa[i]) mask[i] = 0
  mask.set(peel(mask, photoPx, W, H))
  const red = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    if (!mask[i]) continue
    const tone = lab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2])
    if (wisps[i] && tone[1] > 12 && tone[1] > tone[2]) red[i] = 1
    else img.set(rgbOf(retone(tone, feathers[i])), i * 3)
  }
  repair.inpaint(red, Uint8Array.from(mask, (v, i) => v & (1 - red[i])), 40)

  const rgb = Buffer.alloc(W * H * 3, 255)
  let [x0, y0, x1, y1] = [W, H, 0, 0]
  for (let i = 0; i < W * H; i++) {
    if (!mask[i]) continue
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.round(img[i * 3 + c])
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
  await writeFigure(OUT, 'PRETZEL_ART', "scripts/meadow/pretzel.mjs from Tripp's photo of Pretzel, his Australian shepherd", print, [Math.round((hx + fx) / 2), Math.round((hy + fy) / 2)])
  await preview(print.box, print.layers, new URL('preview.png', WORK))
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
