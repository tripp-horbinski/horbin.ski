// Chautauqua Meadow looking southwest at the Flatirons. Units are pixels of a
// 1200×800 reference frame, with the meadow's far edge near y=440. The mountain
// comes from USGS lidar (see scripts/meadow); the treeline, meadow and trail are
// drawn by hand. Everything is built once as Path2D and filled per frame with
// the current palette.

import type { FeatureId } from './features'
import { TERRAIN } from './terrain'
import type { Facet } from './terrain-types'

export type Pt = [number, number]

// Scene extends well past the photo so wide screens and parallax never run out
export const X0 = -900
export const X1 = 2100
export const HORIZON = 440
// Where the trail post stands; grass rooted in front of this line is drawn over it
export const POST_Y = 632
// Where Tripp stands, on the trail where it bends: his feet, with the grass in
// front of them drawn over him
export const RUNNER_SPOT: Pt = [1000, 642]

export function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function polyPath(pts: Pt[], into = new Path2D()) {
  into.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) into.lineTo(pts[i][0], pts[i][1])
  into.closePath()
  return into
}

function inPoly(pts: Pt[], x: number, y: number) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Sample a per-column lidar profile, held flat past the ends of the rendered frame
function profile(values: number[], x: number) {
  const k = Math.min(values.length - 1, Math.max(0, (x - TERRAIN.x0) / TERRAIN.step))
  const i = Math.min(values.length - 2, Math.floor(k))
  return lerp(values[i], values[i + 1], k - i)
}

const ridgeY = (x: number) => profile(TERRAIN.skyline, x)

// Where the grass at your feet begins, about 100 m out. A traced photo has no
// distances, so it gets a level meadow edge instead.
export const groundY = (x: number) => (TERRAIN.ground ? profile(TERRAIN.ground, x) : 446)
// Top of the open meadow, up the hills to where the woods begin
export const meadowTopY = (x: number) => (TERRAIN.meadow ? profile(TERRAIN.meadow, x) : groundY(x) - 6)

export interface FacetShape {
  kind: Facet['kind']
  path: Path2D
  n?: number[]
  tone?: number
  haze: number
}

export interface SlabShape {
  id: FeatureId
  path: Path2D
  top: Pt
}

export interface TreeBand {
  dark: Path2D
  lit: Path2D
}

// A broadleaf crown in three flat tones, like separate screens in a print
export interface Foliage {
  body: Path2D
  lit: Path2D
  shade: Path2D
  trunk: Path2D
}

const foliage = (): Foliage => ({ body: new Path2D(), lit: new Path2D(), shade: new Path2D(), trunk: new Path2D() })

// Trees between the meadow and the mountain: ponderosas with a left and right
// half to light, and broadleaf crowns
export interface Grove {
  dark: Path2D
  left: Path2D
  right: Path2D
  leaves: Foliage
}

// Shrubs out in the grass, by color: the yellowing box elder and its kin,
// darker green shrubs, and skunkbrush sumac turning rust in late summer
export type ShrubKind = 'yellow' | 'green' | 'sumac'

// Measured off the reference photo: kind, x, base y, crown width and height, trunk
const SHRUBS: [ShrubKind, number, number, number, number, number][] = [
  // The box elder catching the sun, right of center
  ['yellow', 789, 488, 64, 42, 6],
  // Two narrow, upright shrubs in the middle of the meadow
  ['yellow', 440, 488, 22, 31, 1],
  ['green', 528, 496, 17, 33, 1],
  // A small dark shrub at the foot of the rise on the right
  ['green', 768, 448, 15, 12, 0],
  // Low clumps of sumac, already turning
  ['sumac', 478, 490, 15, 12, 0],
  ['sumac', 553, 493, 9, 7, 0],
  ['sumac', 638, 492, 11, 8, 0],
  ['sumac', 412, 491, 8, 6, 0],
  // Past the edges of the photo, for wide screens
  ['green', -150, 474, 24, 15, 0],
  ['sumac', -60, 480, 14, 8, 0],
  ['yellow', 1430, 482, 40, 30, 5],
  ['sumac', 1330, 486, 12, 7, 0],
]

// Where a tree in front of the mountain stands, for casting its shadow
export interface WoodTree {
  x: number
  y: number
  h: number
  range: number
}

