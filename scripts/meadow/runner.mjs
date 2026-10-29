// Builds the runner figure on /me from Tripp's 2024 Milwaukee Lakefront
// Marathon finish photo, as a screen print: cut him out of the crowd with
// Apple's Vision framework, repair what the photo hides, separate it into flat
// inks and trace each with potrace into src/lib/meadow/runner-art.ts.
//
//   npm run meadow:runner -- finish.jpg
//
// Every repair below is placed in that photo's pixels. The photo and the
// intermediate images stay in .cache; only the traced inks are committed.

import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CACHE } from './config.mjs'
import { canvas, clifton, cutout, preview, retone, segment, separate, SHOES, SINGLET, singletDesign, singletInk, toneOf, wear, writeFigure } from './screenprint.mjs'

const OUT = new URL('../../src/lib/meadow/runner-art.ts', import.meta.url)
const WORK = new URL('runner/', CACHE)
const H = 1000 // the canvas runs past the photo's bottom edge for his feet
const FACE = [390, 250] // a point on his face, to pick him out of the crowd

// His feet as they stand in the photo, for his shoes: seen from 24° above,
// toes turned out 18°, and 3.9 photo pixels to the centimeter, from the width
// of his ankles
const STAND = { tilt: 24, turn: 18, px: 3.9, H }

// ---------------------------------------------------------------------------
// Repairs, in the photo's pixels

async function repair(photo, shoes) {
  const src = await sharp(photo).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = src.info.width
  const H0 = src.info.height
  const cut = cutout(await segment(photo, WORK, FACE))
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
  const cv = canvas(img, mask, W, H)
  const { paint, stamp, set, isSkin, svgMask, poly, painting, inpaint, skinOf } = cv

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
  // The singlet's design, in its inks from the photo, with a yellow stripe
  //    across each shoulder as the photo shows them where the lanyard and his
  //    friend's hand don't hide them, and its facets' edge sloping down to his
  //    right as in the photo
  const design = await singletDesign(W, H)
  for (let i = 0; i < W * H; i++) {
    if (!torso[i] || !mask[i] || scoop[i]) continue
    if (inner[i] || ribbons[i] || !skinTone(i)) stamp(i, singletInk(design.subarray(i * 3, i * 3 + 3)))
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
  const feet = [clifton({ ...STAND, at: [398, 936], side: 1 }, shoes), clifton({ ...STAND, at: [542, 960], side: -1 }, shoes)]
  await wear(cv, feet, shoes)

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
  const armSkin = skinOf((x, y, i) => y > 340 && y < 600 && (armArea[i] || x < sideAt(y)))
  // All of his legs below his shorts, whose hem rises to y 668 at the outsides
  // of his thighs, but not his hand on the bottle
  const legSkin = skinOf((x, y) => y >= 690 || (y >= 650 && x < 530))
  retone(img, legSkin, toneOf(img, armSkin))

  const rgb = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H * 3; i++) rgb[i] = mask[(i / 3) | 0] ? Math.round(img[i]) : 255
  return { W, H, rgb, mask, paint, photoPx, feet: feet.map((s) => s.ground) }
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

// ---------------------------------------------------------------------------

async function main() {
  const photo = process.argv[2]
  if (!photo) throw new Error('usage: npm run meadow:runner -- finish.jpg')
  await mkdir(WORK, { recursive: true })
  const prepared = await repair(photo, SHOES.atps)
  await sharp(prepared.rgb, { raw: { width: prepared.W, height: H, channels: 3 } }).png().toFile(fileURLToPath(new URL('repaired.png', WORK)))
  const print = await separate(prepared, { head: HEAD, whiteOk: WHITE_OK, tattoo: { box: TATTOO, area: MOOSE } })

  // Where he stands: between his feet, which the shadow is drawn under
  const [[lx, ly], [rx, ry]] = prepared.feet
  await writeFigure(OUT, 'RUNNER_ART', "scripts/meadow/runner.mjs from Tripp's 2024 Milwaukee Lakefront Marathon finish photo", print, [Math.round((lx + rx) / 2), Math.round((ly + ry) / 2)])
  await preview(print.box, print.layers, new URL('preview.png', WORK))
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
