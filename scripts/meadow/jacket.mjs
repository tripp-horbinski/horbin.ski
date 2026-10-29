// Builds the About page's figure, Tripp with his arms crossed in his gold AWS
// Certified jacket, from his photo in it, as a screen print to match the
// others, from the same parts (screenprint.mjs): cut him out with Apple's
// Vision framework and separate flat inks traced with potrace into
// src/lib/meadow/jacket-art.ts. The photo stops at his shins, so he's
// extended past its bottom edge before separating and the page crops the
// print back to it. On the way, the jacket's logo, lost in its shine and too
// small to separate, is smoothed into the gold and traced on its own at 12×
// to print crisp on top; the jacket's reflections of the room are pulled back
// toward gold; and his gray T-shirt's hem, his shorts and his bare legs give
// way to jeans, painted in the photo's pixels from the jacket's waistband
// down past the photo's edge, so they posterize like the rest of him.
//
//   npm run meadow:jacket -- jacket.jpg
//
// The phone's photo is 3000×4000, stored on its side with an orientation
// tag, so it's turned upright and shrunk to 660×880 first, which gives his
// face about the finish figure's detail. Everything below is placed in those
// pixels. The photo and the intermediate images stay in .cache; only the
// traced inks are committed.

import { mkdir } from 'node:fs/promises'
import potrace from 'potrace'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CACHE } from './config.mjs'
import { canvas, cutout, hex, lab, POSTER, preview, rgbOf, segment, separate, writeFigure } from './screenprint.mjs'

const OUT = new URL('../../src/lib/meadow/jacket-art.ts', import.meta.url)
const WORK = new URL('jacket/', CACHE)
const HEIGHT = 880 // the working photo's height
const FACE = [290, 210] // a point on his face, for Vision to pick him out
// How far past the photo's bottom edge he's extended, and how far of that
// counts as him
const PAD = 16
const REACH = 8
// Where the foreground mask alone cuts out his head: the rows from above his
// head down to the bottoms of his ears
const HEAD_TOP = 110
const EARS = 212
// His head, hair to collar, which gets the finer inks
const HEAD = [[240, 130], [342, 130], [346, 200], [336, 250], [315, 268], [290, 272], [262, 262], [246, 230], [240, 180]]
// The only place that prints white: the jacket's logo
const WHITE_OK = [[[280, 300], [348, 296], [350, 328], [282, 330]]]
// His tattoo is under the jeans, so its search is pointed at a patch of the
// room beside his head
const NOWHERE = [[60, 200], [90, 200], [90, 230], [60, 230]]
// He prints closer to the photo than the runner figures: about twice their
// inks, smoothed lightly, keeping small patches of light and shade, and with
// no outline, so the jacket's sheen and his face read as they are
const LIKENESS = {
  ...POSTER,
  inks: { body: 30, head: 24 },
  smooth: { body: [[2, 1.2, 14]], head: [[2, 1, 10]] },
  majority: { radius: 1, passes: 1 },
  islands: { body: 4, head: 1 },
  turd: { body: 3, head: 1 },
  outline: false,
}
// The jacket, collar to waistband, his crossed arms in it
const JACKET = [[120, 270], [410, 270], [410, 572], [120, 572]]

// His jeans. They start where the jacket's ribbed waistband ends, found
// down each column, no higher than WAIST_MIN and no lower than WAIST_MAX. The
// seat runs from there to the crotch, as wide as his hips under the jacket;
// each leg, a straight cut along his own leg a little fuller than it, runs
// from the hip past the photo's bottom edge. Each leg is its middle with a
// half width at each point.
const WAIST_MIN = 572
const WAIST_MAX = 590
const SEAT = [[176, 572], [372, 572], [379, 620], [382, 670], [380, 705], [292, 705], [276, 690], [260, 705], [184, 705], [177, 660], [175, 615]]
const RIGHT_LEG = [[220, 650, 42], [222, 720, 37], [222, 800, 35], [225, 900, 33]]
const LEFT_LEG = [[330, 650, 46], [336, 720, 42], [342, 800, 39], [348, 900, 37]]
// Indigo denim, from its creases to the fade at the thighs and knees, a
// little muted for the warm light he's in
const DENIM = [[26, 32, 48], [40, 52, 78], [56, 72, 104], [80, 98, 132], [112, 128, 158], [150, 162, 186]]
const DENIM_STOPS = [0, 0.22, 0.45, 0.68, 0.86, 1]

