// Traces a photograph of the Flatirons into the same layered vector format the
// lidar renderer produces: sky line, rock in a few tones, forest, open slopes.
// Use it on your own photo from the meadow; a trace of someone else's photo is
// a copy of their work, so by default the output stays in the local cache.
//
//   node scripts/meadow/trace-photo.mjs photo.jpg [--out src/lib/meadow/terrain.ts]
//
// It also writes .cache/photo-skyline.json, which calibrate.mjs uses to line the
// lidar camera up with the photo's framing.

import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { CACHE } from './config.mjs'
import { emitModule } from './emit.mjs'

export const CLASS = { sky: 0, rock: 1, forest: 2, open: 3 }

// Colors in a sunny late-summer photo of the Front Range
export function classify(r, g, b) {
  const lum = 0.3 * r + 0.59 * g + 0.11 * b
  const lo = Math.min(r, g, b)
  const hi = Math.max(r, g, b)
  if ((b > r + 12 && b >= g && lum > 95) || (lo > 175 && hi - lo < 45)) return CLASS.sky
  if (g >= r - 4 && g > b && lum < 120) return CLASS.forest
  if (lum < 70) return CLASS.forest
  if (r > b + 45 && g > b + 30 && lum > 120) return CLASS.open
  return CLASS.rock
}

export async function loadPhoto(path, width = 1200, blur = 0) {
  let img = sharp(path).resize(width).removeAlpha()
  if (blur) img = img.blur(blur)
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

// Most common class in each neighborhood, to knock out speckle before tracing
function majority(cls, width, height, r = 2) {
  const out = new Uint8Array(cls.length)
  const counts = new Uint16Array(4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      counts.fill(0)
      for (let dy = -r; dy <= r; dy++) {
        const yy = Math.min(height - 1, Math.max(0, y + dy))
        for (let dx = -r; dx <= r; dx++) counts[cls[yy * width + Math.min(width - 1, Math.max(0, x + dx))]]++
      }
      let best = 0
      for (let c = 1; c < 4; c++) if (counts[c] > counts[best]) best = c
      out[y * width + x] = best
    }
  }
  return out
}

export function classMap(photo) {
  const { data, width, height } = photo
  const cls = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) cls[i] = classify(data[i * 3], data[i * 3 + 1], data[i * 3 + 2])
  return cls
}

// First row from the top where the ground starts and stays for a few pixels
export function skylineOf(cls, width, height, run = 4) {
  const out = new Float32Array(width)
  for (let x = 0; x < width; x++) {
    let y = 0
    for (; y < height - run; y++) {
      let solid = true
      for (let k = 0; k < run && solid; k++) solid = cls[(y + k) * width + x] !== CLASS.sky
      if (solid) break
    }
    out[x] = y
  }
  return out
}

async function main() {
  const args = process.argv.slice(2)
  const path = args.find((a) => !a.startsWith('--'))
  const outIdx = args.indexOf('--out')
  const out = outIdx >= 0 ? args[outIdx + 1] : new URL('terrain.photo.ts', CACHE).pathname
  if (!path) throw new Error('usage: trace-photo.mjs photo.jpg [--out file.ts]')

  const photo = await loadPhoto(path)
  const { width, height, data } = photo
  const cls = classMap(photo)
  const skyline = skylineOf(cls, width, height)
  await writeFile(new URL('photo-skyline.json', CACHE), JSON.stringify({ width, height, skyline: [...skyline] }))

  // Debug view of the classes, to check the color rules on a new photo
  const tint = [[120, 170, 230], [225, 150, 130], [40, 90, 50], [230, 200, 110]]
  const dbg = Buffer.alloc(width * height * 3)
  cls.forEach((c, i) => dbg.set(tint[c], i * 3))
  await sharp(dbg, { raw: { width, height, channels: 3 } }).png().toFile(new URL('photo-classes.png', CACHE).pathname)

  // Only the mountain is traced; the meadow and everything near is drawn by hand.
  // Trace from a softened copy so the shapes come out as flat print areas.
  const horizon = 452
  const soft = await loadPhoto(path, width, 1.4)
  const lumAt = (i) => 0.3 * soft.data[i * 3] + 0.59 * soft.data[i * 3 + 1] + 0.11 * soft.data[i * 3 + 2]
  const smooth = majority(classMap(soft), width, height)
  smooth.forEach((c, i) => (cls[i] = c))
  const layer = (test) => {
    const m = new Uint8Array(width * horizon)
    for (let y = 0; y < horizon; y++) for (let x = 0; x < width; x++) if (y >= skyline[x] && test(y * width + x)) m[y * width + x] = 1
    return m
  }
  // Posterize the rock into three tones, like separate screens in a print
  const rockLum = []
  for (let i = 0; i < width * horizon; i++) if (cls[i] === CLASS.rock) rockLum.push(lumAt(i))
  rockLum.sort((a, b) => a - b)
  const q = (p) => rockLum[Math.floor(p * (rockLum.length - 1))]
  const [t1, t2] = [q(0.33), q(0.72)]

  await emitModule(out, {
    source: `Traced from a photograph (${path.split('/').pop()})`,
    frame: { x0: 0, y0: 0, width, height: horizon },
    skyline: [...skyline],
    facets: [
      { kind: 'land', tone: 0.3, haze: 0, mask: layer((i) => cls[i] === CLASS.forest && lumAt(i) < 55) },
      { kind: 'land', tone: 0.7, haze: 0, mask: layer((i) => cls[i] === CLASS.forest && lumAt(i) >= 55) },
      { kind: 'open', tone: 0.6, haze: 0, mask: layer((i) => cls[i] === CLASS.open) },
      { kind: 'rock', tone: 0.15, haze: 0, mask: layer((i) => cls[i] === CLASS.rock && lumAt(i) < t1) },
      { kind: 'rock', tone: 0.55, haze: 0, mask: layer((i) => cls[i] === CLASS.rock && lumAt(i) >= t1 && lumAt(i) < t2) },
      { kind: 'rock', tone: 0.95, haze: 0, mask: layer((i) => cls[i] === CLASS.rock && lumAt(i) >= t2) },
    ],
    rock: layer((i) => cls[i] === CLASS.rock),
    trees: [],
    camera: null,
  })
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
