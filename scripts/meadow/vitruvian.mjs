// Builds the homepage's Vitruvian Man in Tripp's AWS Golden Jacket: Leonardo's
// drawing (c. 1490, public domain) lifted off its paper as ink, then dressed
// the way a print is hand-colored. Only the man in front wears it, arms out
// level; the one behind him, arms raised, stays as Leonardo drew him. Its
// sleeves are those level arms as Leonardo drew them, washed in gold with
// ribbed cuffs at the wrists; its body, a gold bomber with a ribbed collar and
// waistband and a zipper, is drawn over his chest in lines to match his. It's
// all he wears,
// so his privates are taken out of the drawing below it. The jacket's shade
// is hatched in the drawing's ink, the way Leonardo shaded.
//
//   npm run meadow:vitruvian -- vitruve.jpg
//
// The scan is Luc Viatour's photograph of the drawing (Wikimedia Commons, "Da
// Vinci Vitruve Luc Viatour.jpg", 2258×3070), and everything below is placed
// in its pixels. It stays in .cache; only public/vitruvian.webp is committed,
// printed on the homepage's paper (PAPER), which its section matches.

import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CACHE } from './config.mjs'

const OUT = new URL('../../public/vitruvian.webp', import.meta.url)
const WORK = new URL('vitruvian/', CACHE)
// The circle and the square, with a little paper round them
const CROP = { left: 120, top: 280, width: 2000, height: 2010 }
const WIDTH = 1200 // as published
const PAPER = '#F3EAD6'

// Leonardo's ink, as it has browned
const INK = [92, 50, 26]
// The jacket's inks, from Tripp's photo in it: its gold, the gold in shade and
// in the light, and the duller gold of the ribbing
const GOLD = '#D5A93F'
const SHADE = '#A87E2A'
const SHINE = '#F4DE95'
const RIB = '#BC9538'

// Leonardo's circle, fitted to its ink, and his square. Only the ink inside
// them is kept, and above the figure only the circle itself, so his writing
// and the paper's marks round them go
const CIRCLE = { x: 1126.5, y: 1272, r: 965, band: 9 }
const SQUARE = { left: 316, top: 650, right: 1937, bottom: 2246 }
const WRITING = 615

// --- The ink ---

// Each pixel's brightest neighbor within r, which closes the drawing's lines
// over with the paper beside them
function brightest(src, W, H, r) {
  const across = new Uint8Array(W * H)
  const out = Buffer.alloc(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let m = 0
      for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k++) m = Math.max(m, src[y * W + k])
      across[y * W + x] = m
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let m = 0
      for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++) m = Math.max(m, across[k * W + x])
      out[y * W + x] = m
    }
  }
  return out
}

// How much ink is on the paper at each pixel: the green channel, where the
// brown ink is darkest against the yellowed paper, against the paper around it
// (the scan with its lines closed over), so the scan's uneven light and the
// paper's stains fall away. Its hatching comes through lighter than its
// contours, as it is; the paper's grain, lighter still, doesn't
async function inkOf(scan) {
  const { width: W, height: H } = CROP
  const one = { raw: { width: W, height: H, channels: 1 } }
  // (sharp hands a one-channel image back as three unless told to keep one)
  const green = await sharp(scan).extract(CROP).extractChannel('green').blur(0.6).raw().toBuffer()
  // The paper's own bright fibers are blurred away first, so its grain
  // doesn't read as ink
  const fibers = await sharp(green, one).blur(2).extractChannel(0).raw().toBuffer()
  const paper = await sharp(brightest(fibers, W, H, 5), one).blur(8).extractChannel(0).raw().toBuffer()
  const alpha = Buffer.alloc(W * H)
  for (let i = 0; i < W * H; i++) {
    const t = (1 - green[i] / Math.max(1, paper[i]) - 0.15) / 0.3
    alpha[i] = Math.round(255 * Math.min(1, Math.max(0, t)))
  }
  // And what specks are left, a pixel or two, go
  return sharp(alpha, one).median(3).extractChannel(0).raw().toBuffer()
}

const rgbaOf = (alpha, [r, g, b]) => {
  const { width: W, height: H } = CROP
  const out = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    out[i * 4] = r
    out[i * 4 + 1] = g
    out[i * 4 + 2] = b
    out[i * 4 + 3] = alpha[i]
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
}

// An SVG in the scan's pixels, the size of the crop
const svgOf = (body, defs = '') => {
  const { left, top, width, height } = CROP
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top} ${width} ${height}"><defs>${defs}</defs>${body}</svg>`,
  )
}

