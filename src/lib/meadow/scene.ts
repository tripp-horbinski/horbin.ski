// Chautauqua Meadow, traced from a late-summer photograph looking southwest at
// the Flatirons. Units are pixels of the 1200×800 photo, with the meadow's far
// edge near y=440. Everything is built once as Path2D and filled per frame with
// the current palette.

import type { FeatureId } from './features'

export type Pt = [number, number]

// Scene extends well past the photo so wide screens and parallax never run out
export const X0 = -900
export const X1 = 2100
export const HORIZON = 440
// Base of the hikers' feet; grass in front of this line is drawn over them
export const FIGURES_Y = 632

export function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

function piecewise(pts: Pt[], x: number) {
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]))
  }
  return pts[pts.length - 1][1]
}

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

// Green Mountain's skyline, right of the photo continuing toward Flagstaff
const RIDGE: Pt[] = [
  [-900, 372], [-700, 366], [-500, 362], [-300, 357], [-120, 351], [0, 347], [90, 344], [170, 340],
  [195, 330], [230, 312], [265, 293], [290, 286], [320, 280], [355, 268], [380, 260], [410, 248],
  [435, 240], [470, 234], [510, 231], [545, 234], [585, 240], [615, 238], [645, 233], [672, 226],
  [700, 222], [720, 224], [745, 228], [780, 236], [830, 254], [880, 266], [930, 272], [980, 276],
  [1030, 274], [1050, 270], [1065, 274], [1090, 277], [1110, 275], [1130, 280], [1150, 284], [1170, 296],
  [1200, 310], [1260, 318], [1330, 312], [1420, 300], [1520, 296], [1620, 310], [1740, 330], [1860, 322],
  [2000, 340], [2100, 350],
]
const ridgeY = (x: number) => piecewise(RIDGE, x)

// Hazy foothills further south, only seen where the ridge drops away on the left
const FAR: Pt[] = [[-900, 330], [-700, 318], [-480, 328], [-260, 314], [-60, 324], [80, 316], [190, 326], [320, 352]]

const MEADOW_EDGE: Pt[] = [
  [-900, 446], [0, 442], [300, 444], [600, 442], [800, 436], [880, 421], [1000, 416], [1100, 424],
  [1200, 438], [1400, 446], [2100, 446],
]
const meadowEdge = (x: number) => piecewise(MEADOW_EDGE, x)

const FOREST_TOP: Pt[] = [
  [-900, 388], [0, 380], [150, 382], [300, 372], [450, 366], [620, 354], [800, 372], [950, 380],
  [1200, 392], [2100, 392],
]
const forestTop = (x: number) => piecewise(FOREST_TOP, x)

interface SlabDef {
  id: FeatureId | null
  tip: number
  pts: Pt[]
}

// Outlines run from the bottom-left, up the long face to the tip, then down the steep north side
const SLAB_DEFS: SlabDef[] = [
  { id: 'fifth', tip: 2, pts: [[214, 362], [250, 322], [292, 284], [301, 293], [285, 320], [266, 348], [262, 362]] },
  { id: 'fourth', tip: 2, pts: [[268, 358], [300, 322], [346, 278], [357, 288], [345, 312], [322, 340], [318, 356]] },
  { id: 'third', tip: 3, pts: [[334, 370], [370, 330], [420, 282], [456, 250], [463, 262], [461, 300], [440, 330], [410, 362], [400, 370]] },
  { id: 'second', tip: 3, pts: [[466, 356], [500, 318], [560, 262], [597, 238], [606, 250], [598, 268], [580, 296], [552, 330], [530, 352]] },
  { id: 'first', tip: 4, pts: [[626, 340], [622, 316], [638, 272], [668, 226], [692, 194], [712, 208], [741, 234], [738, 256], [721, 282], [700, 306], [676, 336]] },
  { id: null, tip: 2, pts: [[318, 380], [330, 354], [338, 347], [347, 360], [343, 380]] },
  { id: null, tip: 2, pts: [[490, 278], [500, 264], [512, 258], [522, 266], [518, 280]] },
  // The rock tower standing out of the trees on the right
  { id: null, tip: 3, pts: [[1132, 404], [1136, 374], [1141, 352], [1149, 337], [1157, 344], [1161, 362], [1173, 378], [1183, 404]] },
]

const TALUS: Pt[] = [
  [652, 342], [672, 322], [700, 312], [716, 300], [745, 298], [770, 310], [790, 306], [818, 326],
  [842, 334], [866, 356], [884, 374], [852, 380], [818, 372], [790, 380], [748, 368], [716, 372],
  [690, 360],
]

// Knobby outcrops along the right shoulder and scattered down its face
const BOULDERS: [number, number, number][] = [
  [1052, 271, 5], [1098, 280, 6], [1112, 276, 8], [1128, 282, 9], [1146, 287, 7], [1159, 293, 5],
  [902, 305, 5], [918, 308, 7], [958, 301, 6], [978, 310, 5], [1004, 301, 4], [1190, 410, 6],
]

