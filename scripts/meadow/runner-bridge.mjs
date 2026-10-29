// Builds the second runner figure, on /me/bridge/, from Tripp's race photo
// crossing the Hoan Bridge at the 2024 Milwaukee Lakefront Marathon, as a
// screen print to match the finish-photo figure on /me (runner.mjs), from the
// same parts (screenprint.mjs): cut him out with Apple's Vision framework,
// take off his bib and print his La Sportiva singlet in its design, put him in
// the same Hoka Clifton 11s, posed in his stride, match his skin in the shade
// to his sunlit legs, and separate flat inks traced with potrace into
// src/lib/meadow/runner-bridge-art.ts. The photo shows him larger than the
// finish photo does, so he's printed at that photo's scale, for the same detail.
//
//   npm run meadow:runner-bridge -- bridge.jpg
//
// Every repair below is placed in that photo's pixels (4000×2656). The photo
// and the intermediate images stay in .cache; only the traced inks are committed.

import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CACHE } from './config.mjs'
import { affine, canvas, clifton, close, cutout, fillHoles, kmeans, lab, preview, retone, rgbOf, segment, separate, SHOES, shrink, SINGLET, singletDesign, singletInk, toneOf, wear, writeFigure } from './screenprint.mjs'

const OUT = new URL('../../src/lib/meadow/runner-bridge-art.ts', import.meta.url)
const WORK = new URL('bridge/', CACHE)
const FACE = [1505, 1440] // a point on his face, to pick him out of the runners behind
const AROUND = [1280, 1270, 1680, 2420] // the part of the photo he's in
const FINISH = 0.85 // his head and torso, in the finish photo, against this one
// His skin as it prints on the finish figure, in Lab, measured from
// runner.mjs's repaired image: his sunlit arms in that photo, which his legs
// there are matched to, and his face, pinker and in more shadow. His skin here
// is matched to them, so both print alike.
const FINISH_SKIN = { mean: [73.9, 12.1, 18.3], sd: [11.2, 6, 5.9] }
const FINISH_FACE = { mean: [65.1, 16, 13.6], sd: [16.8, 6.8, 3.4] }

// His race shoes, and the black socks above them. Vision's person mask keeps
// the bridge wall out of the halo around his head, but loses most of his white
// shoes against the road; there the foreground mask takes over.
const FEET = [
  [[1315, 2100], [1392, 2100], [1392, 2280], [1315, 2280]],
  [[1500, 2240], [1632, 2240], [1632, 2396], [1500, 2396]],
]
const SOCKS = [
  [[1333, 2128], [1378, 2128], [1378, 2170], [1333, 2170]],
  [[1530, 2266], [1570, 2266], [1570, 2296], [1530, 2296]],
]
// His left shoulder, which the masks cut ragged against the pale wall behind
const DELTOID = [[1566, 1474], [1585, 1480], [1596, 1492], [1599, 1506], [1599, 1526], [1597, 1542], [1592, 1555], [1585, 1556]]
// The shaded side of his face, where the masks keep a rim of that wall and
// lose bits of his cheek to it: beyond its edge, from his temple down his
// cheek and jaw to his neck, and a band inside it
const BEYOND_FACE = [[1557, 1352], [1590, 1352], [1590, 1480], [1545, 1480], [1536, 1466], [1544, 1448], [1551, 1430], [1555, 1410], [1557, 1385]]
const CHEEK = [[1535, 1352], [1557, 1352], [1557, 1385], [1555, 1410], [1551, 1430], [1544, 1448], [1536, 1466], [1522, 1466]]

