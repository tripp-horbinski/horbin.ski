// Builds Stella, Tripp's border collie, as a screen print to match his
// figures, from the same parts (screenprint.mjs), from his photo of her
// standing in the grass one October morning: cut her out with Apple's Vision
// framework and separate flat inks traced with potrace into
// src/lib/meadow/stella-art.ts. Vision's person mask doesn't see a dog, so
// she's cut out by its foreground mask alone. On the way, the grass it takes
// in at her paws is filled in from her fur, and the low sun's gold is taken
// back out of her white, so she prints black and white as she is.
//
//   npm run meadow:stella -- stella.jpg
//
// Everything below is placed in that photo's pixels (1239×929). The photo and
// the intermediate images stay in .cache; only the traced inks are committed.

import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CACHE } from './config.mjs'
import { canvas, lab, POSTER, preview, rgbOf, segment, separate, shrink, writeFigure } from './screenprint.mjs'

const OUT = new URL('../../src/lib/meadow/stella-art.ts', import.meta.url)
const WORK = new URL('stella/', CACHE)
const NOSE = [812, 410] // segment() looks for a person here, and finds none
// Her face is small and dark in this photo, so she's printed larger, for its
// features to survive the smoothing
const SCALE = 1.6
// Her face, eyes to chin, which gets the finer inks. Its edge runs through
// the deepest black around her eyes and down her cheek, where its inks and the
// body's agree, so it doesn't show.
const FACE = [[764, 386], [774, 377], [798, 376], [812, 376], [836, 377], [850, 384], [856, 402], [858, 440], [842, 468], [812, 480], [786, 488], [764, 478], [760, 440]]
// She's black and white all over, so she can print white anywhere
const EVERYWHERE = [[0, 0], [1239, 0], [1239, 929], [0, 929]]
// She prints closer to the photo than the runner figures, as the jacket print
// does: about twice their inks, smoothed lightly, keeping small patches of
// light and shade, and with no outline, so her coat reads as fur
const DETAIL = {
  ...POSTER,
  inks: { body: 30, head: 24 },
  smooth: { body: [[2, 1.2, 14]], head: [[2, 1, 10]] },
  majority: { radius: 1, passes: 1 },
  islands: { body: 4, head: 1 },
  turd: { body: 3, head: 1 },
  outline: false,
}
// Her coat is long and fluffy, and filled solid its outline reads heavier
// than she is, so it's shaved in: her body most, her head and legs, which
// are slim already, less, blending from one to the other over a band
const SHAVE = { coat: 12, head: 4, legs: 3 }
const BELLY = [585, 625] // her legs, below her belly and chest, from the first height to the second
const NECK = [455, 495] // her head, right of her ruff and above her chest, to the first height from the second
const RUFF = 735
// Her paws, each a center and radius, which are left as they are: her near
// hind paw, her far one lifted behind it, and her forepaw. The shaving fades
// out over this many pixels round them.
const PAWS = [[472, 672, 22], [520, 622, 18], [718, 693, 28]]
const PAW_FADE = 12
// Her eyes, each its center, and their radii. They're brown, but gray in the
// shade of her face in the photo.
const EYES = [[781, 386], [825, 385]]
const IRIS = [5, 3.5]
// There's no tattoo to find, so its search is pointed at the grass in front
// of her
const NOWHERE = [[300, 800], [316, 800], [316, 816], [300, 816]]
const KNEES = 640 // the height of her knees, below which the grass is
// Where she stands: between her near hind foot and her forefeet
const FEET = [[474, 688], [722, 708]]

// Her tones, in Lab, for the print. The low sun gilds her white fur and the
// tips of her black, which would print as a tan dog's markings, so every
// yellow is pulled most of the way back toward white, the lighter the more;
// the blue shade on her blaze and foreleg keeps its color. Her black coat is
// all but black in the photo and would print as a silhouette, so its deepest
// darks are spread apart, as a printer would pull a charcoal for its sheen, for
// her shoulder, ruff and feathers to show. Her tongue, in her own shade, is a
// dull mauve that wouldn't read as one, so it's brightened toward its pink.
function retone([l, a, b]) {
  if (a > 6 && b < a * 0.3 && l > 20) return [l + 14, Math.min(38, a * 2.6), b + 10]
  if (b > a) {
    const pull = 0.65 * Math.min(1, Math.max(0, (l - 15) / 30))
    ;[a, b] = [a * (1 - pull), b * (1 - pull) + 3 * pull]
  }
  if (l < 20) l = 20 * (l / 20) ** 0.75
  return [l, a, b]
}