// A closed curve through the midpoints of a polygon's sides, rounding its corners
function smoothPath(pts: Pt[], into: Path2D) {
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const start = mid(pts[pts.length - 1], pts[0])
  into.moveTo(start[0], start[1])
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length])
    into.quadraticCurveTo(p[0], p[1], m[0], m[1])
  })
  into.closePath()
}

// A broadleaf crown: an irregular dome on a short trunk. Sunlit leaf clusters
// gather toward the upper left (the midday sun) and shaded pockets toward the
// lower right, drawn clipped to the crown. Rough crowns are twiggy, like sumac.
// Anything below floor is behind the ground in front and gets cut off.
function broadleaf(f: Foliage, x: number, y: number, w: number, h: number, trunk: number, r: () => number, floor = Infinity, rough = 0) {
  const clip = (v: number) => Math.min(v, floor)
  if (trunk > 0) {
    const tw = Math.max(0.8, w * 0.07)
    polyPath([[x - tw / 2, clip(y)], [x - tw * 0.3, y - trunk - h * 0.25], [x + tw * 0.3, y - trunk - h * 0.25], [x + tw / 2, clip(y)]], f.trunk)
  }
  const cx = x + (r() - 0.5) * w * 0.06
  const cy = y - trunk - h / 2
  const phase = r() * 6
  const phase2 = r() * 6
  // An irregular blob around (bx, by): lobes of leaves bulge out of the rim
  const blob = (into: Path2D, bx: number, by: number, rx: number, ry: number, n: number, bumps: number) => {
    const pts: Pt[] = []
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / n) * Math.PI * 2
      const k = 1 + bumps * (0.6 * Math.sin(i * 0.9 + phase) + Math.abs(Math.sin(i * 2.3 + phase2))) + (r() - 0.5) * (0.08 + rough)
      const s = Math.sin(a)
      pts.push([bx + Math.cos(a) * rx * k, clip(by + s * ry * k * (s > 0 ? 0.85 : 1))])
    }
    smoothPath(pts, into)
  }
  blob(f.body, cx, cy, w / 2, h / 2, 40, 0.08)

  // Dappled light over most of the crown and small shaded pockets low down,
  // more of both on bigger crowns
  const clusters = Math.min(16, Math.max(2, Math.round((w * h) / 140)))
  const size = Math.min(w, h) * 0.2
  const dapple = (into: Path2D, count: number, scale: number, where: (dx: number, dy: number) => boolean) => {
    let made = 0
    for (let tries = 0; tries < count * 10 && made < count; tries++) {
      const dx = r() * 2 - 1
      const dy = r() * 2 - 1
      if (dx * dx + dy * dy > 1 || !where(dx, dy)) continue
      const rad = size * scale * (0.6 + r() * 0.7)
      blob(into, cx + dx * w * 0.45, cy + dy * h * 0.42, rad, rad * 0.8, 10, 0.12)
      made++
    }
  }
  dapple(f.shade, Math.max(1, Math.round(clusters * 0.7)), 0.55, (dx, dy) => dy * 0.9 + dx * 0.3 > 0.25)
  dapple(f.lit, Math.round(clusters * 1.4), 0.85, (dx, dy) => dy * 0.9 + dx * 0.35 < 0.35)
}

// A ponderosa: a clumpy crown, widest a third of the way up and tapering to a
// rounded point, on a bare trunk. Each half of the crown is kept separately so
// the side facing the sun can be lit. Anything below floor is behind the
// ground in front and gets cut off.
function ponderosa(g: Grove, x: number, y: number, h: number, floor: number, r: () => number) {
  const clip = (v: number) => Math.min(v, floor)
  const tw = Math.max(0.5, h * 0.05)
  const bottom = y - h * (0.2 + r() * 0.1)
  if (bottom < floor) {
    polyPath([[x - tw / 2, clip(y)], [x - tw * 0.35, bottom], [x + tw * 0.35, bottom], [x + tw / 2, clip(y)]], g.dark)
  }
  const top = y - h
  const half = h * (0.17 + r() * 0.06)
  const lean = (r() - 0.5) * h * 0.04
  const levels = 7
  const side = (dir: number) =>
    Array.from({ length: levels }, (_, i) => {
      const t = (i + 0.5) / levels
      // Clumps of branches stick out at alternating heights on each side
      const clump = (i + (dir > 0 ? 0 : 1)) % 2 ? 0.78 : 1.06
      const w = half * Math.pow(1 - t, 0.55) * Math.sin(Math.min(1, t * 2.6) * (Math.PI / 2)) * clump * (0.9 + r() * 0.2)
      return [x + lean * t + dir * w, clip(bottom + (top - bottom) * t)] as Pt
    })
  const right = side(1)
  const left = side(-1)
  const tip: Pt = [x + lean, top]
  const foot: Pt = [x, clip(bottom)]
  polyPath([foot, ...right, tip, ...left.reverse()], g.dark)
  polyPath([foot, ...right, tip], g.right)
  polyPath([foot, ...left, tip], g.left)
}