export interface SlabShape {
  id: FeatureId | null
  path: Path2D
  shade: Path2D
  hi: Path2D
  lines: Path2D
  streaks: Path2D
  flecks: Path2D
}

export interface TreeBand {
  dark: Path2D
  lit: Path2D
}

// A conifer as a stack of jagged tiers; the lit path is its sunward (left) half
function conifer(band: TreeBand, x: number, y: number, h: number, r: () => number, tiers = 4) {
  const w = h * (0.24 + r() * 0.1)
  const right: Pt[] = []
  const left: Pt[] = []
  for (let i = 1; i <= tiers; i++) {
    const ty = y - h + h * (i / tiers) * 0.9
    const tw = w * (0.3 + 0.7 * (i / tiers)) * (0.85 + r() * 0.3)
    const notch = h * 0.05
    right.push([x + tw, ty], [x + tw * 0.5, ty - notch])
    left.push([x - tw * (0.9 + r() * 0.2), ty + r() * notch], [x - tw * 0.5, ty - notch])
  }
  right.pop()
  left.pop()
  const tip: Pt = [x + (r() - 0.5) * h * 0.05, y - h]
  const outline: Pt[] = [tip, ...right, [x + w * 0.12, y], [x - w * 0.12, y], ...left.reverse()]
  polyPath(outline, band.dark)
  polyPath([tip, [x, y - h * 0.1], [x - w * 0.12, y], ...left], band.lit)
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
  far: Path2D
  mountain: Path2D
  ridge: Path2D
  land: Path2D
  talus: Path2D
  talusTrees: Path2D
  stippleDark: Path2D
  stippleLit: Path2D
  boulders: Path2D
  boulderShade: Path2D
  slabs: SlabShape[]
  skirt: TreeBand
  forestFill: Path2D
  forest: TreeBand[]
  forestHit: Path2D
  meadowFar: Path2D
  meadowMid: Path2D
  meadowNear: Path2D
  swath: Path2D
  verge: Path2D
  trail: Path2D
  trailHit: Path2D
  stones: Path2D
  lone: TreeBand
  bushes: Path2D
  bushShade: Path2D
  bushBright: Path2D
  postHit: Path2D
}

function slabShape(def: SlabDef, r: () => number): SlabShape {
  const { pts, tip: ti } = def
  const tip = pts[ti]
  const bl = pts[0]
  const br = pts[pts.length - 1]
  const path = polyPath(pts)

  // North face in shade: the steep right side plus a wedge back to the base
  const shade = polyPath([...pts.slice(ti), lerpPt(br, bl, 0.34), lerpPt(tip, lerpPt(br, bl, 0.34), 0.08)])

  // Sunlit rim along the long face, tapering to nothing at the tip
  const span = Math.hypot(br[0] - bl[0], br[1] - bl[1])
  const inward: Pt = [((br[0] - bl[0]) / span) * Math.min(6, span * 0.14), ((br[1] - bl[1]) / span) * Math.min(6, span * 0.14)]
  const leftSide = pts.slice(0, ti + 1)
  const inner = leftSide.map(([x, y], i) => {
    const k = Math.sqrt(1 - i / ti)
    return [x + inward[0] * k, y + inward[1] * k] as Pt
  })
  const hi = polyPath([...leftSide, ...inner.reverse()])

  // Bedding planes run up the face; a few cross joints break them up
  const lines = new Path2D()
  const rightSide = pts.slice(ti)
  const onRight = (u: number) => rightSide[Math.min(rightSide.length - 1, Math.round(u * (rightSide.length - 1)))]
  for (const t of [0.2, 0.4, 0.58, 0.76]) {
    const a = lerpPt(lerpPt(bl, br, t), tip, 0.06)
    const b = lerpPt(tip, onRight(0.4), t)
    const m = lerpPt(a, b, 0.5)
    lines.moveTo(a[0], a[1])
    lines.quadraticCurveTo(m[0] + (r() - 0.5) * 3, m[1] + (r() - 0.5) * 3, b[0], b[1])
  }
  for (let i = 0; i < 5; i++) {
    const u = 0.25 + r() * 0.6
    const a = lerpPt(lerpPt(bl, tip, u), lerpPt(br, onRight(0.5), u), 0.1 + r() * 0.3)
    const b = lerpPt(lerpPt(bl, tip, u), lerpPt(br, onRight(0.5), u), 0.45 + r() * 0.4)
    lines.moveTo(a[0], a[1])
    lines.lineTo(b[0], b[1] + 2)
  }

  // Darker water streaks running down the dip of the face
  const streaks = new Path2D()
  for (let i = 0; i < 3; i++) {
    const t = 0.15 + r() * 0.6
    const w = 0.02 + r() * 0.035
    const a0 = lerpPt(bl, br, t)
    const a1 = lerpPt(bl, br, t + w)
    const len = 0.45 + r() * 0.45
    const b0 = lerpPt(a0, lerpPt(tip, onRight(0.4), t), len)
    const b1 = lerpPt(a1, lerpPt(tip, onRight(0.4), t + w), len * 0.92)
    polyPath([a0, b0, b1, a1], streaks)
  }

  // Lichen and weathering flecks on the lit face
  const flecks = new Path2D()
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  for (let i = 0; i < 70; i++) {
    const x = lerp(Math.min(...xs), Math.max(...xs), r())
    const y = lerp(Math.min(...ys), Math.max(...ys), r())
    if (!inPoly(pts, x, y)) continue
    const rr = 0.4 + r() * 0.9
    flecks.moveTo(x + rr, y)
    flecks.arc(x, y, rr, 0, Math.PI * 2)
  }

  return { id: def.id, path, shade, hi, lines, streaks, flecks }
}