// The logo on his left chest, "aws", the certification badge and "certified",
// rising a little to the right, in the cream its letters show in this light,
// scaled to the 65 pixels it spans here; and the band around it in the photo
const LOGO = [222, 208, 184]
const LOGO_BAND = [[272, 312], [350, 306], [352, 330], [274, 334]]
const LOGO_BOX = [268, 300, 356, 336]
const LOGO_SCALE = 12
const logoSvg = () => {
  const ink = `rgb(${LOGO})`
  const badge = [0, 1, 2, 3, 4, 5].map((k) => {
    const a = ((k * 60 - 90) * Math.PI) / 180
    return `${(13.4 * Math.cos(a)).toFixed(2)} ${(13.4 * Math.sin(a)).toFixed(2)}`
  })
  return `<g transform="translate(277 323.4) rotate(-2.6) scale(0.285)">
    <text x="0" y="0" font-family="Avenir Next" font-weight="600" font-size="35" textLength="71" lengthAdjust="spacingAndGlyphs" fill="${ink}">aws</text>
    <g transform="translate(89 -11) rotate(12)"><path d="M${badge.join('L')}Z" fill="${ink}"/></g>
    <text x="106" y="1" font-family="Avenir Next" font-weight="600" font-size="35" textLength="122" lengthAdjust="spacingAndGlyphs" fill="${ink}">certified</text>
  </g>`
}

// Where a point is along a leg: how far down it as a share of its length, how
// far to its side as a share of its half width there and in pixels, and
// whether it's inside
function along(limb, x, y) {
  let best = null
  let run = 0
  for (let k = 1; k < limb.length; k++) {
    const [ax, ay, aw] = limb[k - 1]
    const [bx, by, bw] = limb[k]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy)
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (len * len)))
    const side = ((x - ax) * dy - (y - ay) * dx) / len
    const off = Math.hypot(x - ax - t * dx, y - ay - t * dy)
    const w = aw + (bw - aw) * t
    if (!best || off / w < best.d) best = { d: off / w, s: side / w, px: side, t: run + t * len }
    run += len
  }
  return { ...best, inside: best.d <= 1, share: best.t / run }
}
const outline = (limb) => {
  const sides = [[], []]
  limb.forEach(([x, y, w], k) => {
    const [px, py] = limb[Math.max(0, k - 1)]
    const [nx, ny] = limb[Math.min(limb.length - 1, k + 1)]
    const len = Math.hypot(nx - px, ny - py)
    sides[0].push([x - ((ny - py) / len) * w, y + ((nx - px) / len) * w])
    sides[1].push([x + ((ny - py) / len) * w, y - ((nx - px) / len) * w])
  })
  return `M${[...sides[0], ...sides[1].reverse()].map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z`
}

// The light on him below the T-shirt, 0 to 1, from the photo: how light his
// shorts are against the rest of his shorts and his legs against the rest of
// his legs, so the black fabric's folds and his legs' shading carry into the
// jeans alike. Where the jeans are wider than he was it's filled in from the
// pixels beside it, and it's softened so the edge of his shorts doesn't show.
const SHORTS_TOP = 636
async function photoLight(photoPx, him, W, H, where) {
  const L = new Float32Array(W * H)
  const kind = new Int8Array(W * H).fill(-1) // 0 fabric, 1 skin
  const values = [[], []]
  for (let i = SHORTS_TOP * W; i < W * H; i++) {
    if (!where[i] || !him[i]) continue
    const [r, g, b] = [photoPx[i * 3], photoPx[i * 3 + 1], photoPx[i * 3 + 2]]
    const l = lab(r, g, b)
    L[i] = l[0]
    kind[i] = r > b + 20 && r >= g && l[0] > 30 ? 1 : 0
    values[kind[i]].push(l[0])
  }
  const range = values.map((v) => {
    v.sort((a, b) => a - b)
    return [v[Math.floor(v.length * 0.05)], v[Math.floor(v.length * 0.95)]]
  })
  const known = new Uint8Array(W * H)
  const out = new Float32Array(W * H).fill(0.5)
  for (let i = 0; i < W * H; i++) {
    if (kind[i] < 0) continue
    const [lo, hi] = range[kind[i]]
    out[i] = Math.max(0, Math.min(1, (L[i] - lo) / (hi - lo)))
    known[i] = 1
  }
  // Fill in where he wasn't from beside it, then soften
  for (let pass = 0; pass < 60; pass++) {
    for (let i = SHORTS_TOP * W; i < W * H - W; i++) {
      if (!where[i] || known[i]) continue
      let sum = 0
      let n = 0
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (!where[j]) continue
        sum += out[j]
        n++
      }
      if (n) out[i] = sum / n
    }
  }
  const soft = await sharp(Buffer.from(out.map((v) => Math.round(v * 255))), { raw: { width: W, height: H, channels: 1 } }).blur(2.2).raw().toBuffer()
  return Float32Array.from(soft, (v) => v / 255)
}

