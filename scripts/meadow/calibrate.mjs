// Finds where a photo was taken from: the camera position, bearing, tilt and
// focal length whose lidar skyline best matches the photo's skyline (from
// trace-photo.mjs). Prints the camera to paste into config.mjs.
//
//   node scripts/meadow/calibrate.mjs [photo.jpg for an overlay check]

import { readFile, writeFile } from 'node:fs/promises'
import proj4 from 'proj4'
import sharp from 'sharp'
import { CACHE, UTM } from './config.mjs'
import { horizonProfile, loadTerrain, makeCamera, renderFrame } from './terrain.mjs'

const terrain = await loadTerrain()
const photo = JSON.parse(await readFile(new URL('photo-skyline.json', CACHE), 'utf8'))
// Columns left of ~200 are near pines against the sky, not the mountain
const cols = []
for (let u = 200; u < photo.width - 2; u += 4) cols.push([u + 0.5, photo.skyline[u]])

const EYE = 1.7
const deg = Math.PI / 180

function profileAt(E, N, az0, az1) {
  return horizonProfile(terrain, E, N, EYE, az0, az1, 0.05)
}

function elAt(prof, az) {
  const k = (az - prof.az0) / prof.step
  const i = Math.floor(k)
  if (i < 0 || i >= prof.el.length - 1) return NaN
  return prof.el[i] + (prof.el[i + 1] - prof.el[i]) * (k - i)
}

const huber = (r, d = 6) => (Math.abs(r) < d ? (r * r) / 2 : d * (Math.abs(r) - d / 2))

// Misfit in pixels between the photo skyline and the lidar skyline
function cost(prof, p) {
  const cam = makeCamera({ height: () => 0 }, { E: 0, N: 0, eye: 0, ...p })
  let sum = 0
  for (const [u, v] of cols) {
    const r = cam.ray(u, v)
    const az = Math.atan2(r[0], r[1]) / deg
    const el = Math.asin(r[2])
    const m = elAt(prof, (az + 360) % 360)
    sum += Number.isNaN(m) ? 50 : huber((el - m) * p.f)
  }
  return sum / cols.length
}

// Coarse fit of bearing and focal length at one spot; small-angle pitch from the median
function fitView(prof) {
  let best = null
  for (let heading = 200; heading <= 250; heading += 1) {
    for (let f = 700; f <= 2200; f += 50) {
      const diffs = cols.map(([u, v]) => elAt(prof, heading + Math.atan((u - 600) / f) / deg) - Math.atan((400 - v) / f)).filter((x) => !Number.isNaN(x)).sort((a, b) => a - b)
      if (diffs.length < cols.length * 0.8) continue
      const pitch = diffs[diffs.length >> 1] / deg
      const c = cost(prof, { heading, pitch, f, roll: 0 })
      if (!best || c < best.c) best = { heading, pitch, f, roll: 0, c }
    }
  }
  return best
}

console.log('searching the meadow on a 60 m grid…')
const found = []
for (let E = 475100; E <= 476000; E += 60) {
  for (let N = 4427150; N <= 4427850; N += 60) {
    const prof = profileAt(E, N, 150, 300)
    const v = fitView(prof)
    if (v) found.push({ E, N, ...v })
  }
}
found.sort((a, b) => a.c - b.c)
console.log('best spots:', found.slice(0, 5).map((s) => `${s.E},${s.N} h${s.heading} f${s.f} → ${s.c.toFixed(2)}`).join(' | '))

// Nelder–Mead over position, bearing, tilt, roll and focal length
function nelderMead(fn, x0, scales, iters = 220) {
  let simplex = [x0, ...x0.map((_, i) => x0.map((v, j) => (i === j ? v + scales[j] : v)))].map((x) => ({ x, c: fn(x) }))
  for (let it = 0; it < iters; it++) {
    simplex.sort((a, b) => a.c - b.c)
    const n = x0.length
    const centroid = x0.map((_, j) => simplex.slice(0, n).reduce((s, p) => s + p.x[j], 0) / n)
    const worst = simplex[n]
    const along = (t) => centroid.map((c, j) => c + t * (worst.x[j] - c))
    const refl = { x: along(-1) }
    refl.c = fn(refl.x)
    if (refl.c < simplex[0].c) {
      const exp = { x: along(-2) }
      exp.c = fn(exp.x)
      simplex[n] = exp.c < refl.c ? exp : refl
    } else if (refl.c < simplex[n - 1].c) {
      simplex[n] = refl
    } else {
      const con = { x: along(0.5) }
      con.c = fn(con.x)
      if (con.c < worst.c) simplex[n] = con
      else simplex = simplex.map((p, i) => (i === 0 ? p : { x: p.x.map((v, j) => simplex[0].x[j] + 0.5 * (v - simplex[0].x[j])), c: 0 })).map((p, i) => (i === 0 ? p : { ...p, c: fn(p.x) }))
    }
  }
  simplex.sort((a, b) => a.c - b.c)
  return simplex[0]
}

let best = null
for (const s of found.slice(0, 3)) {
  const fn = ([E, N, heading, pitch, roll, f]) => cost(profileAt(E, N, heading - 45, heading + 45), { heading, pitch, roll, f })
  const r = nelderMead(fn, [s.E, s.N, s.heading, s.pitch, 0, s.f], [25, 25, 0.5, 0.3, 0.3, 40])
  console.log(`refined from ${s.E},${s.N}: ${r.c.toFixed(2)} px`)
  if (!best || r.c < best.c) best = r
}
const [E, N, heading, pitch, roll, f] = best.x
const [lon, lat] = proj4(UTM, 'EPSG:4326', [E, N])
const camera = { E: Math.round(E * 10) / 10, N: Math.round(N * 10) / 10, eye: EYE, heading: +heading.toFixed(3), pitch: +pitch.toFixed(3), roll: +roll.toFixed(3), f: +f.toFixed(1), cx: 600, cy: 400 }
console.log(`camera at ${lat.toFixed(5)}, ${lon.toFixed(5)}; mean misfit ${best.c.toFixed(2)} px`)
console.log(JSON.stringify(camera))
await writeFile(new URL('camera.json', CACHE), JSON.stringify(camera))

// Overlay: photo skyline in cyan, lidar skyline in red
const photoPath = process.argv[2]
if (photoPath) {
  const cam = makeCamera(terrain, camera)
  const { skyline } = renderFrame(terrain, cam, { x0: 0, x1: 1200, y0: 0, y1: 800 })
  const { data, info } = await sharp(photoPath).resize(1200).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const dot = (x, y, c) => {
    for (let k = -1; k <= 1; k++) {
      const yy = Math.round(y) + k
      if (yy >= 0 && yy < info.height) data.set(c, (yy * info.width + x) * 3)
    }
  }
  for (let x = 0; x < 1200; x++) {
    dot(x, photo.skyline[x], [0, 255, 255])
    dot(x, skyline[x], [255, 0, 0])
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toFile(new URL('calibration.png', CACHE).pathname)
  console.log('wrote calibration.png')
}
