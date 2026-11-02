// The page's backdrop, generated into public/backdrop: the pines where the page
// rises over the meadow, and the foot it ends on, the mountain's real skyline.
//
//   npm run meadow:backdrop

import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { TERRAIN } from '../../src/lib/meadow/terrain.ts'

const out = fileURLToPath(new URL('../../public/backdrop/', import.meta.url))
await mkdir(out, { recursive: true })

const W = 2400
let seed = 11
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const wave = (x, a, b, c) => a * Math.sin(x / b + c) + (a / 2) * Math.sin(x / (b / 2.3) + c * 2)
const n = (v) => v.toFixed(0)

// One flat ink: a rolling edge with blades of grass standing on it
function grass(top, H, color, count, hMin, hMax, a, b, c) {
  const edge = (x) => top + wave(x, a, b, c)
  let d = `M0 ${H}L0 ${n(edge(0))}`
  for (let x = 16; x <= W + 16; x += 16) d += `L${x} ${n(edge(x))}`
  d += `L${W + 16} ${H}Z`
  for (let i = 0; i < count; i++) {
    const x = rnd() * W
    const y = edge(x) + 8
    const h = hMin + rnd() * (hMax - hMin)
    const lean = (rnd() * 0.5 + 0.08) * h * (rnd() < 0.82 ? 1 : -1)
    const w = 2.2 + rnd() * 3.6
    d += `M${n(x - w)} ${n(y)}Q${n(x - w + lean * 0.25)} ${n(y - h * 0.6)} ${n(x + lean)} ${n(y - h)}Q${n(x + w + lean * 0.35)} ${n(y - h * 0.55)} ${n(x + w)} ${n(y)}Z`
  }
  return `<path fill="${color}" d="${d}"/>`
}

// A row of pines in one flat ink, tier under tier like the scene's treeline
function pines(base, H, color, step, hMin, hMax) {
  let d = `M-20 ${n(base - hMin * 0.4)}L${W + 20} ${n(base - hMin * 0.4)}L${W + 20} ${H}L-20 ${H}Z`
  for (let x = -10; x < W + 20; x += step * (0.6 + rnd() * 0.8)) {
    const h = hMin + rnd() * (hMax - hMin)
    const hw = h * (0.13 + rnd() * 0.04)
    const tiers = Math.round(5 + h / 45)
    const right = []
    for (let t = 1; t <= tiers; t++) {
      const f = t / tiers
      const y = base - h + h * f
      const w = hw * f ** 0.85 * (0.88 + rnd() * 0.24)
      right.push([w, y])
      if (t < tiers) right.push([w * 0.5, y - (h / tiers) * 0.1])
    }
    d += `M${n(x)} ${n(base - h)}`
    for (const [w, y] of right) d += `L${n(x + w)} ${n(y)}`
    for (const [w, y] of [...right].reverse()) d += `L${n(x - w)} ${n(y)}`
    d += 'Z'
  }
  return `<path fill="${color}" d="${d}"/>`
}

// The real skyline of the Flatirons
function ridge(top, span, H, color, zoom) {
  const sky = TERRAIN.skyline
  const lo = Math.min(...sky)
  const hi = Math.max(...sky)
  let d = `M0 ${H}`
  for (let px = 0; px <= W + 8; px += 4) {
    const i = Math.min(sky.length - 1, Math.max(0, Math.round(((px / W - 0.5) / zoom + 0.5) * (sky.length - 1))))
    d += `L${px} ${n(top + ((sky[i] - lo) / (hi - lo)) * span)}`
  }
  return `<path fill="${color}" d="${d}L${W + 8} ${H}Z"/>`
}

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`

const PAGE = '#1E3826'
const H = 300
const F = 360
const files = {
  'edge.svg': svg(W, H, pines(190, H, '#47663F', 34, 100, 165) + pines(240, H, '#2F5233', 28, 120, 195) + pines(H - 1, H, PAGE, 22, 130, 215)),
  'foot.svg': svg(W, F, ridge(40, 170, F, '#2C4C32', 1.25) + pines(240, F, '#142A1C', 13, 24, 56) + grass(262, F, '#B9842F', 420, 14, 40, 4, 460, 2.2) + grass(298, F, '#CF9A3E', 620, 30, 84, 6, 330, 1.4) + grass(334, F, '#E9C677', 440, 22, 58, 4, 300, 0.2)),
}
for (const [name, body] of Object.entries(files)) {
  await writeFile(out + name, body)
  console.log(name, Math.round(body.length / 1024), 'KB')
}
