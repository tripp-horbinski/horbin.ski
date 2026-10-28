// Renders Green Mountain from Chautauqua Meadow out of USGS lidar and NAIP
// imagery, and writes src/lib/meadow/terrain.ts: the skyline, rock and forest
// as flat print areas grouped by which way they face (so the browser can light
// them for any hour), the rolling meadow hills and woods in front of the
// mountain, and trees sized for their distance.
//
//   node scripts/meadow/fetch.mjs     # once, downloads the rasters
//   node scripts/meadow/render.mjs [--preview]

import proj4 from 'proj4'
import sharp from 'sharp'
import { getPosition } from 'suncalc'
import { CACHE, CAMERA, DAY, FRAME, UTC_OFFSET, UTM } from './config.mjs'
import { emitModule } from './emit.mjs'
import { horizonProfile, loadTerrain, makeCamera, renderFrame } from './terrain.mjs'
import { rng } from './random.mjs'

const SCALE = 2
const Y1 = 800
const HAZE = [[2800, 0], [7000, 0.25], [Infinity, 0.5]]
const K_LAND = 5
const K_ROCK = 4
// The mountain is everything past NEAR. Between GROUND and NEAR are the meadow
// hills and woods; closer than GROUND is the grass you're standing in.
const NEAR = 900
const GROUND = 100
const WOODS = 220

const terrain = await loadTerrain()
const cam = makeCamera(terrain, CAMERA)
const frame = renderFrame(terrain, cam, { x0: FRAME.x0, x1: FRAME.x1, y0: 0, y1: Y1, scale: SCALE })
const { W, H, hitE, hitN, dist } = frame
console.log(`rendered ${W}×${H}`)

// What's at each pixel: rock, forest, open ground, or too far for the imagery
const KIND = { none: 0, forest: 1, open: 2, rock: 3, far: 4 }

// What the aerial imagery shows at a spot, given the ground's surface normal
function classify([r, g, b, nir], n) {
  const ndvi = (nir - r) / (nir + r + 1)
  const bright = (r + g + b) / 3
  const slope = Math.acos(n[2]) * (180 / Math.PI)
  // Fountain sandstone reads pale and nearly neutral from the air; dry grass is
  // just as bare but distinctly yellow. The slabs' steep north sides sit in
  // shadow in the imagery, so dark near-cliffs count as rock too.
  const sunlitRock = ndvi < 0.06 && bright > 95 && r - b < 32
  const shadedCliff = (slope > 62 && ndvi < 0.3) || (slope > 50 && ndvi < 0.18 && bright < 70)
  // Grass can be fairly green in the imagery, but it's always brighter than tree
  // crowns, which are dark with their own shadows
  if (sunlitRock || shadedCliff) return KIND.rock
  if ((ndvi < 0.2 && bright > 80) || (ndvi < 0.35 && bright > 62)) return KIND.open
  return KIND.forest
}

// Broadleaf crowns reflect more infrared than pines
const isLeafy = ([r, , , nir]) => (nir - r) / (nir + r + 1) > 0.58 && nir > 150
const kind = new Uint8Array(W * H)
// Broadleaf trees and shrubs read much brighter green from the air than pines
const leafy = new Uint8Array(W * H)
// Rock keeps its crisp lidar normals; forest is lit by the broad shape of
// ridges and gullies, so its normals are smoothed over ~10 m
const normals = new Float32Array(W * H * 3)
const broad = new Float32Array(W * H * 3)
for (let i = 0; i < W * H; i++) {
  if (Number.isNaN(dist[i])) continue
  const d = dist[i]
  const n = terrain.normal(hitE[i], hitN[i], Math.max(2, d * 0.0012))
  normals.set(n, i * 3)
  broad.set(terrain.normal(hitE[i], hitN[i], Math.max(10, d * 0.006)), i * 3)
  const px = terrain.imagery(hitE[i], hitN[i])
  if (!px) {
    kind[i] = KIND.far
    continue
  }
  kind[i] = classify(px, n)
  leafy[i] = kind[i] === KIND.forest && isLeafy(px) ? 1 : 0
}

// Clean up single stray pixels so the traced areas are print-like
function majority(labels, r = 2) {
  const out = new Uint8Array(labels.length)
  const counts = new Uint16Array(256)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (!labels[i]) continue
      counts.fill(0)
      let best = labels[i]
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
          const l = labels[yy * W + xx]
          if (l && ++counts[l] > counts[best]) best = l
        }
      }
      out[i] = best
    }
  }
  return out
}
const kinds = majority(kind, 3)

