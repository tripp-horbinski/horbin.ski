// Builds the runner figure on /me from Tripp's 2024 Milwaukee Lakefront
// Marathon finish photo, as a screen print: cut him out of the crowd with
// Apple's Vision framework, repair what the photo hides, separate it into flat
// inks and trace each with potrace into src/lib/meadow/runner-art.ts.
//
//   npm run meadow:runner -- finish.jpg
//
// Every repair below is placed in that photo's pixels. The photo and the
// intermediate images stay in .cache; only the traced inks are committed.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import potrace from 'potrace'
import sharp from 'sharp'
import { CACHE } from './config.mjs'

const OUT = new URL('../../src/lib/meadow/runner-art.ts', import.meta.url)
const WORK = new URL('runner/', CACHE)
const SCALE = 3 // inks are separated and traced at 3× the photo
const H = 1000 // the canvas runs past the photo's bottom edge for his feet
const FACE = [390, 250] // a point on his face, to pick him out of the crowd

// ---------------------------------------------------------------------------
// Cutting him out

// Vision runs from a small Swift tool, compiled on first use. Command Line
// Tools can ship SDKs newer than their compiler, so fall back through them.
function segmenter() {
  const bin = fileURLToPath(new URL('segment', CACHE))
  if (existsSync(bin)) return bin
  const src = fileURLToPath(new URL('./segment.swift', import.meta.url))
  const sdkDir = '/Library/Developer/CommandLineTools/SDKs'
  const sdks = existsSync(sdkDir) ? readdirSync(sdkDir).filter((s) => /^MacOSX\d/.test(s)).sort().reverse() : []
  for (const sdk of [null, ...sdks]) {
    try {
      execFileSync('xcrun', ['swiftc', '-O', ...(sdk ? ['-sdk', `${sdkDir}/${sdk}`] : []), src, '-o', bin], { stdio: 'pipe' })
      return bin
    } catch {}
  }
  throw new Error('could not compile segment.swift; it needs macOS 14+ and the Xcode command line tools')
}

async function cutout(photo, width, height) {
  const dir = fileURLToPath(WORK)
  const files = execFileSync(segmenter(), [photo, dir], { encoding: 'utf8' }).trim().split('\n')
  const gray = async (f) => sharp(f).greyscale().raw().toBuffer()
  const fg = await gray(files.find((f) => f.endsWith('fg.png')))
  // Of the people Vision finds, the one under his face
  let person = null
  let best = -1
  for (const f of files.filter((f) => /person-\d+\.png$/.test(f))) {
    const m = await gray(f)
    const v = m[FACE[1] * width + FACE[0]]
    if (v > best) [best, person] = [v, m]
  }
  // Crisp edges from the foreground mask, separated from his friend by his own
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const p = Math.min(1, Math.max(0, (person[i] / 255 - 0.3) / 0.3))
    mask[i] = (fg[i] / 255) * p > 0.5 ? 1 : 0
  }
  return mask
}

// ---------------------------------------------------------------------------
// His shoes

// Hoka Clifton 11s as a simple solid in centimeters: along the foot from the
// back of the heel (u = -10.5) to the toe (19.4), the footprint's half width,
// the midsole's rockered bottom and its top, the top of the upper, and the rim
// of the collar
const CLIFTON = {
  halfWidth: [[-10.5, 0.8], [-10, 2.9], [-8, 4.3], [-3, 4.1], [2, 3.9], [7, 5], [12, 5.6], [15.5, 5.3], [17.5, 4.3], [18.8, 2.8], [19.4, 0.8]],
  bottom: [[-10.5, 1.3], [-9, 0.3], [-7, 0], [12, 0], [16, 0.5], [19.4, 1.3]],
  midsole: [[-10.5, 5.2], [-8, 5.6], [0, 5.3], [8, 4.7], [14, 4.4], [17.5, 4.1], [19.4, 3.3]],
  upper: [[-10.6, 10.2], [-10, 10], [-8, 8.8], [-3, 7.8], [0, 8.2], [3, 8.6], [6, 8], [10, 7.2], [14, 6.4], [17, 5.4], [18.8, 4.2], [19.3, 3.6]],
  collar: [[-9.6, 9.6], [-8, 8.5], [-4, 7.4], [0, 7.6], [1.2, 8]],
  flare: 1, // how far the midsole stands out past the upper
  // Hoka's bird on the inner side, the side you see of feet turned out: its
  // short wing toward the toe, the long one rising toward the heel. Each point
  // is along the foot and how far up the side, from the midsole to the top.
  // It sits 4.5 cm nearer the toe than on the shoe, out from behind his ankle.
  logo: [
    [6.7, 0.69], [6, 0.68], [4.9, 0.62], [3.9, 0.56], [3.3, 0.53], [2.3, 0.6], [1, 0.71], [-0.4, 0.85],
    [-0.4, 0.82], [0.6, 0.68], [1.9, 0.53], [2.9, 0.42], [3.3, 0.3], [3.8, 0.38], [4.6, 0.49], [5.7, 0.59], [6.6, 0.66],
  ],
}
// Their colorways, each one color all over with gray laces and logo: ATPS, a
// warm taupe, and White/White, with cool gray shadows. They print in ATPS, and
// the inks are tagged so the site can show them in either.
const SHOES = {
  atps: { light: 'rgb(200,193,189)', upper: 'rgb(171,162,156)', midsole: 'rgb(150,139,130)', shade: 'rgb(121,111,103)', outsole: 'rgb(86,77,71)', trim: 'rgb(96,98,102)' },
  white: { light: 'rgb(246,246,244)', upper: 'rgb(226,227,228)', midsole: 'rgb(236,236,235)', shade: 'rgb(196,198,201)', outsole: 'rgb(168,170,174)', trim: 'rgb(96,98,102)' },
}