// One channel of a white-on-black SVG, 0 to 255
async function maskOf(body) {
  return sharp(svgOf(`<rect x="${CROP.left}" y="${CROP.top}" width="${CROP.width}" height="${CROP.height}" fill="#000"/>${body}`))
    .extractChannel('red')
    .raw()
    .toBuffer()
}

// Where Leonardo's circle runs through his writing above the figure: followed
// along its own ink, angle by angle (its darkest point near the fitted
// circle, the median of its neighbors so the writing across it doesn't pull
// it off), as a path to keep a narrow band of ink along
function arcOf(ink) {
  const { width: W } = CROP
  const { x, y, r } = CIRCLE
  const found = []
  for (let a = 200; a <= 340; a += 0.1) {
    const t = (a * Math.PI) / 180
    if (y + r * Math.sin(t) > WRITING + 40) continue
    let best = -1
    let at = r
    for (let d = -12; d <= 12; d += 0.5) {
      const px = Math.round(x + (r + d) * Math.cos(t)) - CROP.left
      const py = Math.round(y + (r + d) * Math.sin(t)) - CROP.top
      const v = ink[py * W + px]
      if (v > best) [best, at] = [v, r + d]
    }
    found.push([t, at])
  }
  const median = (k) => {
    const near = found.slice(Math.max(0, k - 60), k + 61).map((f) => f[1]).sort((p, q) => p - q)
    return near[near.length >> 1]
  }
  return found.map(([t], k) => [x + median(k) * Math.cos(t), y + median(k) * Math.sin(t)])
}

// --- Shapes ---

const pts = (p) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
const poly = (p, attrs = '') => `<polygon points="${pts(p)}" ${attrs}/>`
const lerp = ([ax, ay], [bx, by], t) => [ax + (bx - ax) * t, ay + (by - ay) * t]

// A polyline resampled to n points evenly along its length
function resample(line, n) {
  const d = [0]
  for (let i = 1; i < line.length; i++) d.push(d[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]))
  const total = d[d.length - 1]
  const out = []
  for (let k = 0; k < n; k++) {
    const s = (total * k) / (n - 1)
    let i = 1
    while (i < d.length - 1 && d[i] < s) i++
    out.push(lerp(line[i - 1], line[i], (s - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1])))
  }
  return out
}

// --- The arms, as Leonardo drew them ---

// Each from the wrist to the shoulder: its upper contour and its lower, how
// far up the arm the cuff runs (Leonardo drew it on his left arm), and whether
// it's in the jacket: the level arms are, the raised ones, the man behind,
// aren't
const ARMS = [
  {
    // His left arm, out level
    upper: [[497, 930], [537, 930], [587, 923], [637, 923], [677, 928], [720, 935], [743, 940], [787, 933], [837, 935], [860, 935], [887, 918], [917, 912], [965, 905]],
    lower: [[497, 983], [537, 987], [603, 1002], [670, 1005], [723, 997], [770, 995], [837, 1002], [903, 1008], [937, 1012], [965, 1045]],
    cuff: 0.085,
    sleeve: true,
  },
  {
    // Raised
    upper: [[513, 722], [523, 730], [570, 752], [620, 767], [670, 777], [710, 790], [737, 803], [750, 820], [760, 828], [803, 837], [853, 850], [887, 862], [920, 866], [952, 880], [990, 902]],
    lower: [[500, 786], [553, 810], [603, 837], [653, 860], [703, 877], [737, 885], [787, 900], [837, 920], [860, 933], [903, 947], [937, 963], [965, 1000]],
    cuff: 0.085,
    sleeve: false,
  },
  {
    // His right arm, out level
    upper: [[1758, 924], [1718, 926], [1664, 925], [1610, 922], [1556, 927], [1509, 937], [1473, 929], [1437, 927], [1405, 930], [1387, 918], [1358, 907], [1315, 903], [1262, 904]],
    lower: [[1758, 981], [1736, 983], [1682, 990], [1628, 1004], [1574, 1006], [1516, 997], [1466, 995], [1412, 997], [1358, 1001], [1304, 1017], [1264, 1045]],
    cuff: 0.085,
    sleeve: true,
  },
  {
    // Raised
    upper: [[1735, 716], [1729, 717], [1682, 735], [1646, 751], [1610, 760], [1574, 771], [1531, 792], [1502, 810], [1473, 828], [1430, 839], [1394, 850], [1369, 862], [1322, 855], [1290, 864], [1258, 884], [1236, 902]],
    lower: [[1752, 772], [1718, 789], [1682, 810], [1646, 832], [1610, 850], [1556, 872], [1502, 882], [1448, 900], [1405, 929], [1358, 952], [1322, 981], [1264, 1038]],
    cuff: 0.085,
    sleeve: false,
  },
]