// The singlet, generously: shoulder straps to the hem, which flares over the
// top of his shorts. Everything in it prints in the singlet's design except
// where skin is.
const TORSO = [
  [1418, 1462], [1540, 1460], [1566, 1468], [1584, 1500], [1594, 1525], [1598, 1555], [1599, 1585], [1592, 1603],
  [1578, 1608], [1573, 1625], [1572, 1672], [1578, 1700], [1588, 1735], [1595, 1770], [1600, 1800], [1580, 1825],
  [1540, 1842], [1500, 1848], [1460, 1840], [1420, 1828], [1402, 1855], [1370, 1852], [1362, 1800], [1366, 1720],
  [1348, 1700], [1360, 1680], [1418, 1652],
]
// Inside it, where skin meets the singlet: the scoop neck, both shoulders, his
// right forearm and fist across his chest, and his left wrist at its edge.
// There each pixel goes to whichever is nearer in color, skin or singlet.
const SKIN_EDGES = [
  [[1446, 1458], [1449, 1482], [1458, 1502], [1476, 1522], [1493, 1534], [1510, 1539], [1528, 1535], [1535, 1521], [1539, 1502], [1541, 1458]],
  [[1418, 1462], [1446, 1462], [1446, 1655], [1418, 1655]],
  [[1550, 1460], [1605, 1460], [1605, 1605], [1585, 1605], [1585, 1560], [1575, 1515], [1555, 1480]],
  [
    [1350, 1676], [1360, 1668], [1405, 1652], [1428, 1646], [1450, 1639], [1475, 1629], [1500, 1618], [1512, 1612],
    [1511, 1590], [1515, 1566], [1530, 1555], [1550, 1551], [1570, 1556], [1579, 1574], [1580, 1598], [1572, 1614],
    [1560, 1623], [1545, 1631], [1527, 1641], [1513, 1648], [1494, 1658], [1475, 1673], [1458, 1688], [1449, 1696],
    [1426, 1703], [1400, 1711], [1380, 1718], [1358, 1719], [1348, 1700],
  ],
  [[1566, 1600], [1605, 1600], [1605, 1690], [1566, 1690]],
]
// The middle of his neck, which is never the singlet
const NECK = [[1458, 1458], [1535, 1458], [1532, 1490], [1520, 1512], [1505, 1520], [1485, 1512], [1468, 1492]]
// Patches that are surely skin, for its colors: forearm, upper arm, neck,
// fist and left shoulder
const SKIN = [
  [[1395, 1672], [1450, 1655], [1500, 1628], [1500, 1640], [1450, 1669], [1395, 1688]],
  [[1382, 1540], [1415, 1540], [1415, 1630], [1382, 1630]],
  [[1470, 1480], [1520, 1480], [1515, 1515], [1485, 1515]],
  [[1525, 1570], [1560, 1568], [1562, 1595], [1525, 1598]],
  [[1576, 1485], [1588, 1490], [1590, 1520], [1578, 1518]],
]
// The singlet's design is drawn in the finish photo's pixels and carried
// onto this one by matching points: the bottom of the scoop neck, the tops of
// the straps at the neck, and the corners of the hem
const SINGLET_AT = {
  finish: [[390, 353], [357, 308], [426, 300], [338, 612], [510, 612]],
  bridge: [[1507, 1537], [1447, 1460], [1541, 1460], [1392, 1832], [1596, 1805]],
}
// Its shoulder stripes, as the photo shows them
const STRIPES = [
  [[1459, 1481], [1452, 1490], [1445, 1500], [1439, 1511]],
  [[1538, 1479], [1553, 1486], [1566, 1495], [1577, 1505]],
]

// His cap, worn backwards, down to its edge across his forehead, and his
// shorts, generously
const CAP = [[1430, 1290], [1575, 1290], [1575, 1352], [1558, 1350], [1540, 1347], [1520, 1347], [1500, 1352], [1480, 1366], [1460, 1378], [1445, 1388], [1430, 1388]]
const SHORTS = [[1350, 1790], [1612, 1790], [1612, 1852], [1560, 1852], [1512, 1858], [1505, 1880], [1500, 1900], [1488, 1922], [1470, 1935], [1420, 1935], [1390, 1918], [1350, 1885]]

// His feet in his stride, seen from 20° above, 5 photo pixels to the
// centimeter: his right foot behind him, heel up and toes pointing down at
// the road, and his left in front, about to land, toes turned out
const STRIDE = [
  { at: [1347, 2158], side: 1, tilt: 20, turn: 12, pitch: 85, px: 5.1 },
  { at: [1553, 2312], side: -1, tilt: 35, turn: 38, pitch: 16, px: 5 },
]
// Where he lands: the middle of the line from under his trailing toe to his
// leading foot, which the shadow is drawn along
const UNDER_TOE = [1360, 2300]