// One shoe in `ink`s, seen from in front and above with the toes turned out,
// standing with the ground under its ankle at (ax, ay) in the photo; `side` -1
// mirrors it for his left foot. Gives its shapes as SVG, the region below the
// collar (where the shoe is in front of his leg) and the sock above it.
function clifton(ax, ay, side, ink) {
  const along = (k) => (u) => {
    const pts = CLIFTON[k]
    if (u <= pts[0][0]) return pts[0][1]
    for (let j = 1; j < pts.length; j++) {
      const [[u0, a], [u1, b]] = [pts[j - 1], pts[j]]
      if (u <= u1) return a + ((b - a) * (u - u0)) / (u1 - u0)
    }
    return pts.at(-1)[1]
  }
  const [halfWidth, bottom, midsole, upper, collar] = ['halfWidth', 'bottom', 'midsole', 'upper', 'collar'].map(along)
  const PX = 3.9 // photo pixels per centimeter, from the width of his ankles
  const turn = (18 * Math.PI) / 180
  const tilt = (24 * Math.PI) / 180
  // v is toward his other foot
  const proj = ([u, v, z]) => {
    const x = -Math.sin(turn) * u + Math.cos(turn) * v
    const depth = -Math.cos(turn) * u - Math.sin(turn) * v
    return [ax + side * PX * x, ay - PX * (z * Math.cos(tilt) + depth * Math.sin(tilt))]
  }
  const steps = (a, b, n) => Array.from({ length: n + 1 }, (_, k) => a + ((b - a) * k) / n)
  // Outline of a solid's projection: the convex hull of its points
  const hull = (pts) => {
    pts = pts.map(proj).sort((p, q) => p[0] - q[0] || p[1] - q[1])
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    const half = (list) => list.reduce((h, p) => {
      while (h.length >= 2 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop()
      return [...h, p]
    }, [])
    const lower = half(pts)
    const upperHalf = half(pts.slice().reverse())
    return [...lower.slice(0, -1), ...upperHalf.slice(0, -1)]
  }
  const path = (pts) => `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z`
  const outline = (z, inset = 0, n = 40) => {
    const w = (u) => Math.max(0, halfWidth(u) - inset)
    return [...steps(-10.5, 19.4, n).map((u) => [u, w(u), z(u)]), ...steps(19.4, -10.5, n).map((u) => [u, -w(u), z(u)])]
  }
  // The upper, as arches over the foot from the midsole on one side to the other
  const arches = (from, to) => steps(-10.4, 19, 60).flatMap((u) => {
    const w = Math.max(0, halfWidth(u) - CLIFTON.flare)
    return steps(from, to, 12).map((t) => [u, w * Math.cos(t), midsole(u) + (upper(u) - midsole(u)) * Math.sin(t)])
  })
  // The sculpted wave along the midsole's side, fading out at the toe
  const wave = (u) => 0.1 * Math.sin((u + 4) / 2.6)
  const fade = (u) => (0.08 * Math.max(0, u - 12)) / 3.5
  const groove = [
    ...steps(-9.5, 15.5, 40).map((u) => [u, halfWidth(u), bottom(u) + (midsole(u) - bottom(u)) * (0.58 + wave(u) - fade(u))]),
    ...steps(15.5, -9.5, 40).map((u) => [u, halfWidth(u), bottom(u) + (midsole(u) - bottom(u)) * (0.36 + wave(u) + fade(u))]),
  ]
  // The collar's rim, and the lacing between the eyestays with four laces across
  const rim = (u) => Math.max(0, halfWidth(u) - CLIFTON.flare - 0.5)
  const opening = [...steps(-9.6, 1.2, 24).map((u) => [u, rim(u), collar(u)]), ...steps(1.2, -9.6, 24).map((u) => [u, -rim(u), collar(u)])]
  const throat = [...steps(1.2, 10.5, 12).map((u) => [u, 2, upper(u) - 0.25]), ...steps(10.5, 1.2, 12).map((u) => [u, -2, upper(u) - 0.25])]
  const laces = [2.6, 4.6, 6.6, 8.6].map((u) => [[u, 1.6, upper(u)], [u, -1.6, upper(u)], [u + 0.75, -1.6, upper(u + 0.75)], [u + 0.75, 1.6, upper(u + 0.75)]])
  // The logo, on the arch of the upper's inner side
  const logo = CLIFTON.logo.map(([u, f]) => [u, (halfWidth(u) - CLIFTON.flare) * Math.cos(Math.asin(f)), midsole(u) + f * (upper(u) - midsole(u))])
  const body = `
    <path d="${path(hull([...outline(bottom), ...outline((u) => bottom(u) + 0.7)]))}" fill="${ink.outsole}"/>
    <path d="${path(hull([...outline((u) => bottom(u) + 0.6), ...outline(midsole)]))}" fill="${ink.midsole}"/>
    <path d="${path(groove.map(proj))}" fill="${ink.shade}"/>
    <path d="${path(hull(arches(0, Math.PI)))}" fill="${ink.light}"/>
    <path d="${path(hull(arches(0, Math.PI / 2 - 0.35)))}" fill="${ink.upper}"/>
    <path d="${path(opening.map(proj))}" fill="${ink.shade}"/>
    <path d="${path(throat.map(proj))}" fill="${ink.upper}"/>
    ${laces.map((l) => `<path d="${path(l.map(proj))}" fill="${ink.trim}"/>`).join('')}
    <path d="${path(logo.map(proj))}" fill="${ink.trim}"/>`
  // His ankle goes in behind the tongue: below the front of the collar the
  // shoe is in front of his leg, and just above it is a band of sock
  const front = steps(-6, 1.2, 12).map((u) => [u, rim(u), collar(u)])
  const line = [...front, ...front.slice(0, -1).reverse().map(([u, v, z]) => [u, -v, z])].map(proj)
  // His ankle is wider than the rim, so the line runs on sideways past its ends
  const [a, b] = [line[0], line.at(-1)]
  const out = Math.sign(a[0] - b[0]) * 12
  const below = path([[a[0] + out, H], [a[0] + out, a[1]], ...line, [b[0] - out, b[1]], [b[0] - out, H]])
  const ankle = steps(-Math.PI / 2, Math.PI / 2, 16).map((t) => [-3.2 + 4.2 * Math.cos(t), 3.6 * Math.sin(t)])
  const sock = path([...ankle.map(([u, v]) => proj([u, v, collar(u) + 1.3])), ...ankle.reverse().map(([u, v]) => proj([u, v, collar(u) - 0.3]))])
  return { body, below, sock, ground: proj([4, 0, 0]) }
}

// ---------------------------------------------------------------------------
// Repairs, in the photo's pixels

async function repair(photo, shoes) {
  const src = await sharp(photo).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = src.info.width
  const H0 = src.info.height
  const cut = await cutout(photo, W, H0)
  const img = new Float32Array(W * H * 3)
  const mask = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    const sy = Math.min(y, H0 - 1) // edge-extend the bottom rows
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) img[(y * W + x) * 3 + c] = src.data[(sy * W + x) * 3 + c]
      mask[y * W + x] = cut[sy * W + x]
    }
  }
  // The photo as it was, for tracing the tattoo's ink
  const photoPx = Buffer.from(img)
  // Painted pixels print in exactly their painted color
  const paint = Buffer.alloc(W * H * 4)
  const stamp = (i, rgb) => {
    for (let c = 0; c < 3; c++) img[i * 3 + c] = paint[i * 4 + c] = rgb[c]
    paint[i * 4 + 3] = 255
  }
  const set = (i, rgb) => {
    mask[i] = 1
    for (let c = 0; c < 3; c++) img[i * 3 + c] = rgb[c]
  }
  const isSkin = (i) => img[i * 3] > img[i * 3 + 2] + 20 && img[i * 3] >= img[i * 3 + 1]

  const svgMask = async (body) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000"/>${body.replace(/fill="[^"]+"/g, 'fill="#fff"')}</svg>`
    return Uint8Array.from(await sharp(Buffer.from(svg)).greyscale().raw().toBuffer(), (v) => (v > 127 ? 1 : 0))
  }
  const poly = (points) => svgMask(`<path d="M${points.map((p) => p.join(' ')).join('L')}Z" fill="#fff"/>`)
  // Paints SVG shapes into the image, where `where(i)` allows. With `inks`, each
  // pixel takes the nearest of them, so the blends along edges between shapes
  // don't print as slivers of other colors.
  async function painting(body, where = () => true, keep = false, inks = null) {
    const m = await svgMask(body)
    const rgb = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`)).removeAlpha().raw().toBuffer()
    const far = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    for (let i = 0; i < W * H; i++) {
      if (!m[i] || !where(i)) continue
      let c = rgb.subarray(i * 3, i * 3 + 3)
      if (inks) c = inks.reduce((a, b) => (far(b, c) < far(a, c) ? b : a))
      if (keep) stamp(i, c)
      else set(i, c)
      mask[i] = 1
    }
  }

  // Fills a region smoothly from the known pixels around it, starting from
  // their mean or, with `columns`, from a blend between the known pixels
  // above and below in each column
  function inpaint(region, known, iters, columns = false) {
    const idx = []
    for (let i = 0; i < W * H; i++) if (region[i]) idx.push(i)
    const mean = [0, 0, 0]
    let n = 0
    for (const i of idx) {
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (!known[j] || region[j]) continue
        for (let c = 0; c < 3; c++) mean[c] += img[j * 3 + c]
        n++
      }
    }
    for (const i of idx) {
      let up = i
      let down = i
      while (columns && up >= W && region[up]) up -= W
      while (columns && down < W * (H - 1) && region[down]) down += W
      const a = (i - up) / W
      const b = (down - i) / W
      for (let c = 0; c < 3; c++) {
        img[i * 3 + c] = columns && known[up] && known[down] ? (img[up * 3 + c] * b + img[down * 3 + c] * a) / (a + b) : mean[c] / Math.max(1, n)
      }
    }
    for (let t = 0; t < iters; t++) {
      for (const i of idx) {
        const s = [0, 0, 0]
        let k = 0
        for (const j of [i - 1, i + 1, i - W, i + W]) {
          if (!known[j] && !region[j]) continue
          for (let c = 0; c < 3; c++) s[c] += img[j * 3 + c]
          k++
        }
        if (k) for (let c = 0; c < 3; c++) img[i * 3 + c] = s[c] / k
      }
    }
  }
  const SINGLET = [30, 32, 37]

  // 1. His left shoulder: his friend's fingers rest on the deltoid, and the
  //    mask lost the strap above its seam. Everything above the shoulder line
  //    goes, the strap is filled black up to it, and the deltoid is filled in
  //    by carrying his arm straight up from below the fingers and the sunlit
  //    patch around them, so its lit outer edge and shaded inside run on to
  //    the top of the shoulder.
  const line = [[426, 304], [446, 310], [466, 318], [485, 324], [502, 332], [513, 347], [519, 364], [521, 382], [523, 392]]
  const above = await poly([[426, 280], [530, 280], [530, 392], ...line.slice().reverse()])
  for (let i = 0; i < W * H; i++) if (above[i]) mask[i] = 0
  const strap = await poly([[426, 304], [446, 310], [466, 318], [468, 342], [426, 342]])
  for (let i = 0; i < W * H; i++) if (strap[i] && !mask[i]) set(i, SINGLET)
  const deltoid = await poly([...line.slice(2, -1), [521, 392], [466, 392]])
  const fingers = Uint8Array.from(deltoid, (v, i) => v & (((i / W) | 0) < 358))
  for (let i = 0; i < W * H; i++) if (fingers[i]) mask[i] = 1
  for (let i = 0; i < 372 * W; i++) {
    if (!deltoid[i] || !(fingers[i] || isSkin(i))) continue
    let j = 372 * W + (i % W)
    while (j < 420 * W && !(mask[j] && isSkin(j))) j += W
    if (j < 420 * W) for (let c = 0; c < 3; c++) img[i * 3 + c] = img[j * 3 + c]
  }

  // 2. His right arm is around his friend's back. Drop it and whatever his
  //    friend holds behind him, left of his right side, and mirror his left
  //    arm into its place down to just above the watch, hanging behind his
  //    torso and rounding over beside the strap.
  const side = [[300, 318], [330, 322], [440, 330], [520, 336], [600, 338], [780, 334]]
  const sideAt = (y) => {
    for (let k = 1; k < side.length; k++) {
      const [y0, x0] = side[k - 1]
      const [y1, x1] = side[k]
      if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0)
    }
  }
  const strapR = await poly([[328, 328], [342, 318], [357, 312], [357, 344], [328, 344]])
  const strapRGap = Uint8Array.from(strapR, (v, i) => v & !mask[i])
  for (let y = 300; y < 780; y++) for (let x = 0; x < sideAt(y); x++) mask[y * W + x] = 0
  const armArea = await poly([[462, 300], [522, 300], [600, 520], [600, 546], [510, 546], [500, 470], [492, 420], [489, 360], [470, 330]])
  for (let i = 0; i < W * H; i++) if (strapRGap[i] && !mask[i]) set(i, SINGLET)

  // In its place, his right arm painted in a shaka, as thick and as long as
  // his other arm and in three of its skin tones: the shoulder tucked under
  // the strap, the upper arm hanging close at his side, the forearm opened
  // out and down, and the hand straight on from it, palm to you, thumb and
  // pinky spread
  const tones = (() => {
    const lum = (i) => 0.3 * img[i * 3] + 0.59 * img[i * 3 + 1] + 0.11 * img[i * 3 + 2]
    const px = []
    for (let i = 0; i < W * H; i++) if (mask[i] && armArea[i] && isSkin(i)) px.push(i)
    px.sort((p, q) => lum(p) - lum(q))
    const mean = (from, to) => {
      const sel = px.slice(Math.floor(px.length * from), Math.floor(px.length * to))
      return `rgb(${[0, 1, 2].map((c) => Math.round(sel.reduce((a, i) => a + img[i * 3 + c], 0) / sel.length)).join(',')})`
    }
    return { shade: mean(0.1, 0.35), mid: mean(0.35, 0.7), lit: mean(0.72, 0.95) }
  })()
  const at = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k]
  const dir = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)]
  const SHOULDER = [326, 346]
  const UPPER = 125
  const FORE = 112
  const u = dir(100) // shoulder to elbow, 10° out from hanging straight down
  const nu = dir(10) // the upper arm's inner side, toward his torso
  const elbow = at(SHOULDER, u, UPPER)
  const f = dir(150) // elbow to wrist, out and down, the arm opened out
  const nf = dir(240) // the forearm's top
  const wrist = at(elbow, f, FORE)
  const upper = (t, w) => at(at(SHOULDER, u, UPPER * t), nu, w)
  const fore = (t, w) => at(at(elbow, f, FORE * t), nf, w)
  // The crook of the elbow, where the top of the upper arm meets the inside of the forearm
  const crook = (() => {
    const [p, r] = [upper(0, -19), fore(0, 18)]
    const det = u[0] * -f[1] + f[0] * u[1]
    const k = ((r[0] - p[0]) * -f[1] + f[0] * (r[1] - p[1])) / det
    return at(p, u, k)
  })()
  const bend = [u[0] - f[0], u[1] - f[1]]
  const point = at(elbow, bend.map((v) => v / Math.hypot(...bend)), 20)
  // Closed Catmull-Rom curve through the points
  const curve = (pts) => {
    const n = pts.length
    let d = `M${pts[0].map((v) => v.toFixed(1)).join(' ')}`
    for (let i = 0; i < n; i++) {
      const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]]
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
      d += `C${[...c1, ...c2, ...p2].map((v) => v.toFixed(1)).join(' ')}`
    }
    return d + 'Z'
  }
  const band = (pts) => `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z`
  const outline = curve([
    [332, 322], upper(0, -23), upper(0.14, -23), upper(0.45, -20.5), upper(0.7, -19), at(crook, u, -8), at(crook, f, 8),
    fore(0.45, 18.5), fore(0.8, 16), fore(1, 14.5), fore(1, -14.5), fore(0.6, -19), fore(0.18, -21),
    point, upper(1, 17.5), upper(0.6, 19), upper(0.25, 20.5), upper(0, 21),
  ])
  await painting(`
    <path d="${outline}" fill="${tones.mid}"/>
    <path d="${band([upper(0.04, -22), upper(0.14, -22.5), upper(0.45, -20), upper(0.68, -18.5), upper(0.68, -9), upper(0.45, -10), upper(0.14, -12), upper(0.04, -11)])}" fill="${tones.lit}"/>
    <path d="${band([fore(0.35, 17.5), fore(0.8, 15.5), fore(1, 14), fore(1, 5), fore(0.8, 6), fore(0.35, 8)])}" fill="${tones.lit}"/>
    <path d="${band([fore(0.1, -20.5), fore(0.6, -18.5), fore(1, -14), fore(1, -7), fore(0.6, -10), fore(0.1, -12)])}" fill="${tones.shade}"/>
    <path d="${band([upper(0.35, 20), upper(0.7, 18.5), upper(1, 17.5), point, upper(1, 6), upper(0.7, 8), upper(0.35, 10)])}" fill="${tones.shade}"/>`, (i) => !mask[i])
  // The hand, sized to his other hand and drawn fingers up from the wrist,
  // turned to carry straight on from the forearm: the palm, swelling at the
  // base of the thumb; the thumb and the shorter pinky spread from it,
  // tapering; and the other three fingers curled down over it, with creases of
  // shade between them and under their tips. The thumb's side (+x here) is on
  // top, lit like the top of the forearm, and the pinky's side is in shade
  // like its underside.
  // A finger from `base`, `deg` off straight up toward the thumb, tapering from
  // half width w0 to w1; with `side` only that half of it, from its middle
  const digit = (base, deg, len, w0, w1, side = 0) => {
    const d = dir(deg - 90)
    const n = dir(deg)
    const p = (t, w) => at(at(base, d, len * t), n, w)
    const half = (s) => [p(0, s * w0), p(0.5, (s * (w0 + w1)) / 2), p(1, s * w1), at(p(1, s * w1 * 0.5), d, w1 * 0.85)]
    if (side) return curve([p(0, 0), p(0.5, 0), at(p(1, 0), d, w1 * 0.95), ...half(side).reverse()])
    return curve([...half(-1), at(p(1, 0), d, w1), ...half(1).reverse()])
  }
  const thumb = [[16, -20], 55, 36, 7.5, 6]
  const pinky = [[-15, -40], -35, 29, 5.6, 4.6]
  // A curled finger across x0–x1, its knuckle at `top`, and the strip of it
  // toward the thumb that catches the light
  const knuckle = (x0, x1, top) => {
    const m = (x0 + x1) / 2
    return {
      finger: curve([[x0 + 1, -31], [x0, -44], [x0 + 1.5, top + 3.5], [m, top], [x1 - 1.5, top + 3.5], [x1, -44], [x1 - 1, -31], [m, -28]]),
      edge: curve([[x1 - 3.2, -32], [x1 - 3.4, -44], [x1 - 3, top + 4.5], [x1 - 1.4, top + 3.5], [x1, -44], [x1 - 1, -32]]),
    }
  }
  const curled = [knuckle(-12.5, -3.6, -58), knuckle(-1.4, 7.4, -61), knuckle(9.6, 18.6, -58)]
  const [wx, wy] = wrist.map((v) => v.toFixed(1))
  await painting(`<g transform="translate(${wx} ${wy}) rotate(-120)">
    <path d="${digit(...thumb)}" fill="${tones.mid}"/>
    <path d="${digit(...thumb, 1)}" fill="${tones.lit}"/>
    <path d="${digit(...pinky)}" fill="${tones.mid}"/>
    <path d="${digit(...pinky, 1)}" fill="${tones.lit}"/>
    <path d="${curve([[-15, 2], [-18, -14], [-20, -30], [-18, -42], [-8, -46], [6, -46], [17, -43], [20, -32], [23, -18], [18, -4], [14, 2]])}" fill="${tones.mid}"/>
    <path d="${curve([[7, 2], [14, 2], [18, -4], [23, -18], [20, -32], [17, -42], [11, -40], [12, -26], [10, -12]])}" fill="${tones.lit}"/>
    <path d="${curve([[-15, 2], [-18, -14], [-20, -30], [-18, -42], [-12, -41], [-13, -28], [-11, -12], [-8, 2]])}" fill="${tones.shade}"/>
    <path d="${curve([[-14, -28], [-15, -46], [-13, -57], [-8, -59.5], [-2.5, -57], [3, -62], [8.5, -58], [14, -59.5], [18.5, -55], [19.8, -42], [18.5, -27.5], [2, -25.5]])}" fill="${tones.shade}"/>
    ${curled.map(({ finger, edge }) => `<path d="${finger}" fill="${tones.mid}"/><path d="${edge}" fill="${tones.lit}"/>`).join('')}
  </g>`)

  // 3. His bib, medal and lanyard come off, and his La Sportiva singlet is
  //    printed in its own design, whole where they hid it. Where the ribbons
  //    crossed his chest inside the scoop neck, the skin is filled in from
  //    around it.
  const ribbons = new Uint8Array(W * H)
  for (const points of [
    [[346, 311], [368, 312], [362, 400], [360, 461], [339, 462], [333, 400]],
    [[412, 305], [436, 307], [419, 400], [406, 466], [378, 465], [392, 397]],
  ]) (await poly(points)).forEach((v, i) => v && mask[i] && (ribbons[i] = 1))
  const scoop = await poly([[352, 300], [361, 316], [365, 332], [371, 345], [390, 353], [409, 349], [417, 336], [421, 318], [426, 300]])
  inpaint(Uint8Array.from(ribbons, (v, i) => v & scoop[i]), Uint8Array.from(mask, (v, i) => v & !ribbons[i] & scoop[i] & isSkin(i)), 1500)
  // All of his torso but the scoop is the singlet. Only along its edges, where
  //    his arms meet it, does skin stay, told from the print's yellows by hue.
  //    On both shoulders the jersey runs on over the top of the shoulder, its
  //    edge one line with the shoulder's, and the armhole curves down from it
  //    to the armpit.
  const torso = await poly([[306, 346], [314, 328], [330, 314], [357, 308], [426, 300], [446, 308], [488, 320], [500, 327], [497, 336], [489, 360], [492, 420], [500, 470], [510, 546], [510, 612], [338, 612], [336, 520], [330, 440]])
  const inner = await poly([
    [316, 331], [326, 324], [336, 318], [357, 312], [426, 304], [446, 311], [466, 317], [485, 323], [497, 328.5],
    [494, 334], [488, 342], [482, 352], [477, 362], [480, 420], [488, 470], [498, 546], [498, 612], [350, 612], [348, 520],
    [342, 440], [344, 360], [331, 362], [326, 352], [320, 340],
  ])
  const skinTone = (i) => {
    const [r, g, b] = [img[i * 3], img[i * 3 + 1], img[i * 3 + 2]]
    return r > g && g > b && b > 0.48 * r && g > 0.55 * r && r > 60
  }
  // The singlet's design, in its inks from the photo: black, with a yellow
  //    stripe across each shoulder from the neck to the armhole, as the photo
  //    shows them where the lanyard and his friend's hand don't hide them,
  //    LA SPORTIVA and its peak rising
  //    across the chest, and below them facets from maroon through orange to
  //    yellow at the hem, their edge sloping down to his right as in the photo
  const PRINT = { maroon: [128, 44, 36], red: [208, 98, 40], orange: [224, 142, 48], gold: [226, 176, 30], pale: [239, 210, 118] }
  const css = (c) => `rgb(${c})`
  const jag = (yl, yr, j) => [320, 342, 364, 386, 408, 430, 452, 474, 496, 518].map((x, k) => [x, yl + ((yr - yl) * (x - 330)) / 175 + (k % 2 ? j : -j)])
  const facet = (pts, c) => `<path d="M${pts.map((p) => p.join(' ')).join('L')}Z" fill="${css(c)}"/>`
  const bands = [[505, 432, PRINT.maroon], [524, 456, PRINT.red], [540, 484, PRINT.orange], [557, 522, PRINT.gold]]
  const stripe = (pts) => `<path d="M${pts.map((p) => p.join(' ')).join('L')}" fill="none" stroke="${css(PRINT.gold)}" stroke-width="2.4"/>`
  const design = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="100%" height="100%" fill="${css(SINGLET)}"/>
    ${bands.map(([yl, yr, c], k) => facet([...jag(yl, yr, 2.5 + k), [518, 640], [320, 640]], c)).join('')}
    ${facet([[440, 470], [472, 457], [456, 482]], PRINT.maroon)}${facet([[466, 500], [500, 486], [494, 514]], PRINT.red)}
    ${facet([[396, 562], [440, 549], [424, 576]], PRINT.orange)}${facet([[352, 590], [392, 568], [398, 598]], PRINT.pale)}
    ${facet([[430, 604], [470, 574], [482, 604]], PRINT.pale)}${facet([[338, 548], [362, 540], [352, 562]], PRINT.red)}
    ${stripe([[362, 322], [348, 333], [335, 343], [318, 356]])}
    ${stripe([[422, 314], [434, 321], [450, 332], [468, 338], [490, 344]])}
    <path d="M420 421L448 400L476 418" fill="none" stroke="${css(PRINT.maroon)}" stroke-width="1.6"/>
    ${facet([[437, 418], [448, 405], [459, 418]], PRINT.gold)}
    <text x="339" y="467" transform="rotate(-32 339 467)" font-family="Helvetica Neue" font-weight="bold" font-size="16.5" letter-spacing="0.4" fill="${css(PRINT.gold)}">LA SPORTIVA</text>
  </svg>`)).removeAlpha().raw().toBuffer()
  // Each pixel takes the nearer of the two inks it's best explained as a blend
  //    of, so the antialiased edge of the yellow piping on black doesn't snap
  //    to the maroon that happens to lie between them
  const inks = [SINGLET, ...Object.values(PRINT)]
  const blendOf = (c) => {
    let best = inks[0]
    let err = Infinity
    for (let a = 0; a < inks.length; a++) {
      for (let b = a + 1; b < inks.length; b++) {
        const [p, q] = [inks[a], inks[b]]
        const d = [0, 1, 2].map((k) => p[k] - q[k])
        const t = Math.min(1, Math.max(0, d.reduce((s, v, k) => s + v * (c[k] - q[k]), 0) / d.reduce((s, v) => s + v * v, 0)))
        const e = [0, 1, 2].reduce((s, k) => s + (c[k] - (q[k] + t * d[k])) ** 2, 0)
        if (e < err) [err, best] = [e, t >= 0.5 ? p : q]
      }
    }
    return best
  }
  for (let i = 0; i < W * H; i++) {
    if (!torso[i] || !mask[i] || scoop[i]) continue
    if (inner[i] || ribbons[i] || !skinTone(i)) stamp(i, blendOf(design.subarray(i * 3, i * 3 + 3)))
  }

  // The water bottle, painted where it shows between his fingers
  await painting(`
    <path d="M523 641Q523 633 531 633L549 633Q557 633 557 641L557 698Q557 705 550 705L530 705Q523 705 523 698Z" fill="rgb(196,212,222)"/>
    <path d="M528 638L534 638L534 702L528 702Z" fill="rgb(232,240,245)"/>
    <path d="M523 655L557 655L557 675L523 675Z" fill="rgb(46,125,181)"/>
    <path d="M531 617L550 617L551 633L530 633Z" fill="rgb(238,241,243)"/>`, (i) => !(mask[i] && isSkin(i) && img[i * 3] > 120), true)

  // 4. The photo stops at his ankles, just below the heel collars of his race
  //    shoes, which are blue; his socks are black, as his photo on the bridge
  //    shows. Put him in Cliftons: his right foot where its collar shows, toes
  //    turned out, his left its mirror, lower where its own collar shows.
  //    His left leg runs on past the photo's edge into its shoe.
  for (let i = H0 * W; i < W * H; i++) mask[i] = 0
  const legs = await svgMask('<path d="M527 920L556 920L556 946L527 946Z" fill="#fff"/>')
  for (let i = (H0 - 1) * W; i < W * H; i++) if (legs[i]) mask[i] = 1
  const feet = [clifton(398, 936, 1, shoes), clifton(542, 960, -1, shoes)]
  const onLeg = (i) => mask[i] && isSkin(i)
  const shoeInks = Object.values(shoes).map((c) => c.match(/\d+/g).map(Number))
  // Behind his legs, then the socks on them, then in front below the collars
  await painting(feet.map((s) => s.body).join(''), (i) => !onLeg(i), true, shoeInks)
  await painting(feet.map((s) => `<path d="${s.sock}" fill="rgb(${SINGLET})"/>`).join(''), onLeg, true)
  for (const s of feet) {
    const below = await svgMask(`<path d="${s.below}" fill="#fff"/>`)
    await painting(s.body, (i) => below[i], true, shoeInks)
  }

  // His hair, as the photo has it, pulled through the opening above the
  // strap: warm-toned pixels there, and above the crown the dark strands that
  // stand out from the pale gray behind him. It's too near his skin's color to
  // get inks of its own, so it prints in three light browns by how light the
  // photo is there, softened a little, keeping the photo's own strands. The
  // gray of the cap inside the opening goes black. Then the top of his cap,
  // which the mask cut off above the strap, around it. The strap prints black
  // through its buckle, which caught the light in the photo and read as a gap.
  // The right side of the cap, from the strap's tail down to just above his
  // ear, was sunlit gray against the gray behind him, so the mask lost most of
  // it: it's filled in black out to its edge in the photo, leaving his skin.
  const hairArea = await poly([[367, 201], [368, 190], [374, 182], [382, 175], [394, 172], [404, 175], [410, 186], [411, 201]])
  const soft = await sharp(photoPx, { raw: { width: W, height: H, channels: 3 } }).blur(0.8).raw().toBuffer()
  const HAIR = [[104, 80, 62], [158, 124, 94], [196, 164, 132]]
  const tone = new Int8Array(W * H).fill(-1)
  const lights = []
  for (let i = 0; i < W * H; i++) {
    if (!hairArea[i]) continue
    const [r, g, b] = [soft[i * 3], soft[i * 3 + 1], soft[i * 3 + 2]]
    const inside = ((i / W) | 0) >= 184
    if (r - b > 16) {
      tone[i] = 1
      lights.push([i, 0.3 * r + 0.59 * g + 0.11 * b])
    } else if (r + g + b < 300) tone[i] = inside ? 3 : 0
    else if (inside) tone[i] = 3
    else mask[i] = 0
  }
  // Warm pixels by lightness: the darkest third shade, the lightest third lit
  lights.sort((p, q) => p[1] - q[1])
  lights.forEach(([i], k) => (tone[i] = k < lights.length / 3 ? 0 : k < (lights.length * 2) / 3 ? 1 : 2))
  // A vote of each pixel's neighbors, so the tones don't speckle
  const voted = tone.slice()
  for (let i = 0; i < W * H; i++) {
    if (tone[i] < 0 || tone[i] === 3) continue
    const n = [0, 0, 0]
    for (const j of [i - W - 1, i - W, i - W + 1, i - 1, i, i + 1, i + W - 1, i + W, i + W + 1]) if (tone[j] >= 0 && tone[j] < 3) n[tone[j]]++
    voted[i] = n.indexOf(Math.max(...n))
  }
  for (let i = 0; i < W * H; i++) {
    if (voted[i] < 0) continue
    stamp(i, voted[i] === 3 ? SINGLET : HAIR[voted[i]])
    mask[i] = 1
  }
  await painting('<path d="M348 214C346 200 352 189 364 184L378 181L404 182C416 184 426 192 430 206L432 214Z" fill="rgb(30,32,37)"/>', (i) => !mask[i])
  const shape = (pts) => `M${pts.map((p) => p.join(' ')).join('L')}Z`
  // The left side of his cap, which the mask left ragged against the dark
  // behind it: trimmed to one curve down to the top of his ear, and filled in
  // from there to his head
  const capSide = [[352, 194], [349, 205], [347, 215], [346, 225], [345.5, 235], [346.5, 243]]
  const beside = await poly([[330, 194], ...capSide, [330, 243]])
  for (let i = 0; i < W * H; i++) if (beside[i]) mask[i] = 0
  await painting(`<path d="${shape([...capSide, [356, 243], [358, 194]])}" fill="rgb(30,32,37)"/>`, (i) => !mask[i])
  await painting('<rect x="367.5" y="200.5" width="5.5" height="10" fill="rgb(30,32,37)"/>', () => true, true)
  const grayish = (i) => Math.max(img[i * 3], img[i * 3 + 1], img[i * 3 + 2]) - Math.min(img[i * 3], img[i * 3 + 1], img[i * 3 + 2]) < 40
  const capRight = [[404, 199], [414, 195], [418, 186], [426, 195], [432, 205], [436, 216], [437, 226], [435, 234], [430, 236], [426, 230], [420, 220], [412, 212], [404, 208]]
  await painting(`<path d="${shape(capRight)}" fill="rgb(30,32,37)"/>`, (i) => !mask[i] || (!paint[i * 4 + 3] && (!isSkin(i) || grayish(i))), true)

  // His watch, black: the mask took its bright face for sky
  await painting(`
    <path d="M531 563L556 558L558 584L533 585Z" fill="rgb(30,32,37)"/>
    <ellipse cx="565" cy="571" rx="10" ry="14" fill="rgb(30,32,37)"/>`, () => true, true)

  // 5. His legs are in shade in the photo, darker and redder than his arms:
  //    shift their skin onto his arms' tones, matching mean and spread in Lab
  const skinOf = (keep) => {
    const px = []
    for (let i = 0; i < W * H; i++) if (mask[i] && !paint[i * 4 + 3] && isSkin(i) && keep(i % W, (i / W) | 0, i)) px.push(i)
    return px
  }
  const armSkin = skinOf((x, y, i) => y > 340 && y < 600 && (armArea[i] || x < sideAt(y)))
  // All of his legs below his shorts, whose hem rises to y 668 at the outsides
  // of his thighs, but not his hand on the bottle
  const legSkin = skinOf((x, y) => y >= 690 || (y >= 650 && x < 530))
  const stats = (px) => {
    const sum = [0, 0, 0]
    const sq = [0, 0, 0]
    for (const i of px) {
      const l = lab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2])
      for (let c = 0; c < 3; c++) {
        sum[c] += l[c]
        sq[c] += l[c] * l[c]
      }
    }
    const mean = sum.map((v) => v / px.length)
    return { mean, sd: sq.map((v, c) => Math.sqrt(v / px.length - mean[c] ** 2)) }
  }
  const armTone = stats(armSkin)
  const legTone = stats(legSkin)
  for (const i of legSkin) {
    const l = lab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2])
    const to = l.map((v, c) => armTone.mean[c] + (v - legTone.mean[c]) * Math.min(1.25, Math.max(0.8, armTone.sd[c] / legTone.sd[c])))
    img.set(rgbOf(to), i * 3)
  }

  const rgb = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H * 3; i++) rgb[i] = mask[(i / 3) | 0] ? Math.round(img[i]) : 255
  return { W, rgb, mask, paint, photoPx, feet: feet.map((s) => s.ground) }
}

// ---------------------------------------------------------------------------
// Separating inks

// Regions, in the photo's pixels
const HEAD = [[346, 184], [446, 184], [449, 250], [441, 290], [421, 313], [392, 320], [367, 312], [350, 288], [342, 240]]
const WHITE_OK = [
  [[512, 600], [570, 600], [570, 712], [512, 712]], // bottle
]
const TATTOO = [[355, 694], [408, 694], [408, 750], [355, 750]]
// Tight around the moose, below the hem of his shorts
const MOOSE = [[358, 700], [372, 698], [398, 698], [406, 706], [406, 748], [358, 748]]

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function lab(r, g, b) {
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const X = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047)
  const Y = f(0.2126 * R + 0.7152 * G + 0.0722 * B)
  const Z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]
}
function rgbOf([l, a, b]) {
  const fy = (l + 16) / 116
  const inv = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787)
  const [X, Y, Z] = [inv(fy + a / 500) * 0.95047, inv(fy), inv(fy - b / 200) * 1.08883]
  const g = (c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)))
  return [g(3.2406 * X - 1.5372 * Y - 0.4986 * Z), g(-0.9689 * X + 1.8758 * Y + 0.0415 * Z), g(0.0557 * X - 0.204 * Y + 1.057 * Z)]
}
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

let seed = 7
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32

// k-means++ in Lab, weighting hue over lightness by `chroma`
function kmeans(L, pix, K, chroma) {
  const d2 = (i, c) => (L[i * 3] - c[0]) ** 2 + chroma * ((L[i * 3 + 1] - c[1]) ** 2 + (L[i * 3 + 2] - c[2]) ** 2)
  const sample = Array.from({ length: Math.min(40000, pix.length) }, () => pix[(rand() * pix.length) | 0])
  const centers = [[...L.slice(sample[0] * 3, sample[0] * 3 + 3)]]
  while (centers.length < K) {
    const dist = sample.map((i) => Math.min(...centers.map((c) => d2(i, c))))
    let r = rand() * dist.reduce((a, b) => a + b, 0)
    let k = 0
    while ((r -= dist[k]) > 0) k++
    centers.push([...L.slice(sample[k] * 3, sample[k] * 3 + 3)])
  }
  for (let it = 0; it < 25; it++) {
    const sum = centers.map(() => [0, 0, 0, 0])
    for (const i of sample) {
      let best = 0
      for (let k = 1; k < K; k++) if (d2(i, centers[k]) < d2(i, centers[best])) best = k
      const s = sum[best]
      for (let c = 0; c < 3; c++) s[c] += L[i * 3 + c]
      s[3]++
    }
    sum.forEach((s, k) => s[3] && (centers[k] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]))
  }
  return { centers, d2 }
}

async function separate({ W: PW, rgb, mask: pmask, paint, photoPx }) {
  let x0 = PW, y0 = H, x1 = 0, y1 = 0
  for (let i = 0; i < PW * H; i++) {
    if (!pmask[i]) continue
    const x = i % PW
    const y = (i / PW) | 0
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  x0 -= 4; y0 -= 4; x1 += 4; y1 = Math.min(H - 1, y1 + 4)
  const cw = x1 - x0 + 1
  const ch = y1 - y0 + 1
  const W = cw * SCALE
  const HH = ch * SCALE
  const N = W * HH
  const crop = (buf, channels) => sharp(buf, { raw: { width: PW, height: H, channels } }).extract({ left: x0, top: y0, width: cw, height: ch })
  const src = await crop(rgb, 3).raw().toBuffer()
  const msrc = await crop(Buffer.from(pmask.map((v) => v * 255)), 1).extractChannel(0).raw().toBuffer()
  const mask = Uint8Array.from(await crop(Buffer.from(pmask.map((v) => v * 255)), 1).resize(W, HH, { kernel: 'cubic' }).blur(1.2).extractChannel(0).raw().toBuffer(), (v) => (v > 127 ? 1 : 0))

  // Edge-preserving smoothing at photo scale flattens skin and fabric texture
  // into even tones and keeps the edges between them; the head gets less
  function bilateral(px, r, ss, sr) {
    const o = Buffer.from(px)
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = y * cw + x
        if (msrc[i] < 128) continue
        let wsum = 0
        const acc = [0, 0, 0]
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx
            const yy = y + dy
            if (xx < 0 || yy < 0 || xx >= cw || yy >= ch || msrc[yy * cw + xx] < 128) continue
            const j = yy * cw + xx
            let dc = 0
            for (let c = 0; c < 3; c++) dc += (px[j * 3 + c] - px[i * 3 + c]) ** 2
            const w = Math.exp(-(dx * dx + dy * dy) / (2 * ss * ss) - dc / (2 * sr * sr))
            wsum += w
            for (let c = 0; c < 3; c++) acc[c] += w * px[j * 3 + c]
          }
        }
        for (let c = 0; c < 3; c++) o[i * 3 + c] = acc[c] / wsum
      }
    }
    return o
  }
  const up = (px) => sharp(px, { raw: { width: cw, height: ch, channels: 3 } }).resize(W, HH, { kernel: 'lanczos3' }).median(3).raw().toBuffer()
  const labOf = (px) => {
    const L = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) if (mask[i]) L.set(lab(px[i * 3], px[i * 3 + 1], px[i * 3 + 2]), i * 3)
    return L
  }
  const Lbody = labOf(await up(bilateral(bilateral(src, 4, 2.5, 24), 4, 2.5, 20)))
  const Lhead = labOf(await up(bilateral(src, 3, 1.6, 18)))

  async function region(points) {
    const d = 'M' + points.map(([x, y]) => `${(x - x0) * SCALE} ${(y - y0) * SCALE}`).join('L') + 'Z'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HH}"><rect width="100%" height="100%" fill="#000"/><path d="${d}" fill="#fff"/></svg>`
    return Uint8Array.from(await sharp(Buffer.from(svg)).greyscale().raw().toBuffer(), (v) => (v > 127 ? 1 : 0))
  }
  const head = await region(HEAD)
  const whiteOk = new Uint8Array(N)
  for (const p of WHITE_OK) (await region(p)).forEach((v, i) => v && (whiteOk[i] = 1))
  const tattooBox = await region(TATTOO)
  const mooseArea = await region(MOOSE)

  // Painted parts keep their colors; antialiased edge blends snap to the nearest
  const pr = await crop(paint, 4).resize(W, HH, { kernel: 'nearest' }).raw().toBuffer()
  const keyAt = (i) => (pr[i * 4] << 16) | (pr[i * 4 + 1] << 8) | pr[i * 4 + 2]
  const tally = new Map()
  for (let i = 0; i < N; i++) if (pr[i * 4 + 3] === 255) tally.set(keyAt(i), (tally.get(keyAt(i)) ?? 0) + 1)
  const paints = [...tally].filter(([, n]) => n >= 60 * SCALE * SCALE).map(([k]) => k)
  const far = (a, b) => ((a >> 16) - (b >> 16)) ** 2 + (((a >> 8) & 255) - ((b >> 8) & 255)) ** 2 + ((a & 255) - (b & 255)) ** 2
  const painted = new Int16Array(N).fill(-1)
  for (let i = 0; i < N; i++) {
    if (pr[i * 4 + 3] !== 255) continue
    const k = keyAt(i)
    painted[i] = paints.reduce((best, p, j) => (far(k, p) < far(k, paints[best]) ? j : best), 0)
  }

  // Inks: the body's, the head's own finer set, and the painted colors
  const bodyPix = []
  const headPix = []
  for (let i = 0; i < N; i++) if (mask[i] && painted[i] < 0) (head[i] ? headPix : bodyPix).push(i)
  const B = kmeans(Lbody, bodyPix, 14, 2.2)
  const Hd = kmeans(Lhead, headPix, 10, 1.4)
  const inks = [
    ...B.centers.map((c) => ({ rgb: rgbOf(c), lum: c[0] })),
    ...Hd.centers.map((c) => ({ rgb: rgbOf(c), lum: c[0], head: true })),
    ...paints.map((k) => ({ rgb: [k >> 16, (k >> 8) & 255, k & 255], lum: lab(k >> 16, (k >> 8) & 255, k & 255)[0] })),
  ]
  const PAINT0 = B.centers.length + Hd.centers.length
  const K = inks.length
  // Blown-out highlights on his skin stay skin; white is for the bottle and teeth
  const neutralLight = (c) => c[0] > 80 && Math.hypot(c[1], c[2]) < 9
  const label = new Int16Array(N).fill(-1)
  for (const i of bodyPix) {
    let best = -1
    B.centers.forEach((c, k) => {
      if (neutralLight(c) && !whiteOk[i]) return
      if (best < 0 || B.d2(i, c) < B.d2(i, B.centers[best])) best = k
    })
    label[i] = best
  }
  for (const i of headPix) {
    let best = 0
    for (let k = 1; k < Hd.centers.length; k++) if (Hd.d2(i, Hd.centers[k]) < Hd.d2(i, Hd.centers[best])) best = k
    label[i] = B.centers.length + best
  }
  const restamp = () => { for (let i = 0; i < N; i++) if (painted[i] >= 0 && mask[i]) label[i] = PAINT0 + painted[i] }
  restamp()

  // Clean up: majority filter, then fold small islands into their surroundings
  function majority(r, where) {
    const out = label.slice()
    const counts = new Int32Array(K)
    for (let i = 0; i < N; i++) {
      if (label[i] < 0 || !where(i)) continue
      const x = i % W
      const y = (i / W) | 0
      counts.fill(0)
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= W || yy >= HH) continue
          const l = label[yy * W + xx]
          if (l >= 0) counts[l]++
        }
      }
      let best = label[i]
      for (let k = 0; k < K; k++) if (counts[k] > counts[best]) best = k
      out[i] = best
    }
    label.set(out)
  }
  function islands(minBody, minHead) {
    const seen = new Uint8Array(N)
    const stack = []
    for (let s = 0; s < N; s++) {
      if (label[s] < 0 || seen[s]) continue
      const comp = []
      const nb = new Int32Array(K)
      stack.push(s)
      seen[s] = 1
      while (stack.length) {
        const j = stack.pop()
        comp.push(j)
        const x = j % W
        for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) {
          if (k < 0 || k >= N || label[k] < 0) continue
          if (label[k] !== label[s]) nb[label[k]]++
          else if (!seen[k]) {
            seen[k] = 1
            stack.push(k)
          }
        }
      }
      if (comp.length >= (head[s] ? minHead : minBody)) continue
      let best = -1
      for (let k = 0; k < K; k++) if (nb[k] && (best < 0 || nb[k] > nb[best])) best = k
      if (best >= 0) for (const j of comp) label[j] = best
    }
  }
  majority(2, (i) => !head[i])
  majority(2, (i) => !head[i])
  majority(1, (i) => head[i])
  for (let pass = 0; pass < 2; pass++) islands(18 * SCALE * SCALE, 3 * SCALE * SCALE)
  restamp()

  // The moose tattoo as it is in the photo: wherever the untouched photo,
  // enlarged, is gray and clearly darker than the skin right around it, which
  // a closing (max, then min) over his leg wide enough to span the moose's
  // body gives. The
  // posterized moose under it goes back to his skin, filled in from around it.
  const gray = inks.map(({ rgb }) => {
    const [l, a, b] = lab(...rgb)
    return l > 30 && Math.hypot(a, b) < 12
  })
  const moose = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    if (!tattooBox[i] || !mask[i]) continue
    if ((Lhead[i * 3] < 56 && Math.hypot(Lhead[i * 3 + 1], Lhead[i * 3 + 2]) < 24) || (label[i] >= 0 && gray[label[i]])) moose[i] = 1
  }
  let open = []
  for (let i = 0; i < N; i++) if (moose[i]) open.push(i)
  for (const i of open) label[i] = -2
  while (open.length) {
    const next = []
    const fills = []
    for (const i of open) {
      const k = [i - 1, i + 1, i - W, i + W].find((k) => k >= 0 && k < N && label[k] >= 0 && !moose[k])
      if (k === undefined) next.push(i)
      else fills.push([i, label[k]])
    }
    if (!fills.length) break
    for (const [i, l] of fills) {
      label[i] = l
      moose[i] = 0
    }
    open = next
  }
  const tattoo = new Uint8Array(N)
  {
    const big = await crop(photoPx, 3).resize(W, HH, { kernel: 'lanczos3' }).raw().toBuffer()
    let bx0 = W, by0 = HH, bx1 = 0, by1 = 0
    for (let i = 0; i < N; i++) {
      if (!mooseArea[i]) continue
      bx0 = Math.min(bx0, i % W); bx1 = Math.max(bx1, i % W); by0 = Math.min(by0, (i / W) | 0); by1 = Math.max(by1, (i / W) | 0)
    }
    const R = 8 * SCALE
    bx0 = Math.max(0, bx0 - R); by0 = Math.max(0, by0 - R); bx1 = Math.min(W - 1, bx1 + R); by1 = Math.min(HH - 1, by1 + R)
    const bw = bx1 - bx0 + 1
    const bh = by1 - by0 + 1
    const L = new Float32Array(bw * bh)
    const C = new Float32Array(bw * bh)
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const i = (by0 + y) * W + bx0 + x
        const [l, a, b] = lab(big[i * 3], big[i * 3 + 1], big[i * 3 + 2])
        L[y * bw + x] = mask[i] ? l : 0 // the pavement beside him isn't skin
        C[y * bw + x] = Math.hypot(a, b)
      }
    }
    // Running max or min along rows, then columns
    const pass = (src, pick) => {
      const rows = new Float32Array(bw * bh)
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          let v = src[y * bw + x]
          for (let d = Math.max(0, x - R); d <= Math.min(bw - 1, x + R); d++) v = pick(v, src[y * bw + d])
          rows[y * bw + x] = v
        }
      }
      const out = new Float32Array(bw * bh)
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          let v = rows[y * bw + x]
          for (let d = Math.max(0, y - R); d <= Math.min(bh - 1, y + R); d++) v = pick(v, rows[d * bw + x])
          out[y * bw + x] = v
        }
      }
      return out
    }
    const skinL = pass(pass(L, Math.max), Math.min)
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const i = (by0 + y) * W + bx0 + x
        if (mooseArea[i] && mask[i] && L[y * bw + x] < skinL[y * bw + x] - 13 && C[y * bw + x] < 26) tattoo[i] = 1
      }
    }
  }

  function dilate(bits, r) {
    const o = new Uint8Array(N)
    for (let i = 0; i < N; i++) {
      if (!bits[i]) continue
      const x = i % W
      const y = (i / W) | 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < HH) o[(y + dy) * W + x + dx] = 1
        }
      }
    }
    return o
  }
  async function trace(bits, turd) {
    const px = Buffer.alloc(N, 255)
    for (let i = 0; i < N; i++) if (bits[i]) px[i] = 0
    const png = await sharp(px, { raw: { width: W, height: HH, channels: 1 } }).png().toBuffer()
    const t = new potrace.Potrace({ turdSize: turd * SCALE * SCALE, optTolerance: 0.4, alphaMax: 1, threshold: 128 })
    await new Promise((res, rej) => t.loadImage(png, (err) => (err ? rej(err) : res())))
    const d = t.getPathTag().match(/ d="([^"]*)"/)?.[1] ?? ''
    const r1 = (n) => Math.round(n * 10) / 10
    return d
      .replace(/(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/g, (_, x, y) => `${r1(+x / SCALE + x0)} ${r1(+y / SCALE + y0)}`)
      .replace(/,?\s+/g, ' ')
      .replace(/\s*([MLCZ])\s*/g, '$1')
      .trim()
  }

  // The silhouette prints first in the darkest ink and shows as a thin
  // outline, each ink above it grown a pixel so neighbors meet without gaps
  const inner = Uint8Array.from(dilate(Uint8Array.from(mask, (v) => 1 - v), 3), (v) => 1 - v)
  const area = new Int32Array(K)
  for (let i = 0; i < N; i++) if (label[i] >= 0) area[label[i]]++
  const order = inks.map((ink, k) => ({ ...ink, k, area: area[k] })).filter((x) => x.area > 0)
  const darkest = order.reduce((a, b) => (b.lum < a.lum ? b : a))
  const layers = [{ color: hex(darkest.rgb), d: await trace(mask, 10) }]
  order.sort((a, b) => b.area - a.area)
  for (const ink of order) {
    const bits = Uint8Array.from(label, (l) => (l === ink.k ? 1 : 0))
    const grown = dilate(bits, 1)
    for (let i = 0; i < N; i++) grown[i] &= inner[i]
    const d = await trace(grown, ink.head ? 3 : 10)
    if (d) layers.push({ color: hex(ink.rgb), d })
  }
  layers.push({ color: '#3B3331', d: await trace(tattoo, 4) })
  return { box: [x0, y0, x1, y1], layers }
}