// Group surface directions with k-means so each group can be lit as one flat color
function kmeans(pick, k, normals, smoothing = 3, iters = 12) {
  const r = rng(5)
  const idx = []
  for (let i = 0; i < W * H; i++) if (pick(i)) idx.push(i)
  const sample = idx.filter(() => r() < Math.min(1, 40000 / idx.length))
  let centers = Array.from({ length: k }, () => {
    const i = sample[Math.floor(r() * sample.length)]
    return [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]]
  })
  const nearest = (i) => {
    let best = 0
    let bd = -Infinity
    centers.forEach((c, j) => {
      const dot = c[0] * normals[i * 3] + c[1] * normals[i * 3 + 1] + c[2] * normals[i * 3 + 2]
      if (dot > bd) {
        bd = dot
        best = j
      }
    })
    return best
  }
  for (let it = 0; it < iters; it++) {
    const sums = centers.map(() => [0, 0, 0])
    for (const i of sample) {
      const j = nearest(i)
      for (let c = 0; c < 3; c++) sums[j][c] += normals[i * 3 + c]
    }
    centers = sums.map((s, j) => {
      const l = Math.hypot(...s)
      return l ? s.map((v) => v / l) : centers[j]
    })
  }
  const label = new Uint8Array(W * H)
  for (const i of idx) label[i] = nearest(i) + 1
  return { centers, label: majority(label, smoothing) }
}

// The whole mountain is lit as forest first; grass and rock print over it,
// so the forest areas stay whole instead of being riddled with holes
const isLand = (i) => kinds[i] !== KIND.none && dist[i] >= NEAR
const land = kmeans(isLand, K_LAND, broad, 5)
const open = kmeans((i) => kinds[i] === KIND.open && dist[i] >= NEAR, 1, broad)
const rock = kmeans((i) => kinds[i] === KIND.rock && dist[i] >= NEAR, K_ROCK, normals)
const hazeOf = (d) => HAZE.findIndex(([max]) => d < max)

const facets = []
const add = (kindName, groups, pick) => {
  groups.centers.forEach((n, j) => {
    HAZE.forEach(([, haze], h) => {
      const mask = new Uint8Array(W * H)
      let any = false
      for (let i = 0; i < W * H; i++) {
        if (groups.label[i] === j + 1 && pick(i) && dist[i] >= NEAR && hazeOf(dist[i]) === h) {
          mask[i] = 1
          any = true
        }
      }
      if (any) facets.push({ kind: kindName, n, haze, mask, decimals: kindName === 'rock' ? 1 : 0 })
    })
  })
}
add('land', land, isLand)
add('open', open, (i) => kinds[i] === KIND.open)
add('rock', rock, (i) => kinds[i] === KIND.rock)

// In front of the mountain: open meadow hills, lit by which way they face, and
// the woods as one dark mass for the trees to stand in. They run a little
// closer than GROUND so the grass always has meadow behind it.
const mid = (i) => dist[i] >= 60 && dist[i] < NEAR
const isWood = (i) => mid(i) && kinds[i] === KIND.forest
const isHill = (i) => mid(i) && kinds[i] !== KIND.forest && kinds[i] !== KIND.none
const hills = kmeans(isHill, 5, broad, 4)
hills.centers.forEach((n, j) => {
  const mask = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) mask[i] = hills.label[i] === j + 1 && isHill(i) ? 1 : 0
  facets.push({ kind: 'hill', n, haze: 0, mask, decimals: 0 })
})
const woodMask = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) woodMask[i] = isWood(i) ? 1 : 0
facets.push({ kind: 'wood', n: [0, 0, 1], haze: 0, mask: woodMask, decimals: 0 })

// Lines across the meadow at a fixed distance: the first row, from the bottom,
// that's farther away than `meters`. They follow every rise and dip.
const contour = (meters) => {
  const out = []
  for (let c = 0; c < W; c += 2 * SCALE) {
    let row = H - 1
    while (row > 0 && !(dist[row * W + c] >= meters)) row--
    out.push(Math.round(((row + 1) / SCALE) * 10) / 10)
  }
  return out
}
// Where the grass at your feet begins, and the bands of nearer meadow
const ground = contour(GROUND)
const bands = [contour(55), contour(32)]

