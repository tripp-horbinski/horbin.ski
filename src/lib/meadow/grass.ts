// Late-summer grass: a few thousand tapered blades with seed heads, bent by
// rolling gusts and parted by the pointer. Blades live in photo units but are
// drawn in screen space so every row gets its own parallax.

import { FIGURES_Y, HORIZON, inTrail, nearTrail, rng } from './scene'
import type { Palette } from './palette'

const TABLE = (() => {
  const r = rng(99)
  return Array.from({ length: 256 }, () => r())
})()

// Smooth 1D value noise in [0, 1]
export function noise(x: number) {
  const i = Math.floor(x)
  const f = x - i
  const t = f * f * (3 - 2 * f)
  const a = TABLE[i & 255]
  return a + (TABLE[(i + 1) & 255] - a) * t
}

// Overall gustiness, shared with the clouds and the wind sound
export const gustiness = (t: number) => 0.3 + 0.7 * noise(t * 0.07 + 17)

interface Blade {
  x: number
  y: number
  h: number
  w: number
  lean: number
  tone: number
  head: number
  phase: number
  push: number
  vel: number
}

export interface Pointer {
  x: number
  y: number
  vx: number
  active: boolean
}

type Project = (x: number, y: number) => [number, number]

const SLICES_BACK = 4
const SLICES_FRONT = 3

export class Grass {
  private blades: Blade[] = []
  private split = 0

  generate(x0: number, x1: number, y1: number, count: number) {
    const r = rng(7)
    const blades: Blade[] = []
    let guard = 0
    while (blades.length < count && guard++ < count * 3) {
      const x = x0 + (x1 - x0) * r()
      const y = HORIZON + 14 + (y1 - HORIZON - 14) * r()
      if (inTrail(x, y)) continue
      const t = (y - HORIZON) / 300
      // Grass along the trail is trampled short and stays greener
      const edge = nearTrail(x, y)
      const verge = edge && r() < 0.55
      blades.push({
        x,
        y,
        h: (2 + 70 * t) * (0.6 + 0.75 * r()) * (edge ? 0.35 : 1),
        w: (0.5 + 3.4 * t) * (0.7 + 0.6 * r()),
        lean: (r() - 0.5) * 0.5,
        tone: verge ? 3 : r() < 0.3 ? 0 : r() < 0.64 ? 1 : 2,
        head: t > 0.12 && r() < 0.42 ? 0.16 + r() * 0.1 : 0,
        phase: r() * Math.PI * 2,
        push: 0,
        vel: 0,
      })
    }
    blades.sort((a, b) => a.y - b.y)
    this.blades = blades
    this.split = blades.findIndex((b) => b.y >= FIGURES_Y)
    if (this.split < 0) this.split = blades.length
  }

  // Ripple outward from a tap, as if something just jumped out of the grass
  burst(px: number, py: number, project: Project, s: number) {
    for (const b of this.blades) {
      const [sx, sy] = project(b.x, b.y)
      const d = Math.hypot(sx - px, (sy - py) * 1.6)
      const reach = 130 * s
      if (d < reach) b.vel += Math.sign(sx - px || 1) * 0.3 * (1 - d / reach)
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    pal: Palette,
    project: Project,
    s: number,
    t: number,
    wind: number,
    pointer: Pointer,
    between: () => void,
  ) {
    const colors = [pal.grassDark, pal.grassMid, pal.grassLit, pal.verge]
    const gust = gustiness(t) * wind
    const reach = 70 * Math.max(0.6, s)
    const drawRange = (from: number, to: number) => {
      const paths = colors.map(() => new Path2D())
      const heads = new Path2D()
      for (let i = from; i < to; i++) {
        const b = this.blades[i]
        const [sx, sy] = project(b.x, b.y)
        const hp = b.h * s
        if (hp < 1.2) continue

        // Gust waves roll across the meadow left to right
        const g = noise(b.x * 0.0042 + b.y * 0.0016 - t * 0.34) * 0.7 + noise(b.x * 0.011 - t * 0.9 + 50) * 0.3
        let angle = b.lean + wind * (0.05 + 0.55 * gust * g * g + 0.035 * Math.sin(t * (1.6 + b.phase * 0.15) + b.phase) * (0.5 + gust))

        // Pointer parts the grass around it, then the blades spring back
        let target = 0
        if (pointer.active) {
          const dx = sx - pointer.x
          if (Math.abs(dx) < reach && pointer.y > sy - hp - 12 && pointer.y < sy + 24) {
            const f = 1 - Math.abs(dx) / reach
            target = Math.sign(dx || 1) * f * f * 1.1 + pointer.vx * 0.0025 * f
          }
        }
        b.vel += (target - b.push) * 0.12
        b.vel *= 0.8
        b.push += b.vel
        angle += b.push

        const sin = Math.sin(angle)
        const cos = Math.cos(angle)
        const tx = sx + sin * hp
        const ty = sy - cos * hp
        const ca = angle * 0.42
        const cx = sx + Math.sin(ca) * hp * 0.55
        const cy = sy - Math.cos(ca) * hp * 0.55
        const wp = Math.max(0.7, b.w * s)

        // Blades flash their paler side as a gust bends them over
        const tone = b.tone < 2 && g * gust > 0.42 ? b.tone + 1 : b.tone
        // Fill closes each blade on its own; an explicit closePath here is costly
        const p = paths[tone]
        p.moveTo(sx - wp / 2, sy)
        p.quadraticCurveTo(cx - wp * 0.25, cy, tx, ty)
        p.quadraticCurveTo(cx + wp * 0.25, cy, sx + wp / 2, sy)

        // Seed head as a lens along the end of the stem
        if (b.head) {
          const len = hp * b.head
          const dx = tx - cx
          const dy = ty - cy
          const d = Math.hypot(dx, dy) || 1
          const ux = dx / d
          const uy = dy / d
          const ry = Math.max(0.6, wp * 0.55) * 2
          const bx = tx - ux * len
          const by = ty - uy * len
          const mx = tx - ux * len * 0.45
          const my = ty - uy * len * 0.45
          heads.moveTo(bx, by)
          heads.quadraticCurveTo(mx - uy * ry, my + ux * ry, tx + ux * len * 0.08, ty + uy * len * 0.08)
          heads.quadraticCurveTo(mx + uy * ry, my - ux * ry, bx, by)
        }
      }
      paths.forEach((p, k) => {
        ctx.fillStyle = colors[k]
        ctx.fill(p)
      })
      ctx.fillStyle = pal.seed
      ctx.fill(heads)
    }

    const n = this.blades.length
    for (let k = 0; k < SLICES_BACK; k++) {
      drawRange(Math.floor((this.split * k) / SLICES_BACK), Math.floor((this.split * (k + 1)) / SLICES_BACK))
    }
    between()
    for (let k = 0; k < SLICES_FRONT; k++) {
      const span = n - this.split
      drawRange(this.split + Math.floor((span * k) / SLICES_FRONT), this.split + Math.floor((span * (k + 1)) / SLICES_FRONT))
    }
  }
}