// Regions for the ink separation
const HEAD = [[1440, 1300], [1560, 1300], [1560, 1400], [1550, 1450], [1530, 1462], [1490, 1468], [1460, 1460], [1448, 1430], [1440, 1380]]
const TATTOO = [[1378, 1952], [1455, 1952], [1455, 2012], [1378, 2012]]
// Tight around the moose
const MOOSE = [[1382, 1955], [1452, 1955], [1452, 2008], [1382, 2008]]
// The tattoo is the same moose as on the finish figure, where the photo shows
// it sharply: its traced shape, from the corners of its box there to the
// corners of where this photo shows it, blurred
const FINISH_ART = new URL('../../src/lib/meadow/runner-art.ts', import.meta.url)
const MOOSE_AT = { finish: [[359.7, 700.5], [403.9, 747.2]], bridge: [[1387, 1958], [1440, 2005]] }

async function repair(photo, shoes) {
  const src = await sharp(photo).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = src.info.width
  const H = src.info.height
  const N = W * H
  const img = Float32Array.from(src.data)
  // The photo as it was, for tracing the tattoo's ink
  const photoPx = Buffer.from(src.data)
  const mask = new Uint8Array(N)
  const cv = canvas(img, mask, W, H)
  const { paint, stamp, isSkin, poly, painting, inpaint } = cv
  const labAt = (i) => lab(img[i * 3], img[i * 3 + 1], img[i * 3 + 2])
  // His skin, even in the blue shade, where it's bluer than it is red: what
  // isn't dark and is clearly red
  const skinAt = (i) => {
    const [l, a] = labAt(i)
    return l > 20 && a > 6
  }

  const feetBoxes = await poly(...FEET)
  mask.set(cutout(await segment(photo, WORK, FACE), feetBoxes))
  const deltoid = await poly(DELTOID)
  for (let i = 0; i < N; i++) if (deltoid[i]) mask[i] = 1
  fillHoles(mask, W, H, 300)
  close(mask, W, H, 3)
  // That side of his face is in shade, so inside its edge anything as pale
  // and gray as the wall, or missing, is filled in from his skin around it
  const beyond = await poly(BEYOND_FACE)
  for (let i = 0; i < N; i++) if (beyond[i]) mask[i] = 0
  const cheek = await poly(CHEEK)
  const wall = Uint8Array.from(cheek, (v, i) => {
    if (!v) return 0
    const [l, a, b] = labAt(i)
    return !mask[i] || (l > 62 && Math.hypot(a, b) < 10) || !skinAt(i) ? 1 : 0
  })
  inpaint(wall, Uint8Array.from(mask, (v, i) => v & !wall[i] & skinAt(i)), 400)
  for (let i = 0; i < N; i++) if (wall[i]) mask[i] = 1

  // A vote of each pixel's neighbors in `bits`, twice, where `where` allows,
  // so an edge between inks doesn't fray
  const vote = (bits, where) => {
    for (let pass = 0; pass < 2; pass++) {
      const out = bits.slice()
      for (let i = 0; i < N; i++) {
        if (!where(i)) continue
        let votes = 0
        let n = 0
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const j = i + dy * W + dx
            if (!mask[j]) continue
            votes += bits[j]
            n++
          }
        }
        out[i] = votes * 2 > n ? 1 : 0
      }
      bits.set(out)
    }
  }

  // 1. His bib comes off, and his singlet prints in its design. Where skin
  //    meets it, his skin's colors and the singlet's are found by k-means in
  //    Lab and each pixel goes to the nearer.
  const torso = await poly(TORSO)
  const edges = await poly(...SKIN_EDGES)
  const skinPatch = await poly(...SKIN)
  const L = new Float32Array(N * 3)
  const skinPix = []
  const singletPix = []
  for (let i = 0; i < N; i++) {
    if (!mask[i] || !(torso[i] || skinPatch[i])) continue
    L.set(labAt(i), i * 3)
    if (skinPatch[i]) skinPix.push(i)
    else if (!edges[i]) singletPix.push(i)
  }
  const skin = kmeans(L, skinPix, 4, 1)
  const fabric = kmeans(L, singletPix, 6, 1)
  const nearest = (i, km) => Math.min(...km.centers.map((c) => km.d2(i, c)))
  const singlet = new Uint8Array(N)
  const neck = await poly(NECK)
  for (let i = 0; i < N; i++) if (mask[i] && torso[i] && !neck[i]) singlet[i] = edges[i] && nearest(i, skin) <= nearest(i, fabric) ? 0 : 1
  vote(singlet, (i) => mask[i] && torso[i] && edges[i])
  const design = await singletDesign(W, H, { frame: affine(SINGLET_AT.finish, SINGLET_AT.bridge), stripes: STRIPES })
  for (let i = 0; i < N; i++) if (singlet[i]) stamp(i, singletInk(design.subarray(i * 3, i * 3 + 3)))

  // 2. His cap and shorts are black, but the sun and sky glaze them gray. The
  //    cap prints black all over; in the shorts' outline, what's dark or
  //    neutral does, which leaves the skin around them.
  const cap = await poly(CAP)
  for (let i = 0; i < N; i++) if (cap[i] && mask[i]) stamp(i, SINGLET)
  const shorts = await poly(SHORTS)
  const black = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    if (!shorts[i] || !mask[i] || paint[i * 4 + 3]) continue
    const [l, a, b] = labAt(i)
    black[i] = l < 38 || (a < 7 && Math.hypot(a, b) < 9) ? 1 : 0
  }
  vote(black, (i) => shorts[i] && mask[i] && !paint[i * 4 + 3])
  for (let i = 0; i < N; i++) if (black[i]) stamp(i, SINGLET)

  // His watch, black: the mask took its bright face for sky
  await painting('<path d="M1582 1624Q1590 1621 1594 1627L1596 1661Q1592 1668 1585 1665Z" fill="rgb(30,32,37)"/>', () => true, true)

  // 3. His race shoes come off, and the road the foreground mask took with
  //    them, all but his legs above his black socks and the socks, and he's
  //    put in Cliftons, posed in his stride
  for (const [k, box] of FEET.entries()) {
    const inBox = await poly(box)
    const sock = await poly(SOCKS[k])
    const top = Math.max(...SOCKS[k].map(([, y]) => y))
    for (let i = 0; i < N; i++) {
      if (!inBox[i] || !mask[i]) continue
      if (sock[i] && labAt(i)[0] < 35) stamp(i, SINGLET)
      else if (!(isSkin(i) && i < top * W)) mask[i] = 0
    }
  }
  const feet = STRIDE.map((pose) => clifton({ ...pose, H }, shoes))
  await wear(cv, feet, shoes)

  // 4. His skin, onto the finish figure's tone, matching mean and spread in
  //    Lab. His face, neck, arms and hands are in the blue shade of the open
  //    sky, darker and bluer than his sunlit legs, and go there by themselves.
  //    On his legs the shade of his body has soft edges, so there each pixel
  //    first moves onto his sunlit legs' tone as far as it's dark and blue,
  //    then his legs go together. Highlights, lighter still, are kept from
  //    blowing out to white.
  // The tattoo prints as the finish figure's moose, so the blurred one here
  //    is filled in from the skin around it: its gray ink and the blend of ink
  //    and skin around that
  const mooseArea = await poly(MOOSE)
  const ink = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    if (!mooseArea[i] || !mask[i]) continue
    const [l, a, b] = lab(photoPx[i * 3], photoPx[i * 3 + 1], photoPx[i * 3 + 2])
    if (l < 60 && Math.hypot(a, b) < 26) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) ink[i + dy * W + dx] = 1
  }
  inpaint(ink, Uint8Array.from(mask, (v, i) => v & !ink[i]), 400)
  // All of him that isn't printed in a paint is skin now, or his eyes,
  // brows, lips and stubble, which move with it
  const skinWhere = (keep) => {
    const px = []
    for (let i = 0; i < N; i++) if (mask[i] && !paint[i * 4 + 3] && keep((i / W) | 0, i)) px.push(i)
    return px
  }
  const inShade = (i) => {
    const [l, , b] = labAt(i)
    return Math.min(1, Math.max(0, (12 - b) / 6)) * Math.min(1, Math.max(0, (72 - l) / 10))
  }
  const legs = skinWhere((y, i) => y >= 1790 && !feetBoxes[i])
  const legTone = toneOf(img, legs.filter((i) => !inShade(i)))
  const shadowed = legs.filter((i) => inShade(i) > 0)
  const weight = shadowed.map(inShade)
  const before = shadowed.map((i) => img.slice(i * 3, i * 3 + 3))
  retone(img, shadowed, legTone, toneOf(img, shadowed.filter((i, k) => weight[k] >= 0.5)))
  shadowed.forEach((i, k) => {
    for (let c = 0; c < 3; c++) img[i * 3 + c] = before[k][c] + (img[i * 3 + c] - before[k][c]) * weight[k]
  })
  const head = await poly(HEAD)
  const face = skinWhere((y, i) => y < 1790 && head[i])
  const body = skinWhere((y, i) => y < 1790 && !head[i])
  retone(img, legs, FINISH_SKIN)
  retone(img, body, FINISH_SKIN)
  retone(img, face, FINISH_FACE)
  const highlight = (px, knee, slope) => {
    for (const i of px) {
      const [l, a, b] = labAt(i)
      if (l > knee) img.set(rgbOf([knee + (l - knee) * slope, a, b]), i * 3)
    }
  }
  // His face is lit hard from one side here, where the finish photo lights it
  // evenly from in front
  highlight(face, 80, 0.5)
  highlight([...body, ...legs], 86, 0.4)

  const rgb = Buffer.alloc(N * 3)
  for (let i = 0; i < N * 3; i++) rgb[i] = mask[(i / 3) | 0] ? Math.round(img[i]) : 255
  return { W, H, rgb, mask, paint, photoPx, feet: feet.map((s) => s.ground) }
}