// ---------------------------------------------------------------------------

async function main() {
  const photo = process.argv[2]
  if (!photo) throw new Error('usage: npm run meadow:runner -- finish.jpg')
  await mkdir(WORK, { recursive: true })
  const prepared = await repair(photo, SHOES.atps)
  await sharp(prepared.rgb, { raw: { width: prepared.W, height: H, channels: 3 } }).png().toFile(fileURLToPath(new URL('repaired.png', WORK)))
  const { box: [x0, y0, x1, y1], layers } = await separate(prepared)

  // Where he stands: between his feet, which the shadow is drawn under
  const [[lx, ly], [rx, ry]] = prepared.feet
  // Each shoe ink tagged with its part, and every colorway's inks by part
  const hexOf = (c) => hex(c.match(/\d+/g).map(Number))
  const part = new Map(Object.entries(SHOES.atps).map(([k, c]) => [hexOf(c), k]))
  const inks = layers.map((l) => (part.has(l.color) ? { ...l, shoe: part.get(l.color) } : l))
  const shoes = Object.fromEntries(Object.entries(SHOES).map(([name, c]) => [name, Object.fromEntries(Object.entries(c).map(([k, v]) => [k, hexOf(v)]))]))
  const art = { x0, y0, x1, y1, footX: Math.round((lx + rx) / 2), footY: Math.round((ly + ry) / 2), shoes, inks }
  const union = (keys) => keys.map((k) => `'${k}'`).join(' | ')
  const parts = union(Object.keys(SHOES.atps))
  const type = `{ x0: number; y0: number; x1: number; y1: number; footX: number; footY: number; shoes: Record<${union(Object.keys(SHOES))}, Record<${parts}, string>>; inks: { color: string; d: string; shoe?: ${parts} }[] }`
  await writeFile(OUT, `// Generated by scripts/meadow/runner.mjs from Tripp's 2024 Milwaukee Lakefront Marathon finish photo. Do not edit by hand.\n\nexport const RUNNER_ART: ${type} = ${JSON.stringify(art)}\n`)

  // A preview, to check the print without the site
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" width="${(x1 - x0) * 2}" height="${(y1 - y0) * 2}"><rect x="${x0}" y="${y0}" width="100%" height="100%" fill="#9cc3e6"/>${layers.map((l) => `<path d="${l.d}" fill="${l.color}" fill-rule="evenodd"/>`).join('')}</svg>`
  await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('preview.png', WORK)))
  const bytes = layers.reduce((n, l) => n + l.d.length, 0)
  console.log(`${layers.length} inks, ${Math.round(bytes / 1024)} KB of paths → ${fileURLToPath(OUT)}`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