const N = 60
const SLEEVES = ARMS.filter((arm) => arm.sleeve).map(({ upper, lower, cuff }) => {
  const U = resample(upper, N)
  const L = resample(lower, N)
  // Across the sleeve at f (0 its upper contour, 1 its lower) from t0 to t1 of its length
  const across = (f, t0 = 0, t1 = 1) => U.map((u, i) => lerp(u, L[i], f)).filter((_, i) => i / (N - 1) >= t0 && i / (N - 1) <= t1)
  const strip = (f0, f1, t0 = 0, t1 = 1) => [...across(f0, t0, t1), ...across(f1, t0, t1).reverse()]
  const k = Math.round(cuff * (N - 1))
  // The cuff, a little fuller than the wrist, ribbed along the arm
  const puff = (p, q, s) => lerp(p, q, -s)
  const band = [puff(U[0], L[0], 0.04), puff(U[k], L[k], 0.06), puff(L[k], U[k], 0.06), puff(L[0], U[0], 0.04)]
  const ribs = Array.from({ length: 7 }, (_, r) => {
    const f = (r + 1) / 8
    return [lerp(band[0], band[3], f), lerp(band[1], band[2], f)]
  })
  return {
    whole: [...U, ...[...L].reverse()],
    band,
    ribs,
    cuffLine: [band[1], band[2]],
    shade: strip(0.6, 1.02, cuff, 1),
    hatch: strip(0.74, 1.02, cuff + 0.03, 0.97),
    shine: strip(0.16, 0.3, cuff + 0.06, 0.9),
    // Folds where the sleeve gathers above its cuff and at the elbow
    folds: [
      [lerp(U[k + 3], L[k + 3], 0.25), lerp(U[k + 6], L[k + 6], 0.5), lerp(U[k + 4], L[k + 4], 0.75)],
      [lerp(U[k + 8], L[k + 8], 0.15), lerp(U[k + 11], L[k + 11], 0.45)],
      [lerp(U[30], L[30], 0.55), lerp(U[34], L[34], 0.85)],
      [lerp(U[32], L[32], 0.1), lerp(U[35], L[35], 0.35)],
    ],
  }
})

// The jacket's body, collar to waistband: boxy, a little roomier than he is,
// bloused over its band
const BODY = [
  [1050, 898], [1000, 903], [962, 906], [960, 1000], [957, 1048], [951, 1120], [948, 1200], [953, 1262], [972, 1288],
  [1270, 1288], [1289, 1262], [1294, 1200], [1291, 1120], [1286, 1046], [1284, 1000], [1281, 906], [1240, 903], [1192, 898],
]
const BAND = [[968, 1284], [1274, 1284], [1272, 1336], [970, 1336]]
const COLLAR = [[1054, 866], [1186, 866], [1196, 904], [1160, 918], [1121, 922], [1082, 918], [1046, 904]]
// He wears only the jacket, so his privates are taken out of the drawing
// below it, the way a statue's are smoothed: Leonardo's line across his hips
// is drawn back through, and his inner thighs meet where they were
const GROIN = [[1060, 1376], [1198, 1376], [1198, 1446], [1170, 1452], [1168, 1516], [1150, 1524], [1118, 1524], [1090, 1514], [1088, 1452], [1060, 1446]]
// Where his hair falls over the collar and his shoulders: printed back on top
const HAIR = [[958, 630], [1272, 630], [1276, 890], [1240, 902], [1192, 890], [1188, 862], [1052, 862], [1048, 890], [1006, 902], [956, 890]]

// Parallel strokes across a shape, at an angle, the way Leonardo shades
function hatching(id, shape, angle, gap, seed = 1) {
  const xs = shape.map((p) => p[0])
  const ys = shape.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const reach = Math.hypot(x1 - x0, y1 - y0) / 2 + 10
  const a = (angle * Math.PI) / 180
  const [dx, dy] = [Math.cos(a), Math.sin(a)]
  let r = seed * 9301
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280)
  let d = ''
  for (let o = -reach; o <= reach; o += gap) {
    const ox = cx - dy * (o + (rand() - 0.5) * gap * 0.4)
    const oy = cy + dx * (o + (rand() - 0.5) * gap * 0.4)
    const s = -reach * (0.9 + rand() * 0.1)
    const e = reach * (0.9 + rand() * 0.1)
    d += `M${(ox + dx * s).toFixed(1)},${(oy + dy * s).toFixed(1)}L${(ox + dx * e).toFixed(1)},${(oy + dy * e).toFixed(1)}`
  }
  return `<clipPath id="${id}"><polygon points="${pts(shape)}"/></clipPath><path d="${d}" clip-path="url(#${id})"/>`
}

