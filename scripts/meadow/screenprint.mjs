// What every screen print of Tripp shares, so the figures print alike: cutting
// him out of a photo with Apple's Vision framework, painting repairs into the
// photo's pixels, his Hoka Clifton 11s and his La Sportiva singlet, and
// separating the result into flat inks traced with potrace into SVG paths in
// the photo's pixels. The repairs each photo needs live in the scripts that
// use it: runner.mjs (the finish photo) and runner-bridge.mjs (the Hoan Bridge).

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import potrace from 'potrace'
import sharp from 'sharp'
import { CACHE } from './config.mjs'

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

// Vision's masks for a photo, 0–255: all the foreground together, which has
// crisp edges, and of the people it finds, the one under `at`
export async function segment(photo, dir, at) {
  const files = execFileSync(segmenter(), [photo, fileURLToPath(dir)], { encoding: 'utf8' }).trim().split('\n')
  const { width } = await sharp(photo).metadata()
  const gray = async (f) => sharp(f).greyscale().raw().toBuffer()
  const fg = await gray(files.find((f) => f.endsWith('fg.png')))
  let person = null
  let best = -1
  for (const f of files.filter((f) => /person-\d+\.png$/.test(f))) {
    const m = await gray(f)
    const v = m[at[1] * width + at[0]]
    if (v > best) [best, person] = [v, m]
  }
  return { fg, person }
}

// Crisp edges from the foreground mask, separated from the people around him
// by his own; where `fgOnly` is set, the foreground mask alone
export function cutout({ fg, person }, fgOnly = null) {
  const mask = new Uint8Array(fg.length)
  for (let i = 0; i < fg.length; i++) {
    const p = fgOnly?.[i] ? 1 : Math.min(1, Math.max(0, (person[i] / 255 - 0.3) / 0.3))
    mask[i] = (fg[i] / 255) * p > 0.5 ? 1 : 0
  }
  return mask
}

// Fills holes in a mask smaller than `max` pixels
export function fillHoles(mask, W, H, max) {
  const seen = new Uint8Array(W * H)
  const stack = []
  for (let s = 0; s < W * H; s++) {
    if (mask[s] || seen[s]) continue
    const comp = []
    let edge = false
    stack.push(s)
    seen[s] = 1
    while (stack.length) {
      const j = stack.pop()
      comp.push(j)
      const x = j % W
      if (x === 0 || x === W - 1 || j < W || j >= W * (H - 1)) edge = true
      for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) {
        if (k < 0 || k >= W * H || mask[k] || seen[k]) continue
        seen[k] = 1
        stack.push(k)
      }
    }
    if (!edge && comp.length < max) for (const j of comp) mask[j] = 1
  }
}

// Closes notches and slits in a mask narrower than 2r pixels: grown by a disc,
// then shrunk by it, within the mask's bounding box
export function close(mask, W, H, r) {
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let i = 0; i < W * H; i++) {
    if (!mask[i]) continue
    const x = i % W
    const y = (i / W) | 0
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  x0 = Math.max(0, x0 - r); y0 = Math.max(0, y0 - r); x1 = Math.min(W - 1, x1 + r); y1 = Math.min(H - 1, y1 + r)
  const disc = []
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) disc.push(dy * W + dx)
  // Grown, a pixel is set if any under the disc is; shrunk, only if all are
  const morph = (src, grow) => {
    const out = new Uint8Array(W * H)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x
        let v = !grow
        for (const d of disc) {
          if (!!src[i + d] !== grow) continue
          v = grow
          break
        }
        out[i] = v ? 1 : 0
      }
    }
    return out
  }
  mask.set(morph(morph(mask, true), false))
}

// ---------------------------------------------------------------------------
// Repairs, in the photo's pixels

// The tools for repairing a W×H photo, `img` as floats, with the figure in
// `mask`. Painted pixels, in `paint`, print in exactly their painted color.
export function canvas(img, mask, W, H) {
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
  const poly = (...polys) => svgMask(polys.map((points) => `<path d="M${points.map((p) => p.join(' ')).join('L')}Z" fill="#fff"/>`).join(''))
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

  // His skin, unpainted, where `keep(x, y, i)` allows
  const skinOf = (keep) => {
    const px = []
    for (let i = 0; i < W * H; i++) if (mask[i] && !paint[i * 4 + 3] && isSkin(i) && keep(i % W, (i / W) | 0, i)) px.push(i)
    return px
  }

  return { img, mask, paint, W, H, stamp, set, isSkin, svgMask, poly, painting, inpaint, skinOf }
}