function spike(into: Path2D, x: number, y: number, h: number) {
  const w = h * 0.3
  into.moveTo(x - w, y)
  into.lineTo(x, y - h)
  into.lineTo(x + w, y)
  into.closePath()
}

// Polygon around a centerline given as [x, y, width] samples
function ribbon(c: [number, number, number][]): Pt[] {
  const left: Pt[] = []
  const right: Pt[] = []
  c.forEach(([x, y, w], i) => {
    const [ax, ay] = c[Math.max(0, i - 1)]
    const [bx, by] = c[Math.min(c.length - 1, i + 1)]
    const len = Math.hypot(bx - ax, by - ay) || 1
    const nx = -(by - ay) / len
    const ny = (bx - ax) / len
    left.push([x + (nx * w) / 2, y + (ny * w) / 2])
    right.push([x - (nx * w) / 2, y - (ny * w) / 2])
  })
  return [...left, ...right.reverse()]
}

const TRAIL_MAIN: [number, number, number][] = [
  [986, 507, 2], [979, 526, 5], [968, 550, 10], [955, 576, 15], [943, 600, 21], [945, 620, 26],
  [975, 636, 31], [1040, 652, 37], [1110, 672, 44], [1180, 697, 51], [1260, 725, 58], [1400, 775, 68],
  [1560, 832, 80],
]
const TRAIL_SPUR: [number, number, number][] = [
  [984, 617, 5], [1040, 606, 7], [1110, 598, 8], [1200, 594, 9], [1300, 592, 10], [1500, 590, 11],
]
const widen = (c: [number, number, number][], d: number) => c.map(([x, y, w]) => [x, y, w + d] as [number, number, number])

const TRAIL_POLYS = [ribbon(TRAIL_MAIN), ribbon(TRAIL_SPUR)]
// The strip either side of the trail where the grass is trampled short
const TRAIL_EDGES = [ribbon(widen(TRAIL_MAIN, 26)), ribbon(widen(TRAIL_SPUR, 22))]
export const inTrail = (x: number, y: number) => TRAIL_POLYS.some((p) => inPoly(p, x, y))
export const nearTrail = (x: number, y: number) => TRAIL_EDGES.some((p) => inPoly(p, x, y))

export interface Scene {
  mountain: Path2D
  ridge: Path2D
  facets: FacetShape[]
  slabs: SlabShape[]
  // Trees on the mountain, by the forest group they stand in
  trees: TreeBand[]
  // Farthest first, so nearer groves draw over them
  woods: Grove[]
  woodTrees: WoodTree[]
  woodHit: Path2D
  hillHit: Path2D
  meadowFar: Path2D
  meadowMid: Path2D
  meadowNear: Path2D
  verge: Path2D
  trail: Path2D
  trailHit: Path2D
  stones: Path2D
  shrubs: Record<ShrubKind, Foliage>
  postHit: Path2D
}