const curve = (p) => `M${p[0][0]},${p[0][1]}` + (p.length === 3 ? `Q${p[1][0]},${p[1][1]} ${p[2][0]},${p[2][1]}` : p.slice(1).map((q) => `L${q[0]},${q[1]}`).join(''))

// The jacket's colors, printed under Leonardo's lines, and its own lines, over them
function jacket() {
  const s = SLEEVES
  const line = `fill="none" stroke="rgb(${INK})" stroke-linejoin="round" stroke-linecap="round" filter="url(#hand)"`
  const defs = `<filter id="hand" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.5" xChannelSelector="R" yChannelSelector="G"/></filter>`
  const torsoShade = [
    [[957, 1048], [951, 1120], [948, 1200], [953, 1262], [972, 1286], [1010, 1286], [996, 1220], [990, 1140], [992, 1070]],
    [[1286, 1046], [1291, 1120], [1294, 1200], [1289, 1262], [1270, 1286], [1236, 1286], [1248, 1220], [1254, 1140], [1252, 1066]],
    // Under the collar and where the body blouses over its band
    [[1060, 918], [1121, 930], [1182, 918], [1180, 940], [1121, 950], [1062, 940]],
    [[972, 1286], [1270, 1286], [1268, 1262], [1200, 1270], [1121, 1262], [1040, 1270], [975, 1262]],
  ]
  const shine = [
    // Down either side of the zipper, and across the shoulders
    `M1074,960 C1056,1040 1054,1150 1068,1226 C1072,1150 1074,1050 1084,964 Z`,
    `M1064,1180 C1062,1206 1064,1230 1070,1246 C1072,1228 1072,1206 1070,1184 Z`,
    `M1178,956 C1196,1030 1200,1110 1194,1190 C1204,1110 1202,1030 1188,958 Z`,
    `M985,930 C1010,918 1040,916 1060,922 L1056,936 C1036,932 1012,936 990,946 Z`,
    `M1256,930 C1232,918 1204,916 1184,922 L1188,936 C1208,932 1232,936 1252,946 Z`,
  ]
  const fills = svgOf(`
  <g fill="${GOLD}">
    ${poly(BODY)}
    ${s.map((v) => poly(v.whole)).join('')}
  </g>
  <g fill="${SHADE}">
    ${s.map((v) => poly(v.shade)).join('')}
    ${torsoShade.map((p) => poly(p)).join('')}
  </g>
  <g fill="${SHINE}">
    ${s.map((v) => poly(v.shine)).join('')}
    ${shine.map((d) => `<path d="${d}"/>`).join('')}
  </g>
  <g fill="${RIB}">
    ${poly(BAND)}
    ${poly(COLLAR)}
    ${s.map((v) => poly(v.band)).join('')}
  </g>`)
  const lines = svgOf(
    `
  <g stroke="rgb(${INK})" stroke-width="1.7" stroke-linecap="round" opacity="0.7" filter="url(#hand)">
    ${s.map((v, i) => hatching(`h${i}`, v.hatch, i % 2 ? -52 : 52, 8.5, i + 1)).join('')}
    ${hatching('ht0', torsoShade[0], 58, 8.5, 5)}
    ${hatching('ht1', torsoShade[1], -58, 8.5, 6)}
  </g>
  <!-- Where his privates were: the line across his hips, and his thighs meeting -->
  <g ${line} stroke-width="2.6" opacity="0.85">
    <path d="M1056,1440 L1202,1441"/>
    <path d="M1121,1524 C1128,1500 1150,1498 1160,1520"/>
    <path d="M1088,1480 C1104,1478 1120,1486 1130,1502"/>
  </g>

  <g ${line} stroke-width="3.6">
    <path d="M962,906 C1000,903 1030,899 1050,898"/>
    <path d="M1192,898 C1220,899 1250,903 1281,906"/>
    <path d="M957,1048 C951,1120 946,1200 953,1262 C957,1276 964,1284 972,1288"/>
    <path d="M1286,1046 C1291,1120 1296,1200 1289,1262 C1285,1276 1278,1284 1270,1288"/>
    ${poly(BAND)}
    ${poly(COLLAR)}
    ${s.map((v) => `<path d="${curve(v.cuffLine)}"/><path d="${curve(v.band)}"/>`).join('')}
  </g>
  <g ${line} stroke-width="2.2">
    <!-- Where the sleeves are set in -->
    <path d="M962,906 C975,950 972,1000 957,1048"/>
    <path d="M1281,906 C1268,950 1270,1000 1286,1046"/>
    ${s.map((v) => v.folds.map((f) => `<path d="${curve(f)}"/>`).join('')).join('')}
    <!-- The body's drape from the armpits, and where it gathers over the band -->
    <path d="M968,1060 C990,1090 1004,1120 1010,1160"/>
    <path d="M1276,1058 C1256,1088 1242,1120 1236,1160"/>
    ${[1000, 1046, 1084, 1160, 1198, 1240].map((x, i) => `<path d="M${x},1284 C${x + (i % 2 ? 4 : -4)},1270 ${x + (i % 2 ? -2 : 2)},1258 ${x},1248"/>`).join('')}
  </g>
  <g ${line} stroke-width="1.5" opacity="0.85">
    ${s.map((v) => v.ribs.map(([a, b]) => `<path d="M${a[0]},${a[1]}L${b[0]},${b[1]}"/>`).join('')).join('')}
    ${Array.from({ length: 30 }, (_, k) => `<path d="M${976 + k * 10},1288L${976 + k * 10},1333"/>`).join('')}
    ${Array.from({ length: 13 }, (_, k) => `<path d="M${1060 + k * 10},870L${1058 + k * 10.5},${906 + Math.abs(k - 6) * 1.2}"/>`).join('')}
  </g>
  <!-- The zipper, collar to waistband, and its pull -->
  <g ${line}>
    <path d="M1121,922 L1121,1336" stroke-width="3"/>
    <path d="M1121,928 L1121,1334" stroke-width="8" stroke-dasharray="1.6 5" opacity="0.7"/>
    <rect x="1113" y="924" width="16" height="32" rx="5" fill="${SHINE}" stroke-width="2.6"/>
  </g>
  <!-- The jacket's mark, over his heart -->
  <text x="1206" y="1000" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="34" fill="#FBF6EA" text-anchor="middle">aws</text>
`,
    defs,
  )
  return { fills, lines }
}