// How far up the open meadow runs above that line before the woods start. A
// few rows of shrub are allowed so one bush in the grass doesn't end it.
const meadow = ground.map((g, n) => {
  const c = n * 2 * SCALE
  let row = Math.min(H - 1, Math.round(g * SCALE))
  let top = row
  let shrubs = 0
  for (; row > 0; row--) {
    const k = kinds[row * W + c]
    if (k === KIND.none) break
    if (k !== KIND.forest) {
      top = row
      shrubs = 0
    } else if (++shrubs > 6 * SCALE) break
  }
  return Math.round((top / SCALE) * 10) / 10
})

// Trees in front of the mountain, one wherever the aerial imagery shows a
// crown. Placing them on the map rather than on screen keeps the real gaps of
// the open ponderosa woodland, and perspective sizes and spaces them.
const woodTrees = []
{
  const r = rng(13)
  const { width: gw, height: gh, res } = terrain.fine
  const [gx0, , , gy1] = terrain.fine.bbox
  // Forest cells around the camera, and how much of the neighborhood of each is
  // canopy: a lone dark speck is a shrub, solid cover is mature forest
  const c0 = Math.max(0, Math.floor((CAMERA.E - NEAR - gx0) / res))
  const c1 = Math.min(gw, Math.ceil((CAMERA.E + NEAR - gx0) / res))
  const r0 = Math.max(0, Math.floor((gy1 - CAMERA.N - NEAR) / res))
  const r1 = Math.min(gh, Math.ceil((gy1 - CAMERA.N + NEAR) / res))
  const cw = c1 - c0
  const ch = r1 - r0
  const forest = new Uint8Array(cw * ch)
  const leaf = new Uint8Array(cw * ch)
  for (let row = 0; row < ch; row++) {
    const n = gy1 - (r0 + row + 0.5) * res
    for (let col = 0; col < cw; col++) {
      const e = gx0 + (c0 + col + 0.5) * res
      const px = terrain.imagery(e, n)
      if (!px || classify(px, terrain.normal(e, n, 3)) !== KIND.forest) continue
      forest[row * cw + col] = 1
      leaf[row * cw + col] = isLeafy(px) ? 1 : 0
    }
  }
  // Fraction of a square neighborhood that's set in a bitmap, via a summed table
  const neighborhood = (bits, R) => {
    const sum = new Uint32Array((cw + 1) * (ch + 1))
    for (let row = 0; row < ch; row++) {
      for (let col = 0; col < cw; col++) {
        sum[(row + 1) * (cw + 1) + col + 1] = bits[row * cw + col] + sum[row * (cw + 1) + col + 1] + sum[(row + 1) * (cw + 1) + col] - sum[row * (cw + 1) + col]
      }
    }
    return (row, col) => {
      const a = Math.max(0, row - R)
      const b = Math.min(ch, row + R + 1)
      const l = Math.max(0, col - R)
      const rr = Math.min(cw, col + R + 1)
      return (sum[b * (cw + 1) + rr] - sum[a * (cw + 1) + rr] - sum[b * (cw + 1) + l] + sum[a * (cw + 1) + l]) / ((b - a) * (rr - l))
    }
  }
  const cover = neighborhood(forest, 3)
  // Broadleaf trees here grow in thickets along the drainages; a lone bright
  // pixel is more likely a sunlit pine crown
  const thicket = neighborhood(leaf, 5)
  const smooth = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)
  }

  // Every forest cell in range, in random order, keeping those with room for a
  // crown; bigger trees need more room
  const HASH = 9
  const cell = new Map()
  const crowded = (e, n, min) => {
    const ke = Math.floor(e / HASH)
    const kn = Math.floor(n / HASH)
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        for (const [pe, pn, pm] of cell.get(`${ke + a},${kn + b}`) ?? []) {
          if (Math.hypot(pe - e, pn - n) < (min + pm) / 2) return true
        }
      }
    }
    return false
  }
  const candidates = []
  for (let row = 0; row < ch; row++) {
    for (let col = 0; col < cw; col++) {
      if (!forest[row * cw + col]) continue
      const e = gx0 + (c0 + col + 0.5) * res
      const n = gy1 - (r0 + row + 0.5) * res
      const d = Math.hypot(e - CAMERA.E, n - CAMERA.N)
      if (d < WOODS || d > NEAR) continue
      const p = cam.project(e, n, cam.Z)
      if (!p || p[0] < FRAME.x0 - 40 || p[0] > FRAME.x1 + 40) continue
      candidates.push([e, n, d, row, col])
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  const placed = []
  for (const [e, n, d, row, col] of candidates) {
    const f = cover(row, col)
    if (f < 0.3) continue
    const tall = 7 + 12 * smooth(0.3, 0.85, f) + r() * 4
    const min = tall * 0.32 + 1.5
    if (crowded(e, n, min)) continue
    const k = `${Math.floor(e / HASH)},${Math.floor(n / HASH)}`
    if (!cell.has(k)) cell.set(k, [])
    cell.get(k).push([e, n, min])
    placed.push([e, n, d, f > 0.6 && thicket(row, col) > 0.3 ? 1 : 0, tall])
  }

  // Project them, dropping trees hidden behind a nearer rise or behind trees in front
  const shown = new Uint8Array(W * H)
  const covered = (x, y) => x < 0 || y < 0 || x >= W || y >= H || shown[y * W + x] === 1
  placed.sort((a, b) => a[2] - b[2])
  for (const [e, n, d, leaf, tall] of placed) {
    const z = terrain.height(e, n)
    const base = cam.project(e, n, z)
    const top = cam.project(e, n, z + tall)
    if (!base || !top) continue
    const h = base[1] - top[1]
    if (h < 2.5) continue
    const bx = Math.round((base[0] - FRAME.x0) * SCALE)
    const by = Math.round(base[1] * SCALE)
    const range = Math.hypot(e - CAMERA.E, n - CAMERA.N, z - cam.Z)
    if (bx < 0 || bx >= W) continue
    // Out in the open meadow the imagery's dark patches are shrub thickets, so
    // trees stand only a little below where the grass gives out
    const edge = meadow[Math.min(meadow.length - 1, Math.round((base[0] - FRAME.x0) / 2))]
    if (base[1] > edge + 18) continue
    // Terrain in front: trees just over a rise show only their tops. Find the
    // lowest visible point, and drop the tree if not even its crown shows.
    const seen = (yy) => {
      const row = Math.round(yy * SCALE)
      if (row < 0) return true
      if (row >= H) return false
      const t = dist[row * W + bx]
      return Number.isNaN(t) || t > d - 30
    }
    let cut = base[1]
    while (cut > base[1] - h * 0.55 && !seen(cut)) cut -= 0.5
    if (cut <= base[1] - h * 0.55) continue
    // Other trees in front: skip if the crown is already almost entirely covered
    const rx = Math.max(1, h * 0.2 * SCALE)
    const ry = h * 0.37 * SCALE
    const cy = by - h * 0.63 * SCALE
    let hidden = 0
    let total = 0
    for (let a = -2; a <= 2; a++) {
      for (let b = -3; b <= 3; b++) {
        total++
        if (covered(Math.round(bx + (a / 2.5) * rx), Math.round(cy + (b / 3.5) * ry))) hidden++
      }
    }
    if (hidden / total > 0.9) continue
    for (let yy = Math.floor(cy - ry); yy <= cy + ry; yy++) {
      const half = rx * Math.sqrt(Math.max(0, 1 - ((yy - cy) / ry) ** 2)) * 0.85
      for (let xx = Math.floor(bx - half); xx <= bx + half; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H) shown[yy * W + xx] = 1
    }
    woodTrees.push([d, +base[0].toFixed(1), +base[1].toFixed(1), +Math.min(h, 220).toFixed(1), leaf, Math.round(range), +(base[1] - cut).toFixed(1)])
  }
}
woodTrees.sort((a, b) => b[0] - a[0])
// Packed as x, y, height, 1 if broadleaf, the slant range in meters (so the
// browser can find each tree's place on the ground to cast its shadow), and
// how much of it is hidden behind the ground in front
const woods = woodTrees.flatMap(([, ...tree]) => tree)
console.log(`${woodTrees.length} trees between the meadow and the mountain`)

// Trees scattered over the forest. From the meadow you see only the tops of the
// crowns above the canopy, so each is sized as ~5–9 m at its distance.
// Packed as x, y, height in frame units, and the facet group it stands on.
const trees = []
const r = rng(9)
const spacing = 8 * SCALE
for (let y = 0; y < H; y += spacing / 2) {
  for (let x = 0; x < W; x += spacing) {
    const jx = Math.min(W - 1, Math.round(x + r() * spacing))
    const jy = Math.min(H - 1, Math.round(y + r() * spacing / 2))
    const i = jy * W + jx
    if (kinds[i] !== KIND.forest || dist[i] < NEAR || dist[i] > 6000 || r() < 0.35) continue
    const h = ((5 + r() * 4) / dist[i]) * CAMERA.f
    if (h < 2) continue
    trees.push(Math.round(jx / SCALE + FRAME.x0), Math.round(jy / SCALE), Math.round(Math.min(h, 40) * 10) / 10, land.label[i] - 1)
  }
}
// Bare-earth lidar has no trees on it, so fringe the forested skyline with pines
for (let c = 0; c < W; c += 3 * SCALE) {
  const top = (frame.skyline[c] - 0) * SCALE
  const i = Math.min(H - 1, Math.ceil(top) + 2) * W + c
  if (kinds[i] !== KIND.forest || r() < 0.2) continue
  // Keep bare rock bare where a slab tops out on the skyline
  let rocky = false
  for (let dy = 0; dy < 16 * SCALE && !rocky; dy += 2) for (let dx = -6 * SCALE; dx <= 6 * SCALE && !rocky; dx += 2) {
    const k = Math.min(H - 1, Math.ceil(top) + dy) * W + Math.min(W - 1, Math.max(0, c + dx))
    rocky = kinds[k] === KIND.rock
  }
  if (rocky) continue
  const h = ((6 + r() * 5) / dist[i]) * CAMERA.f
  trees.push(Math.round(c / SCALE + FRAME.x0), Math.round(frame.skyline[c] * 10) / 10 + 1, Math.round(h * 10) / 10, land.label[i] - 1)
}
console.log(`${trees.length / 4} trees`)

const rockMask = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) rockMask[i] = kinds[i] === KIND.rock ? 1 : 0