async function main() {
  const photo = process.argv[2]
  if (!photo) throw new Error('usage: npm run meadow:runner-bridge -- bridge.jpg')
  await mkdir(WORK, { recursive: true })
  const prepared = await repair(photo, SHOES.atps)
  const [ax0, ay0, ax1, ay1] = AROUND
  await sharp(prepared.rgb, { raw: { width: prepared.W, height: prepared.H, channels: 3 } })
    .extract({ left: ax0, top: ay0, width: ax1 - ax0, height: ay1 - ay0 })
    .png()
    .toFile(fileURLToPath(new URL('repaired.png', WORK)))
  const small = await shrink(prepared, AROUND, FINISH)
  const print = await separate(small.prepared, { head: HEAD, tattoo: { box: TATTOO, area: MOOSE }, origin: small.origin, unit: small.unit })
  const finish = await readFile(FINISH_ART, 'utf8')
  const moose = JSON.parse(finish.slice(finish.indexOf(' = ') + 3)).inks.at(-1)
  const [[fx0, fy0], [fx1, fy1]] = MOOSE_AT.finish
  const [[bx0, by0], [bx1, by1]] = MOOSE_AT.bridge
  const r1 = (n) => Math.round(n * 10) / 10
  print.layers.at(-1).d = moose.d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_, x, y) => `${r1(bx0 + ((x - fx0) * (bx1 - bx0)) / (fx1 - fx0))} ${r1(by0 + ((y - fy0) * (by1 - by0)) / (fy1 - fy0))}`)

  const [, [lx, ly]] = prepared.feet
  const [tx, ty] = UNDER_TOE
  await writeFigure(OUT, 'RUNNER_BRIDGE_ART', "scripts/meadow/runner-bridge.mjs from Tripp's photo on the Hoan Bridge at the 2024 Milwaukee Lakefront Marathon", print, [Math.round((lx + tx) / 2), Math.round((ly + ty) / 2)])
  await preview(print.box, print.layers, new URL('preview.png', WORK))
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