export function buildScene(): Scene {
  const r = rng(41)

  const skyPts: Pt[] = []
  for (let x = X0; x <= X1; x += TERRAIN.step) skyPts.push([x, ridgeY(x)])
  const mountain = polyPath([...skyPts, [X1, 560], [X0, 560]])
  const ridge = new Path2D()
  skyPts.forEach(([x, y], i) => (i ? ridge.lineTo(x, y) : ridge.moveTo(x, y)))

  const facets = TERRAIN.facets.map(({ d, ...f }) => ({ ...f, path: new Path2D(d) }))
  const slabs = TERRAIN.slabs.map((sl) => ({ id: sl.id, path: new Path2D(sl.d), top: [sl.top[0], sl.top[1]] as Pt }))

  // Pines from the lidar render, sized for their distance; about a third in shadow
  const trees: TreeBand[] = TERRAIN.groups.map(() => ({ dark: new Path2D(), lit: new Path2D() }))
  for (let i = 0; i < TERRAIN.trees.length; i += 4) {
    const [x, y, h, g] = TERRAIN.trees.slice(i, i + 4)
    const band = trees[g]
    if (band) spike(r() < 0.35 ? band.dark : band.lit, x + (r() - 0.5), y + 1, h)
  }

  const woodHit = new Path2D()
  const hillHit = new Path2D()
  facets.forEach((f) => {
    if (f.kind === 'wood') woodHit.addPath(f.path)
    if (f.kind === 'hill') hillHit.addPath(f.path)
  })

  // Every tree the imagery shows on the hills and along the foot of the
  // mountain, in groups of a hundred or so from far to near
  const packed = TERRAIN.woods ?? []
  const woods: Grove[] = []
  const woodTrees: WoodTree[] = []
  for (let i = 0; i < packed.length; i += 6) {
    if (i % 600 === 0) woods.push({ dark: new Path2D(), left: new Path2D(), right: new Path2D(), leaves: foliage() })
    const grove = woods[woods.length - 1]
    const [x, y, h, leafy, range, hidden] = packed.slice(i, i + 6)
    if (leafy) {
      // The broadleaf trees along the forest edge are lower and broader than the pines
      broadleaf(grove.leaves, x, y, h * 0.62, h * 0.42, h * 0.1, r, y - hidden)
    } else {
      ponderosa(grove, x, y, h, y - hidden, r)
    }
    // Shadows only for trees standing in plain view
    if (!hidden) woodTrees.push({ x, y, h, range })
  }
  // Pointing at a crown counts as pointing at the pines, not the mountain behind
  for (const grove of woods) {
    woodHit.addPath(grove.dark)
    woodHit.addPath(grove.leaves.body)
  }

  // Meadow in flat bands, paler and sunnier toward the trees
  const band = (top: (x: number) => number) =>
    polyPath([
      ...Array.from({ length: 301 }, (_, i) => {
        const x = lerp(X0, X1, i / 300)
        return [x, top(x)] as Pt
      }),
      [X1, 4000], [X0, 4000],
    ])
  const meadowFar = band((x) => groundY(x) - 1)
  const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2))
  // Nearer bands follow the lidar's lines of equal distance, so they rise and
  // dip with the meadow; a traced photo falls back to gentle waves
  const [mid, near] = TERRAIN.bands ?? []
  const meadowMid = band((x) => (mid ? profile(mid, x) : 506 + 9 * Math.sin(x / 150) + 5 * Math.sin(x / 53 + 1) + 30 * bump(x, 1060, 160)))
  const meadowNear = band((x) => (near ? profile(near, x) : 600 + 12 * Math.sin(x / 130 + 2) + 6 * Math.sin(x / 41)))

  const verge = new Path2D()
  polyPath(ribbon(widen(TRAIL_MAIN, 24)), verge)
  polyPath(ribbon(widen(TRAIL_SPUR, 18)), verge)
  const trail = new Path2D()
  TRAIL_POLYS.forEach((p) => polyPath(p, trail))
  const trailHit = new Path2D()
  polyPath(ribbon(widen(TRAIL_MAIN, 30)), trailHit)
  polyPath(ribbon(widen(TRAIL_SPUR, 24)), trailHit)
  const stones = new Path2D()
  stones.ellipse(966, 604, 7, 4.5, -0.1, 0, Math.PI * 2)
  stones.moveTo(1061, 650)
  stones.ellipse(1056, 650, 4, 2.5, 0, 0, Math.PI * 2)
  // A boulder out in the grass, left of the box elder
  stones.moveTo(724, 490)
  stones.ellipse(713, 490, 11, 4, -0.05, 0, Math.PI * 2)

  const shrubs: Record<ShrubKind, Foliage> = { yellow: foliage(), green: foliage(), sumac: foliage() }
  for (const [kind, x, y, w, h, trunk] of SHRUBS) broadleaf(shrubs[kind], x, y, w, h, trunk, r, Infinity, kind === 'sumac' ? 0.5 : 0)

  const postHit = new Path2D()
  postHit.rect(84, 508, 38, 160)

  return {
    mountain, ridge, facets, slabs, trees, woods, woodTrees, woodHit, hillHit, meadowFar, meadowMid,
    meadowNear, verge, trail, trailHit, stones, shrubs, postHit,
  }
}