const [lon, lat] = proj4(UTM, 'EPSG:4326', [CAMERA.E, CAMERA.N])

// When the sun actually reaches the meadow and when the ridge to the west cuts
// it off, from the lidar horizon around the camera
const horizon = horizonProfile(terrain, CAMERA.E, CAMERA.N, CAMERA.eye, 0, 360, 0.25)
const ridgeAt = (bearing) => (horizon.el[Math.round(bearing / 0.25) % horizon.el.length] * 180) / Math.PI
const sunAt = (hour) => getPosition(new Date(Date.parse(DAY) + (hour - UTC_OFFSET) * 3600e3), lat, lon)
const clear = (hour) => {
  const p = sunAt(hour)
  return p.altitude > ridgeAt(p.azimuth)
}
let rise = 4
while (!clear(rise)) rise += 1 / 120
let shade = 20
while (!clear(shade)) shade -= 1 / 120
const sunlit = [+rise.toFixed(3), +shade.toFixed(3)]
console.log(`sun on the meadow ${sunlit.join(' to ')} (${DAY})`)
await emitModule(new URL('../../src/lib/meadow/terrain.ts', import.meta.url).pathname, {
  source: 'USGS 3DEP lidar and NAIP imagery (public domain)',
  frame: { width: W, height: H, x0: FRAME.x0, y0: 0, scale: SCALE },
  skyline: [...frame.skyline],
  facets,
  rock: rockMask,
  trees,
  groups: land.centers,
  ground,
  bands,
  meadow,
  woods,
  day: DAY,
  sunlit,
  camera: { lat: +lat.toFixed(5), lon: +lon.toFixed(5), heading: CAMERA.heading, pitch: CAMERA.pitch, roll: CAMERA.roll, f: CAMERA.f, cx: CAMERA.cx, cy: CAMERA.cy },
})

if (process.argv.includes('--preview')) {
  const tint = [[150, 190, 235], [52, 92, 56], [200, 180, 140], [214, 150, 128], [120, 140, 150]]
  const img = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H; i++) {
    const n = normals.subarray(i * 3, i * 3 + 3)
    const lit = 0.55 + 0.45 * Math.max(0, n[0] * 0.6 + n[1] * -0.3 + n[2] * 0.74)
    const c = leafy[i] && kinds[i] === KIND.forest ? [120, 190, 60] : tint[kinds[i]]
    img.set(c.map((v) => (kinds[i] ? v * lit : v)), i * 3)
  }
  await sharp(img, { raw: { width: W, height: H, channels: 3 } }).resize(2400).png().toFile(new URL('render-preview.png', CACHE).pathname)
  console.log('wrote render-preview.png')
}
