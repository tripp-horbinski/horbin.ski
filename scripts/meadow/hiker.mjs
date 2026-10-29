// Builds the About page's figure, Tripp on the trail in Iceland's highlands
// with his pack on, from his photo above a waterfall there, as a screen print
// to match the runner figures, from the same parts (screenprint.mjs): cut him
// out with Apple's Vision framework and separate flat inks traced with potrace
// into src/lib/meadow/hiker-art.ts. Nothing needs repairing: the photo has all
// of him, cap to shoes, and he's printed as he was.
//
//   npm run meadow:hiker -- hike.jpg
//
// Everything below is placed in that photo's pixels (697×929). The photo and
// the intermediate images stay in .cache; only the traced inks are committed.

import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CACHE } from './config.mjs'
import { cutout, preview, segment, separate, shrink, writeFigure } from './screenprint.mjs'

const OUT = new URL('../../src/lib/meadow/hiker-art.ts', import.meta.url)
const WORK = new URL('hiker/', CACHE)
const FACE = [495, 478] // a point on his face, for Vision to pick him out
// He's smaller in this photo than in the finish photo, so he's printed larger,
// for his face to get about that figure's detail
const SCALE = 1.6
// His head, cap to neck, which gets the finer inks
const HEAD = [[448, 412], [534, 412], [534, 470], [522, 500], [500, 512], [474, 505], [460, 470], [452, 440]]
// The only places that print white: his trail shoes and the logo on his shirt
const WHITE_OK = [
  [[440, 830], [500, 830], [500, 892], [440, 892]],
  [[578, 872], [622, 872], [622, 929], [578, 929]],
  [[500, 536], [521, 536], [521, 556], [500, 556]],
]
// There's no tattoo to find, so its search is pointed at a patch of sky
// beside his cap
const SKY = [[430, 420], [446, 420], [446, 436], [430, 436]]
// Where he stands: between where his feet meet the ground, his left foot
// back and his right nearer
const FEET = [[470, 886], [600, 928]]

async function main() {
  const photo = process.argv[2]
  if (!photo) throw new Error('usage: npm run meadow:hiker -- hike.jpg')
  await mkdir(WORK, { recursive: true })
  const { width: W, height: H } = await sharp(photo).metadata()
  const mask = cutout(await segment(photo, WORK, FACE))
  const photoPx = await sharp(photo).removeAlpha().raw().toBuffer()
  const rgb = Buffer.alloc(W * H * 3, 255)
  let [x0, y0, x1, y1] = [W, H, 0, 0]
  for (let i = 0; i < W * H; i++) {
    if (!mask[i]) continue
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = photoPx[i * 3 + c]
    const x = i % W
    const y = (i / W) | 0
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  const prepared = { W, H, rgb, mask, paint: Buffer.alloc(W * H * 4), photoPx }
  await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toFile(fileURLToPath(new URL('cutout.png', WORK)))

  const box = [Math.max(0, x0 - 8), Math.max(0, y0 - 8), Math.min(W, x1 + 9), Math.min(H, y1 + 9)]
  const big = await shrink(prepared, box, SCALE)
  const print = await separate(big.prepared, { head: HEAD, whiteOk: WHITE_OK, tattoo: { box: SKY, area: SKY }, origin: big.origin, unit: big.unit })
  print.layers = print.layers.filter((l) => l.d)
  const [[lx, ly], [rx, ry]] = FEET
  await writeFigure(OUT, 'HIKER_ART', "scripts/meadow/hiker.mjs from Tripp's photo above a waterfall in Iceland's highlands", print, [Math.round((lx + rx) / 2), Math.round((ly + ry) / 2)])
  await preview(print.box, print.layers, new URL('preview.png', WORK))
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