// How far into her eyes (x, y) is, from 0 at their edge to 1 well inside
const inEye = (x, y) => Math.max(0, ...EYES.map(([cx, cy]) => Math.min(1, 1.5 * (1 - ((x - cx) / IRIS[0]) ** 2 - ((y - cy) / IRIS[1]) ** 2))))
// Inside her eyes, everything lighter than the pupil is warmed softly toward
// brown, fading out to their edge, keeping the photo's light and shade
function warm(tone, e) {
  const [l, a, b] = retone(tone)
  return tone[0] > 14 ? [l, a + 6 * e, b + 12 * e] : [l, a, b]
}

// The mask without the pixels within radius(x, y) of its edge
function shave(mask, W, H, radius) {
  const discs = []
  const disc = (r) => {
    if (discs[r]) return discs[r]
    discs[r] = []
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) discs[r].push(dy * W + dx)
    return discs[r]
  }
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const r = Math.round(radius(x, y))
      if (mask[i] && x >= r && y >= r && x < W - r && y < H - r && disc(r).every((d) => mask[i + d])) out[i] = 1
    }
  }
  return out
}

// How far in her outline is shaved at (x, y)
function shaving(x, y) {
  const ramp = ([a, b], v) => Math.min(1, Math.max(0, (v - a) / (b - a)))
  const legs = ramp(BELLY, y)
  const head = x > RUFF ? 1 - ramp(NECK, y) : 0
  const above = SHAVE.coat + (SHAVE.head - SHAVE.coat) * head
  const paw = Math.max(...PAWS.map(([cx, cy, r]) => 1 - (Math.hypot(x - cx, y - cy) - r) / PAW_FADE))
  return (above + (SHAVE.legs - above) * legs) * (1 - Math.min(1, Math.max(0, paw)))
}

async function main() {
  const photo = process.argv[2]
  if (!photo) throw new Error('usage: npm run meadow:stella -- stella.jpg')
  await mkdir(WORK, { recursive: true })
  const { width: W, height: H } = await sharp(photo).metadata()
  const { fg } = await segment(photo, WORK, NOSE)
  const mask = Uint8Array.from(fg, (v) => (v > 127 ? 1 : 0))
  const photoPx = await sharp(photo).removeAlpha().raw().toBuffer()
  const img = Float32Array.from(photoPx)
  // Vision's mask takes in the grass in front of her paws, in a smooth outline
  // that's hers: below her knees, what's dark and yellow-green is filled in
  // from the fur around it
  const grass = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    if (!mask[i]) continue
    const tone = lab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2])
    if (i >= KNEES * W && tone[0] < 50 && tone[1] < -1 && tone[2] > 8) grass[i] = 1
    else img.set(rgbOf(warm(tone, inEye(i % W, (i / W) | 0))), i * 3)
  }
  canvas(img, mask, W, H).inpaint(grass, Uint8Array.from(mask, (v, i) => v & (1 - grass[i])), 60)
  mask.set(shave(mask, W, H, shaving))

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

  const box = [Math.max(0, x0 - 8), Math.max(0, y0 - 8), Math.min(W, x1 + 9), Math.min(H, y1 + 9)]
  const big = await shrink(prepared, box, SCALE)
  const print = await separate(big.prepared, { head: FACE, whiteOk: [EVERYWHERE], tattoo: { box: NOWHERE, area: NOWHERE }, origin: big.origin, unit: big.unit, detail: DETAIL })
  print.layers = print.layers.filter((l) => l.d)
  const [[hx, hy], [fx, fy]] = FEET
  await writeFigure(OUT, 'STELLA_ART', "scripts/meadow/stella.mjs from Tripp's photo of Stella, his border collie", print, [Math.round((hx + fx) / 2), Math.round((hy + fy) / 2)])
  await preview(print.box, print.layers, new URL('preview.png', WORK))
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