export function buildScene(): Scene {
  const r = rng(41)

  const far = polyPath([...FAR, [320, 460], [X0, 460]])

  // Ridge with a fringe of tiny trees along the skyline
  const ridgePts: Pt[] = []
  for (let x = X0; x <= X1; x += 3) {
    const y = ridgeY(x)
    const forested = x > 160 && x < 1300
    ridgePts.push([x, y + 0.5], [x + 1.5, y - (r() < 0.6 ? 1 + r() * (forested ? 4.5 : 2) : 0.5)])
  }
  const mountain = polyPath([...ridgePts, [X1, 470], [X0, 470]])
  const land = polyPath([...ridgePts, [X1, 4000], [X0, 4000]])
  const ridge = new Path2D()
  ridgePts.forEach(([x, y], i) => (i ? ridge.lineTo(x, y) : ridge.moveTo(x, y)))

  const slabDefs = SLAB_DEFS
  const inSlab = (x: number, y: number) => slabDefs.some((d) => inPoly(d.pts, x, y))

  // Forest stippling the mountain's flanks, thinner over the talus
  const stippleDark = new Path2D()
  const stippleLit = new Path2D()
  for (let i = 0; i < 4600; i++) {
    const x = lerp(X0, X1, r())
    const top = ridgeY(x) + 2
    const y = lerp(top, 392, Math.pow(r(), 0.8))
    if (y < top || inSlab(x, y)) continue
    if (inPoly(TALUS, x, y) && r() < 0.55) continue
    const h = 3 + r() * 3.5 + (y - top) * 0.025
    spike(r() < 0.6 ? stippleDark : stippleLit, x, y, h)
  }

  // Blocky boulders and scrub mottling the talus
  const talusTrees = new Path2D()
  for (let i = 0; i < 160; i++) {
    const x = lerp(650, 890, r())
    const y = lerp(296, 384, r())
    if (!inPoly(TALUS, x, y)) continue
    if (r() < 0.5) spike(talusTrees, x, y, 3 + r() * 4)
    else talusTrees.rect(x, y, 1.5 + r() * 2.5, 1 + r() * 1.5)
  }

  // Angular outcrops, with their north faces in shade
  const boulders = new Path2D()
  const boulderShade = new Path2D()
  for (const [x, y, rad] of BOULDERS) {
    const pts: Pt[] = Array.from({ length: 6 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2 + (r() - 0.5) * 0.5
      const k = rad * (0.75 + r() * 0.4)
      return [x + Math.cos(a) * k, Math.min(y + rad * 0.45, y + Math.sin(a) * k)]
    })
    polyPath(pts, boulders)
    polyPath([pts[0], pts[1], pts[2], pts[3], [x + rad * 0.1, y]], boulderShade)
  }

  const slabs = slabDefs.map((d) => slabShape(d, r))

  // Trees closing in around the slab bases, still on the mountain layer
  const skirt: TreeBand = { dark: new Path2D(), lit: new Path2D() }
  for (let i = 0; i < 520; i++) {
    const x = lerp(160, 1250, r())
    const y = lerp(330, 384, r())
    if (y < ridgeY(x) + 30) continue
    if (inSlab(x, y - 6) && r() < 0.7) continue
    conifer(skirt, x, y, 7 + r() * 7, r, 3)
  }

  // The dense lower forest down to the meadow, back rows first
  const forestFill = polyPath([
    ...Array.from({ length: 151 }, (_, i) => {
      const x = lerp(X0, X1, i / 150)
      return [x, forestTop(x) + 16] as Pt
    }),
    ...Array.from({ length: 151 }, (_, i) => {
      const x = lerp(X1, X0, i / 150)
      return [x, meadowEdge(x) + 3] as Pt
    }),
  ])
  const trees: [number, number, number, number][] = []
  for (let i = 0; i < 2200; i++) {
    const x = lerp(X0, X1, r())
    const top = forestTop(x)
    const y = lerp(top + 8, meadowEdge(x) + 2, r())
    trees.push([x, y, (9 + (y - 350) * 0.28) * (0.75 + r() * 0.5), 4])
  }
  // Tall ponderosas framing the left edge of the meadow
  for (const [x, h] of [
    [-260, 96], [-215, 84], [-170, 102], [-120, 90], [-70, 110], [-30, 98], [10, 106], [45, 92],
    [80, 84], [118, 70], [152, 66], [186, 56], [228, 48], [262, 52], [300, 44], [-520, 80],
    [-470, 92], [-420, 76], [-370, 88], [-320, 82], [-640, 86], [-590, 74], [-760, 90], [-700, 80],
  ]) {
    trees.push([x + (r() - 0.5) * 8, meadowEdge(x) + 1 + r() * 3, h, 6])
  }
  trees.sort((a, b) => a[1] - b[1])
  const forest: TreeBand[] = []
  const BANDS = 6
  for (let b = 0; b < BANDS; b++) forest.push({ dark: new Path2D(), lit: new Path2D() })
  trees.forEach(([x, y, h, tiers], i) => conifer(forest[Math.floor((i / trees.length) * BANDS)], x, y, h, r, tiers))
  const forestHit = polyPath([
    [X0, 340], [270, 340], [300, 368], [450, 364], [620, 352], [800, 370], [950, 378], [1200, 390], [X1, 390],
    [X1, 446], [X0, 446],
  ])

  // Meadow in flat bands, paler and sunnier toward the trees
  const band = (top: (x: number) => number) =>
    polyPath([
      ...Array.from({ length: 301 }, (_, i) => {
        const x = lerp(X0, X1, i / 300)
        return [x, top(x)] as Pt
      }),
      [X1, 4000], [X0, 4000],
    ])
  const meadowFar = band((x) => meadowEdge(x) - 1)
  const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2))
  const meadowMid = band((x) => 506 + 9 * Math.sin(x / 150) + 5 * Math.sin(x / 53 + 1) + 30 * bump(x, 1060, 160))
  const meadowNear = band((x) => 600 + 12 * Math.sin(x / 130 + 2) + 6 * Math.sin(x / 41))
  const swath = polyPath([
    [470, 512], [560, 498], [680, 502], [800, 496], [900, 508], [930, 540], [860, 560], [720, 548],
    [600, 556], [500, 540],
  ])

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

  // Lone pines and shrubs scattered out in the grass
  const lone: TreeBand = { dark: new Path2D(), lit: new Path2D() }
  for (const [x, y, h] of [
    [100, 430, 38], [132, 434, 44], [707, 440, 26], [880, 420, 22], [1045, 432, 30], [1110, 446, 24],
    [1185, 452, 20], [-260, 452, 30], [-520, 456, 26], [1500, 452, 28], [1700, 450, 34],
  ]) {
    conifer(lone, x, y, h, r, 5)
  }
  const bushes = new Path2D()
  const bushShade = new Path2D()
  const bushBright = new Path2D()
  const shrub = (into: Path2D, x: number, y: number, rad: number) => {
    for (const [dx, dy, k] of [[0, -0.6, 0.75], [-0.55, -0.35, 0.6], [0.55, -0.4, 0.62], [0, -1.05, 0.5]]) {
      into.moveTo(x + dx * rad + k * rad, y + dy * rad)
      into.arc(x + dx * rad, y + dy * rad, k * rad, 0, Math.PI * 2)
    }
  }
  for (const [x, y, rad] of [[437, 476, 11], [527, 482, 7], [766, 448, 5], [300, 478, 5], [620, 472, 4], [-140, 470, 9]]) {
    shrub(bushes, x, y, rad)
    shrub(bushShade, x + rad * 0.25, y + rad * 0.12, rad * 0.7)
  }
  // The bright green shrub catching the sun, center right
  shrub(bushBright, 790, 470, 22)
  shrub(bushShade, 796, 473, 15)

  const postHit = new Path2D()
  postHit.rect(84, 508, 38, 160)

  return {
    far, mountain, ridge, land, talus: polyPath(TALUS), talusTrees, stippleDark, stippleLit, boulders, boulderShade,
    slabs, skirt, forestFill, forest, forestHit, meadowFar, meadowMid, meadowNear, swath, verge, trail,
    trailHit, stones, lone, bushes, bushShade, bushBright, postHit,
  }
}

// Little climbers' headlamps creeping up the slabs after dark
export const HEADLAMP_ROUTES: [Pt, Pt][] = [
  [[372, 346], [452, 258]],
  [[392, 350], [455, 266]],
  [[646, 318], [690, 204]],
]
