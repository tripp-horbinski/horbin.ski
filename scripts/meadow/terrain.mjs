// Heightfield sampling, a pinhole camera, and a column-by-column terrain
// renderer (the old "voxel space" trick: march outward along each screen
// column's bearing and fill rows front to back as the terrain rises).

import { readRaster } from './config.mjs'

const EARTH = 6371000
// Standard terrestrial refraction lifts distant terrain a little
const REFRACTION = 0.13

function sampler(g, channels = 1, channel = 0) {
  const { width: w, height: h, res, data } = g
  const [x0, , , y1] = g.bbox
  return (E, N) => {
    const fx = (E - x0) / res - 0.5
    const fy = (y1 - N) / res - 0.5
    if (fx < 0 || fy < 0 || fx >= w - 1 || fy >= h - 1) return NaN
    const x = fx | 0
    const y = fy | 0
    const tx = fx - x
    const ty = fy - y
    const i = (y * w + x) * channels + channel
    const r = w * channels
    return (data[i] * (1 - tx) + data[i + channels] * tx) * (1 - ty) + (data[i + r] * (1 - tx) + data[i + r + channels] * tx) * ty
  }
}

export async function loadTerrain() {
  const fine = await readRaster('dem-fine')
  const coarse = await readRaster('dem-coarse')
  const naip = await readRaster('naip')
  const hf = sampler(fine)
  const hc = sampler(coarse)
  const height = (E, N) => {
    const h = hf(E, N)
    return Number.isNaN(h) ? hc(E, N) : h
  }
  const bands = [0, 1, 2, 3].map((b) => sampler(naip, 4, b))
  // Red, green, blue, near-infrared at a point, or null outside the imagery
  const imagery = (E, N) => {
    const v = bands.map((s) => s(E, N))
    return Number.isNaN(v[0]) ? null : v
  }
  // Surface normal (east, north, up) from the lidar, smoothed over a few meters
  const normal = (E, N, span = 3) => {
    const dx = (height(E + span, N) - height(E - span, N)) / (2 * span)
    const dy = (height(E, N + span) - height(E, N - span)) / (2 * span)
    const l = Math.hypot(dx, dy, 1)
    return [-dx / l, -dy / l, 1 / l]
  }
  return { height, imagery, normal, fine }
}

const drop = (d) => ((d * d) / (2 * EARTH)) * (1 - REFRACTION)

// A level-ish pinhole camera; heading is degrees clockwise from north
export function makeCamera(terrain, { E, N, eye = 1.7, heading, pitch = 0, roll = 0, f, cx = 600, cy = 400 }) {
  const Z = terrain.height(E, N) + eye
  const p = (heading * Math.PI) / 180
  const t = (pitch * Math.PI) / 180
  const q = (roll * Math.PI) / 180
  const F = [Math.sin(p) * Math.cos(t), Math.cos(p) * Math.cos(t), Math.sin(t)]
  const R0 = [Math.cos(p), -Math.sin(p), 0]
  const U0 = [-Math.sin(p) * Math.sin(t), -Math.cos(p) * Math.sin(t), Math.cos(t)]
  const R = R0.map((v, i) => v * Math.cos(q) + U0[i] * Math.sin(q))
  const U = U0.map((v, i) => v * Math.cos(q) - R0[i] * Math.sin(q))
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  return {
    E, N, Z, f, cx, cy, F, R, U,
    project(e, n, z) {
      const rel = [e - E, n - N, z - Z]
      const zc = dot(rel, F)
      if (zc <= 0) return null
      return [cx + (f * dot(rel, R)) / zc, cy - (f * dot(rel, U)) / zc]
    },
    // Unit ray through a pixel, in east/north/up
    ray(u, v) {
      const d = [0, 1, 2].map((i) => F[i] * f + R[i] * (u - cx) + U[i] * (cy - v))
      const l = Math.hypot(...d)
      return d.map((x) => x / l)
    },
  }
}

// Marching distances: fine near the camera, stretching out with range
function* steps(near = 25, far = 32000, grow = 0.0012) {
  for (let d = near; d < far; d += Math.max(1, d * grow)) yield d
}

// Highest elevation angle of the terrain along each bearing, for calibration
export function horizonProfile(terrain, E, N, eye, az0, az1, step) {
  const Z = terrain.height(E, N) + eye
  const n = Math.round((az1 - az0) / step) + 1
  const out = new Float32Array(n)
  for (let k = 0; k < n; k++) {
    const a = ((az0 + k * step) * Math.PI) / 180
    const se = Math.sin(a)
    const ce = Math.cos(a)
    let best = -Infinity
    // Only the highest point matters here, so coarser steps will do
    for (const d of steps(40, 32000, 0.0025)) {
      const h = terrain.height(E + se * d, N + ce * d)
      if (Number.isNaN(h)) break
      const el = (h - drop(d) - Z) / d
      if (el > best) best = el
    }
    out[k] = Math.atan(best)
  }
  return { az0, step, el: out }
}

// Render a frame: for every pixel, where its ray first meets the ground.
// Returns per-pixel hit easting/northing/distance (NaN for sky) and the skyline.
export function renderFrame(terrain, cam, { x0, x1, y0, y1, scale = 1 }) {
  const W = Math.round((x1 - x0) * scale)
  const H = Math.round((y1 - y0) * scale)
  const hitE = new Float64Array(W * H).fill(NaN)
  const hitN = new Float64Array(W * H).fill(NaN)
  const dist = new Float32Array(W * H).fill(NaN)
  const skyline = new Float32Array(W)
  for (let c = 0; c < W; c++) {
    const u = x0 + (c + 0.5) / scale
    const r = cam.ray(u, cam.cy)
    const l = Math.hypot(r[0], r[1])
    const de = r[0] / l
    const dn = r[1] / l
    let floor = H
    let top = Infinity
    for (const d of steps()) {
      const e = cam.E + de * d
      const n = cam.N + dn * d
      const h = terrain.height(e, n)
      if (Number.isNaN(h)) break
      const p = cam.project(e, n, h - drop(d))
      if (!p) continue
      const v = (p[1] - y0) * scale
      top = Math.min(top, p[1])
      if (v >= floor) continue
      for (let row = Math.max(0, Math.ceil(v)); row < floor; row++) {
        const i = row * W + c
        hitE[i] = e
        hitN[i] = n
        dist[i] = d
      }
      floor = Math.max(0, Math.ceil(v))
      if (floor === 0) break
    }
    skyline[c] = top
  }
  return { W, H, x0, y0, scale, hitE, hitN, dist, skyline }
}