// Smooth noise, for the denim's fades and whiskers
const hash = (x, y, k) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(k, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function noise(x, y, k) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = (x - xi) ** 2 * (3 - 2 * (x - xi))
  const v = (y - yi) ** 2 * (3 - 2 * (y - yi))
  const [a, b, c, d] = [hash(xi, yi, k), hash(xi + 1, yi, k), hash(xi, yi + 1, k), hash(xi + 1, yi + 1, k)]
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const ridge = (n) => 1 - Math.abs(2 * n - 1)

// The denim's tone, 0 (a crease) to 1 (the most faded): round shading across
// each leg, faded softly down the front of the thigh, whiskers at the top of
// the thigh, creases where it bends at the knee, and long folds down the leg
function denim({ px, s, t, share }, k) {
  const front = 1 - s * s
  let v = 0.36 + 0.26 * front - 0.08 * s
  v += 0.14 * Math.exp(-(((share - 0.32) / 0.2) ** 2)) * front
  if (share < 0.2) v += 0.16 * ridge(noise(t / 5, px / 16, 40 + k)) ** 6
  if (share > 0.5 && share < 0.75) v -= 0.14 * ridge(noise(t / 6, px / 22, 50 + k)) ** 5
  v += 0.1 * (noise(px / 7, t / 70, 80 + k) - 0.5)
  return v + 0.05 * (noise(px / 8, t / 30, 60 + k) - 0.5)
}
function ramp(v) {
  v = Math.max(0, Math.min(1, v))
  let k = 0
  while (k < DENIM_STOPS.length - 2 && v > DENIM_STOPS[k + 1]) k++
  const f = (v - DENIM_STOPS[k]) / (DENIM_STOPS[k + 1] - DENIM_STOPS[k])
  return DENIM[k].map((c, j) => c + (DENIM[k + 1][j] - c) * f)
}

// The logo alone, rendered at LOGO_SCALE× over its box and traced, back in
// the photo's pixels
async function traceLogo() {
  const [x0, y0, x1, y1] = LOGO_BOX
  const k = LOGO_SCALE
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(x1 - x0) * k}" height="${(y1 - y0) * k}"><rect width="100%" height="100%" fill="#fff"/><g transform="scale(${k}) translate(${-x0} ${-y0})">${logoSvg().replace(/fill="rgb\([^)]*\)"/g, 'fill="#000"')}</g></svg>`
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  const tracer = new potrace.Potrace({ turdSize: 4, optTolerance: 0.3, alphaMax: 1, threshold: 128 })
  await new Promise((res, rej) => tracer.loadImage(png, (err) => (err ? rej(err) : res())))
  const d = tracer.getPathTag().match(/ d="([^"]*)"/)?.[1] ?? ''
  const r2 = (n) => Math.round(n * 100) / 100
  return d
    .replace(/(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/g, (_, x, y) => `${r2(x0 + x / k)} ${r2(y0 + y / k)}`)
    .replace(/,?\s+/g, ' ')
    .replace(/\s*([MLCZ])\s*/g, '$1')
    .trim()
}