// ---------------------------------------------------------------------------
// Color

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
export function lab(r, g, b) {
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const X = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047)
  const Y = f(0.2126 * R + 0.7152 * G + 0.0722 * B)
  const Z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]
}
export function rgbOf([l, a, b]) {
  const fy = (l + 16) / 116
  const inv = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787)
  const [X, Y, Z] = [inv(fy + a / 500) * 0.95047, inv(fy), inv(fy - b / 200) * 1.08883]
  const g = (c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)))
  return [g(3.2406 * X - 1.5372 * Y - 0.4986 * Z), g(-0.9689 * X + 1.8758 * Y + 0.0415 * Z), g(0.0557 * X - 0.204 * Y + 1.057 * Z)]
}
export const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

// The mean and spread in Lab of the pixels `px`
export function toneOf(img, px) {
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

// Shifts the pixels `px` onto the tone `to`, matching mean and spread in Lab
export function retone(img, px, to, from = toneOf(img, px)) {
  for (const i of px) {
    const l = lab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2])
    const v = l.map((v, c) => to.mean[c] + (v - from.mean[c]) * Math.min(1.25, Math.max(0.8, to.sd[c] / from.sd[c])))
    img.set(rgbOf(v), i * 3)
  }
}

let seed = 7
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32

// k-means++ in Lab, weighting hue over lightness by `chroma`
export function kmeans(L, pix, K, chroma) {
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

// ---------------------------------------------------------------------------
// His singlet

export const SINGLET = [30, 32, 37]

// The singlet's design, in its inks from the finish photo: black, with a
// yellow stripe across each shoulder from the neck to the armhole, LA
// SPORTIVA and its peak rising across the chest, and below them facets from
// maroon through orange to yellow at the hem, their edge sloping down to his
// right. It's drawn in the finish photo's pixels; `frame` is an SVG transform
// that carries it onto another photo, and `stripes` are the shoulder stripes
// in that photo's own pixels.
export const PRINT = { maroon: [128, 44, 36], red: [208, 98, 40], orange: [224, 142, 48], gold: [226, 176, 30], pale: [239, 210, 118] }
const STRIPES = [
  [[362, 322], [348, 333], [335, 343], [318, 356]],
  [[422, 314], [434, 321], [450, 332], [468, 338], [490, 344]],
]
export async function singletDesign(W, H, { frame = null, stripes = STRIPES } = {}) {
  const css = (c) => `rgb(${c})`
  const jag = (yl, yr, j) => [320, 342, 364, 386, 408, 430, 452, 474, 496, 518].map((x, k) => [x, yl + ((yr - yl) * (x - 330)) / 175 + (k % 2 ? j : -j)])
  const facet = (pts, c) => `<path d="M${pts.map((p) => p.join(' ')).join('L')}Z" fill="${css(c)}"/>`
  const bands = [[505, 432, PRINT.maroon], [524, 456, PRINT.red], [540, 484, PRINT.orange], [557, 522, PRINT.gold]]
  const stripe = (pts) => `<path d="M${pts.map((p) => p.join(' ')).join('L')}" fill="none" stroke="${css(PRINT.gold)}" stroke-width="2.4"/>`
  const g = frame ? `<g transform="${frame}">` : '<g>'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="100%" height="100%" fill="${css(SINGLET)}"/>
    ${g}
    ${bands.map(([yl, yr, c], k) => facet([...jag(yl, yr, 2.5 + k), [518, 640], [320, 640]], c)).join('')}
    ${facet([[440, 470], [472, 457], [456, 482]], PRINT.maroon)}${facet([[466, 500], [500, 486], [494, 514]], PRINT.red)}
    ${facet([[396, 562], [440, 549], [424, 576]], PRINT.orange)}${facet([[352, 590], [392, 568], [398, 598]], PRINT.pale)}
    ${facet([[430, 604], [470, 574], [482, 604]], PRINT.pale)}${facet([[338, 548], [362, 540], [352, 562]], PRINT.red)}
    </g>
    ${stripes.map(stripe).join('\n    ')}
    ${g}
    <path d="M420 421L448 400L476 418" fill="none" stroke="${css(PRINT.maroon)}" stroke-width="1.6"/>
    ${facet([[437, 418], [448, 405], [459, 418]], PRINT.gold)}
    <text x="339" y="467" transform="rotate(-32 339 467)" font-family="Helvetica Neue" font-weight="bold" font-size="16.5" letter-spacing="0.4" fill="${css(PRINT.gold)}">LA SPORTIVA</text>
    </g>
  </svg>`
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer()
}

// Each pixel takes the nearer of the two inks it's best explained as a blend
// of, so the antialiased edge of the yellow piping on black doesn't snap to
// the maroon that happens to lie between them
const SINGLET_INKS = [SINGLET, ...Object.values(PRINT)]
export function singletInk(c) {
  let best = SINGLET_INKS[0]
  let err = Infinity
  for (let a = 0; a < SINGLET_INKS.length; a++) {
    for (let b = a + 1; b < SINGLET_INKS.length; b++) {
      const [p, q] = [SINGLET_INKS[a], SINGLET_INKS[b]]
      const d = [0, 1, 2].map((k) => p[k] - q[k])
      const t = Math.min(1, Math.max(0, d.reduce((s, v, k) => s + v * (c[k] - q[k]), 0) / d.reduce((s, v) => s + v * v, 0)))
      const e = [0, 1, 2].reduce((s, k) => s + (c[k] - (q[k] + t * d[k])) ** 2, 0)
      if (e < err) [err, best] = [e, t >= 0.5 ? p : q]
    }
  }
  return best
}

// The SVG transform that carries points `from` onto points `to`, fit by
// least squares
export function affine(from, to) {
  // Normal equations for x' = a x + c y + e and y' = b x + d y + f
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  const vx = [0, 0, 0]
  const vy = [0, 0, 0]
  from.forEach(([x, y], k) => {
    const r = [x, y, 1]
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) M[i][j] += r[i] * r[j]
      vx[i] += r[i] * to[k][0]
      vy[i] += r[i] * to[k][1]
    }
  })
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  // By Cramer's rule
  const solve = (v) => [0, 1, 2].map((k) => det(M.map((row, i) => row.map((m, j) => (j === k ? v[i] : m)))) / det(M))
  const [a, c, e] = solve(vx)
  const [b, d, f] = solve(vy)
  return `matrix(${[a, b, c, d, e, f].map((v) => +v.toFixed(5)).join(' ')})`
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
export const SHOES = {
  atps: { light: 'rgb(200,193,189)', upper: 'rgb(171,162,156)', midsole: 'rgb(150,139,130)', shade: 'rgb(121,111,103)', outsole: 'rgb(86,77,71)', trim: 'rgb(96,98,102)' },
  white: { light: 'rgb(246,246,244)', upper: 'rgb(226,227,228)', midsole: 'rgb(236,236,235)', shade: 'rgb(196,198,201)', outsole: 'rgb(168,170,174)', trim: 'rgb(96,98,102)' },
}

// One shoe in `ink`s, seen from `tilt` degrees above, its toe turned `turn`
// degrees out, standing with the ground under its ankle at `at` in the photo,
// `px` photo pixels to the centimeter; `side` -1 mirrors it for his left foot.
// In a stride the foot also pitches, heel up by `pitch` degrees, and rolls
// onto its outer edge by `roll`, both about the ground under the ankle. Gives
// its shapes as SVG, the region below the collar (where the shoe is in front
// of his leg) and the sock above it. `H` is the photo's height.
export function clifton({ at: [ax, ay], side, turn: turnDeg, tilt: tiltDeg, px: PX, pitch = 0, roll = 0, H }, ink) {
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
  const turn = (turnDeg * Math.PI) / 180
  const tilt = (tiltDeg * Math.PI) / 180
  const [cp, sp] = [Math.cos((pitch * Math.PI) / 180), Math.sin((pitch * Math.PI) / 180)]
  const [cr, sr] = [Math.cos((roll * Math.PI) / 180), Math.sin((roll * Math.PI) / 180)]
  // v is toward his other foot
  const proj = ([u, v, z]) => {
    if (roll) [v, z] = [v * cr + z * sr, z * cr - v * sr]
    if (pitch) [u, z] = [u * cp + z * sp, z * cp - u * sp]
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

// Puts the shoes `feet` (from clifton) on him in `ink`s: behind his legs, then
// the black socks on them, then in front below the collars
export async function wear({ mask, isSkin, painting, svgMask }, feet, ink) {
  const onLeg = (i) => mask[i] && isSkin(i)
  const shoeInks = Object.values(ink).map((c) => c.match(/\d+/g).map(Number))
  await painting(feet.map((s) => s.body).join(''), (i) => !onLeg(i), true, shoeInks)
  await painting(feet.map((s) => `<path d="${s.sock}" fill="rgb(${SINGLET})"/>`).join(''), onLeg, true)
  for (const s of feet) {
    const below = await svgMask(`<path d="${s.below}" fill="#fff"/>`)
    await painting(s.body, (i) => below[i], true, shoeInks)
  }
}

// ---------------------------------------------------------------------------
// Separating inks

// The figure in `prepared`, cropped to `box` and scaled by `s`, so a photo
// that shows him larger prints at the same detail as one that shows him
// smaller. Gives what separate() needs to map its paths back to the photo.
export async function shrink({ W, H, rgb, mask, paint, photoPx }, [bx0, by0, bx1, by1], s) {
  const w = bx1 - bx0
  const h = by1 - by0
  const nw = Math.round(w * s)
  const nh = Math.round(h * s)
  const resize = (buf, channels, kernel) => sharp(buf, { raw: { width: W, height: H, channels } }).extract({ left: bx0, top: by0, width: w, height: h }).resize(nw, nh, { kernel }).raw().toBuffer()
  // His colors resized with the mask as alpha, so the white around him doesn't
  // bleed into his edges
  const rgba = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = rgb[i * 3 + c]
    rgba[i * 4 + 3] = mask[i] * 255
  }
  const small = await resize(rgba, 4, 'lanczos3')
  const out = { W: nw, H: nh, rgb: Buffer.alloc(nw * nh * 3, 255), mask: new Uint8Array(nw * nh), paint: await resize(paint, 4, 'nearest'), photoPx: await resize(photoPx, 3, 'lanczos3') }
  for (let i = 0; i < nw * nh; i++) {
    out.mask[i] = small[i * 4 + 3] > 127 ? 1 : 0
    if (out.mask[i]) for (let c = 0; c < 3; c++) out.rgb[i * 3 + c] = small[i * 4 + c]
  }
  return { prepared: out, origin: [bx0, by0], unit: 1 / s }
}

// `prepared` is the repaired photo: W×H rgb with him in `mask`, `paint` (rgba)
// holding pixels that must print in exactly their color, and `photoPx`, the
// photo as it was. Inks are separated and traced at `scale`× the photo. The
// regions are polygons in the photo's pixels: `head` gets its own finer inks,
// white is only allowed in `whiteOk`, and the tattoo is found in `tattoo.box`
// and traced from the photo in `tattoo.area`. A photo passed through shrink()
// gives its `origin` and `unit` to map everything back. `detail` trades the
// screen print's flat inks for a closer likeness of the photo; its defaults,
// POSTER, are the runner figures' print.
export const POSTER = {
  inks: { body: 14, head: 10 },
  // Bilateral passes before separating: radius, spatial and color spread
  smooth: { body: [[4, 2.5, 24], [4, 2.5, 20]], head: [[3, 1.6, 18]] },
  majority: { radius: 2, passes: 2 },
  islands: { body: 18, head: 3 }, // the smallest patch an ink keeps, in photo pixels
  turd: { body: 10, head: 3 },
  outline: true, // the silhouette in the darkest ink, showing as a thin rim
}
export async function separate({ W: PW, H, rgb, mask: pmask, paint, photoPx }, { scale: SCALE = 3, head: HEAD, whiteOk: WHITE_OK = [], tattoo: { box: TATTOO, area: MOOSE }, origin: [ox, oy] = [0, 0], unit = 1, detail = POSTER }) {
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
  const smoothed = (passes) => passes.reduce((px, [r, ss, sr]) => bilateral(px, r, ss, sr), src)
  const Lbody = labOf(await up(smoothed(detail.smooth.body)))
  const Lhead = labOf(await up(smoothed(detail.smooth.head)))

  async function region(points) {
    const d = 'M' + points.map(([x, y]) => `${((x - ox) / unit - x0) * SCALE} ${((y - oy) / unit - y0) * SCALE}`).join('L') + 'Z'
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
  const B = kmeans(Lbody, bodyPix, detail.inks.body, 2.2)
  const Hd = kmeans(Lhead, headPix, detail.inks.head, 1.4)
  const inks = [
    ...B.centers.map((c) => ({ rgb: rgbOf(c), lum: c[0] })),
    ...Hd.centers.map((c) => ({ rgb: rgbOf(c), lum: c[0], head: true })),
    ...paints.map((k) => ({ rgb: [k >> 16, (k >> 8) & 255, k & 255], lum: lab(k >> 16, (k >> 8) & 255, k & 255)[0] })),
  ]
  const PAINT0 = B.centers.length + Hd.centers.length
  const K = inks.length
  // Blown-out highlights on his skin stay skin; white is only where it's allowed
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
  for (let pass = 0; pass < detail.majority.passes; pass++) majority(detail.majority.radius, (i) => !head[i])
  majority(1, (i) => head[i])
  for (let pass = 0; pass < 2; pass++) islands(detail.islands.body * SCALE * SCALE, detail.islands.head * SCALE * SCALE)
  restamp()

  // The tattoo as it is in the photo: wherever the untouched photo, enlarged,
  // is gray and clearly darker than the skin right around it, which a closing
  // (max, then min) over his leg wide enough to span the tattoo gives. The
  // posterized tattoo under it goes back to his skin, filled in from around it.
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
      .replace(/(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/g, (_, x, y) => `${r1(ox + (+x / SCALE + x0) * unit)} ${r1(oy + (+y / SCALE + y0) * unit)}`)
      .replace(/,?\s+/g, ' ')
      .replace(/\s*([MLCZ])\s*/g, '$1')
      .trim()
  }

  // The silhouette prints first in the darkest ink and shows as a thin
  // outline, each ink above it grown a pixel so neighbors meet without gaps.
  // Without the outline, the inks run out to the silhouette's edge over it.
  const inner = detail.outline ? Uint8Array.from(dilate(Uint8Array.from(mask, (v) => 1 - v), 3), (v) => 1 - v) : mask
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
    const d = await trace(grown, ink.head ? detail.turd.head : detail.turd.body)
    if (d) layers.push({ color: hex(ink.rgb), d })
  }
  layers.push({ color: '#3B3331', d: await trace(tattoo, 4) })
  const [bx0, by0, bx1, by1] = [x0, y0, x1, y1].map((v, k) => Math.round((k % 2 ? oy : ox) + v * unit))
  return { box: [bx0, by0, bx1, by1], layers }
}

// ---------------------------------------------------------------------------
// The figure

// Writes the traced figure into a module exporting `name`, standing at `foot`
// in the photo's pixels, with its shoe inks tagged by part and every
// colorway's inks by part
export async function writeFigure(out, name, source, { box: [x0, y0, x1, y1], layers }, [footX, footY]) {
  const hexOf = (c) => hex(c.match(/\d+/g).map(Number))
  const part = new Map(Object.entries(SHOES.atps).map(([k, c]) => [hexOf(c), k]))
  const inks = layers.map((l) => (part.has(l.color) ? { ...l, shoe: part.get(l.color) } : l))
  const shoes = Object.fromEntries(Object.entries(SHOES).map(([name, c]) => [name, Object.fromEntries(Object.entries(c).map(([k, v]) => [k, hexOf(v)]))]))
  const art = { x0, y0, x1, y1, footX, footY, shoes, inks }
  const union = (keys) => keys.map((k) => `'${k}'`).join(' | ')
  const parts = union(Object.keys(SHOES.atps))
  const type = `{ x0: number; y0: number; x1: number; y1: number; footX: number; footY: number; shoes: Record<${union(Object.keys(SHOES))}, Record<${parts}, string>>; inks: { color: string; d: string; shoe?: ${parts} }[] }`
  await writeFile(out, `// Generated by ${source}. Do not edit by hand.\n\nexport const ${name}: ${type} = ${JSON.stringify(art)}\n`)
  const bytes = layers.reduce((n, l) => n + l.d.length, 0)
  console.log(`${layers.length} inks, ${Math.round(bytes / 1024)} KB of paths → ${fileURLToPath(out)}`)
}

// A preview, to check the print without the site
export async function preview([x0, y0, x1, y1], layers, file) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" width="${(x1 - x0) * 2}" height="${(y1 - y0) * 2}"><rect x="${x0}" y="${y0}" width="100%" height="100%" fill="#9cc3e6"/>${layers.map((l) => `<path d="${l.d}" fill="${l.color}" fill-rule="evenodd"/>`).join('')}</svg>`
  await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(file))
}