async function main() {
  const scan = process.argv[2]
  if (!scan) throw new Error('Usage: npm run meadow:vitruvian -- vitruve.jpg')
  await mkdir(WORK, { recursive: true })
  const { width: W, height: H } = CROP

  const ink = await inkOf(scan)

  // Leonardo's ink, less his writing above the figure and what's under the
  // jacket's body and the shorts; his hair over the collar, on its own
  const { x, y, r, band } = CIRCLE
  const sq = SQUARE
  const writing = await maskOf(
    `<rect x="${CROP.left}" y="${CROP.top}" width="${W}" height="${H}" fill="#fff"/>
    <circle cx="${x}" cy="${y}" r="${r + band}" fill="#000"/>
    <rect x="${sq.left}" y="${sq.top}" width="${sq.right - sq.left}" height="${sq.bottom - sq.top}" fill="#000"/>
    <rect x="${CROP.left}" y="${CROP.top}" width="${W}" height="${WRITING - CROP.top}" fill="#fff"/>
    <polyline points="${pts(arcOf(ink))}" fill="none" stroke="#000" stroke-width="${band}"/>`,
  )
  const covered = await maskOf(`<g fill="#fff">${poly(BODY)}${poly(COLLAR)}${poly(BAND)}${poly(GROIN)}</g>`)
  const hairMask = await maskOf(poly(HAIR, 'fill="#fff"'))
  const drawing = Buffer.alloc(W * H)
  const hair = Buffer.alloc(W * H)
  for (let i = 0; i < W * H; i++) {
    const keep = (255 - writing[i]) / 255
    drawing[i] = Math.round(ink[i] * keep * (1 - covered[i] / 255))
    hair[i] = Math.round(ink[i] * keep * (hairMask[i] / 255) * (covered[i] / 255))
  }

  const { fills, lines } = jacket()
  const art = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fills }, { input: await rgbaOf(drawing, INK) }, { input: lines }, { input: await rgbaOf(hair, INK) }])
    .png()
    .toBuffer()
  await sharp(art).toFile(fileURLToPath(new URL('art.png', WORK)))
  const info = await sharp(art).flatten({ background: PAPER }).resize(WIDTH).webp({ quality: 82, effort: 6 }).toFile(fileURLToPath(OUT))
  console.log(`Wrote ${fileURLToPath(OUT)}, ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`)
}

main()