async function main() {
  const photo = process.argv[2]
  if (!photo) throw new Error('usage: npm run meadow:jacket -- jacket.jpg')
  await mkdir(WORK, { recursive: true })
  const upright = fileURLToPath(new URL('photo.png', WORK))
  await sharp(photo).rotate().resize({ height: HEIGHT }).png().toFile(upright)
  const { width: W } = await sharp(upright).metadata()
  // Vision's person mask is unsure along the side of his head against the
  // bright window, and would clip it, so there, down to his ears, the
  // foreground mask alone cuts him out. Below that it would take in the
  // window's frame beside his jaw, so the two masks go together as usual.
  const fgOnly = new Uint8Array(W * HEIGHT)
  for (let y = HEAD_TOP; y < EARS; y++) fgOnly.fill(1, y * W, (y + 1) * W)
  const inner = cutout(await segment(upright, WORK, FACE), fgOnly)

  // The photo extended down by repeating its bottom rows, and his mask a
  // little way into that, so the outline along his shins falls outside the
  // frame
  const H = HEIGHT + PAD
  const photoPx = await sharp(upright).removeAlpha().extend({ bottom: PAD, extendWith: 'copy' }).raw().toBuffer()
  const mask = new Uint8Array(W * H)
  for (let y = 0; y < HEIGHT + REACH; y++) {
    for (let x = 0; x < W; x++) mask[y * W + x] = inner[Math.min(y, HEIGHT - 1) * W + x]
  }
  const img = Float32Array.from(photoPx)
  const { paint, poly, svgMask, inpaint } = canvas(img, mask, W, H)
  const labAt = (i) => lab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2])

  // The jacket: its darks and the pinkish browns of the room it reflects are
  // pulled partway back to gold, so it prints as gold foil. Its light grays,
  // the silver zipper pull under the collar and the sky it mirrors, would
  // print in the plate's own blue-gray and look like holes, so they go most
  // of the way to a pale gold. The black T-shirt at the throat stays black.
  const head = await poly(HEAD)
  const jacket = await poly(JACKET)
  for (let i = 0; i < W * H; i++) {
    if (!mask[i] || !jacket[i] || head[i]) continue
    const [l, a, b] = labAt(i)
    const gray = l > 32 && b < 26 ? 0.75 : 0.25
    img.set(rgbOf([l + Math.max(0, 66 - l) * 0.15, a - Math.max(0, a - 12) * 0.55 + Math.max(0, 6 - a) * (gray - 0.25), b + Math.max(0, 42 - b) * gray]), i * 3)
  }

  // His jeans. Down each column the waistband is a deep gold and the T-shirt
  // below it a warm gray, so the jeans start at the first pixel there that's
  // no longer that yellow.
  // Everything of him below the waistband that isn't jeans goes.
  const waist = new Int16Array(W).fill(WAIST_MAX)
  for (let x = 0; x < W; x++) {
    for (let y = WAIST_MIN; y < WAIST_MAX; y++) {
      if (mask[y * W + x] && labAt(y * W + x)[2] < 34) {
        waist[x] = y
        break
      }
    }
  }
  const seat = await poly(SEAT)
  const legMasks = [await svgMask(`<path d="${outline(RIGHT_LEG)}" fill="#fff"/>`), await svgMask(`<path d="${outline(LEFT_LEG)}" fill="#fff"/>`)]
  const lightOnHim = await photoLight(photoPx, Uint8Array.from(mask), W, H, Uint8Array.from(seat, (v, i) => v | legMasks[0][i] | legMasks[1][i]))
  for (let y = WAIST_MIN; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (y < waist[x]) continue
      const jeans = y < HEIGHT + REACH && (seat[i] || legMasks[0][i] || legMasks[1][i])
      if (!jeans) {
        mask[i] = 0
        continue
      }
      const legs = [along(RIGHT_LEG, x, y), along(LEFT_LEG, x, y)]
      const leg = legs.filter((l) => l.inside && y >= 650).sort((a, b) => a.d - b.d)[0]
      let v
      if (leg) v = denim(leg, legs.indexOf(leg))
      else {
        // The seat, above where the legs part, rounding over his hips
        const s = (x - 278) / 104
        v = 0.42 + 0.16 * (1 - s * s) + 0.12 * ridge(noise(x / 16, y / 5, 70)) ** 6
      }
      // Below the T-shirt, the light as it fell on him: the folds of his
      // shorts and the roundness of his legs
      if (y >= SHORTS_TOP) v = 0.55 * v + 0.6 * (lightOnHim[i] - 0.5) + 0.22
      // The jacket's hem shades the top of the jeans
      v -= 0.22 * Math.max(0, 1 - (y - waist[x]) / 7)
      img.set(ramp(v), i * 3)
      mask[i] = 1
    }
  }

  // The blur of the logo in the photo, smoothed into the gold around it
  const band = Uint8Array.from(await poly(LOGO_BAND), (v, i) => v & mask[i])
  inpaint(band, Uint8Array.from(mask, (v, i) => v & !band[i]), 300)

  // His edge in the photo is a blend of him and the bright window behind, and
  // with no outline it would print as a pale rim: the two pixels along it are
  // filled in from just inside
  const rim = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    if (!mask[i]) continue
    const x = i % W
    const y = (i / W) | 0
    outer: for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx
        const yy = y + dy
        if (xx >= 0 && xx < W && yy >= 0 && yy < H && !mask[yy * W + xx]) {
          rim[i] = 1
          break outer
        }
      }
    }
  }
  inpaint(rim, Uint8Array.from(mask, (v, i) => v & !rim[i]), 12)

  const rgb = Buffer.alloc(W * H * 3, 255)
  for (let i = 0; i < W * H * 3; i++) if (mask[(i / 3) | 0]) rgb[i] = Math.round(img[i])
  await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toFile(fileURLToPath(new URL('repaired.png', WORK)))

  const prepared = { W, H, rgb, mask, paint, photoPx }
  const print = await separate(prepared, { head: HEAD, whiteOk: WHITE_OK, tattoo: { box: NOWHERE, area: NOWHERE }, detail: LIKENESS })
  print.layers = print.layers.filter((l) => l.d)
  print.layers.push({ color: hex(LOGO), d: await traceLogo() })
  // He has no feet in the photo; he stands at its bottom edge, between his legs
  const footX = Math.round((RIGHT_LEG.at(-1)[0] + LEFT_LEG.at(-1)[0]) / 2)
  await writeFigure(OUT, 'JACKET_ART', "scripts/meadow/jacket.mjs from Tripp's photo in his gold AWS Certified jacket, in jeans", print, [footX, HEIGHT])
  await preview(print.box, print.layers, new URL('preview.png', WORK))
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
