// Flatirons scene from Chautauqua Meadow, drawn as flat screen-print layers.
// Geometry lives here so the site hero and the OpenGraph image share it.

export const SCENE_COLORS = [
  'sky1', 'sky2', 'sky3', 'sun', 'star', 'cloud', 'far', 'mid',
  'rockLit', 'rockShade', 'rockLine',
  'forestBack', 'forestFront', 'meadowBack', 'meadowFront', 'trail',
] as const

export type SceneColor = (typeof SCENE_COLORS)[number]

export const DAY: Record<SceneColor, string> = {
  sky1: '#B5C7CD', sky2: '#C7D4D4', sky3: '#D8DFD5', sun: '#F6F1E1', star: '#F6F1E1', cloud: '#F4F1E8',
  far: '#A9B4A6', mid: '#8C9A88',
  rockLit: '#C08A6B', rockShade: '#8F5F4A', rockLine: '#7A5040',
  forestBack: '#6F7F63', forestFront: '#4E5C47', meadowBack: '#CDB57E', meadowFront: '#B59B62', trail: '#EDE4C8',
}

export const NIGHT: Record<SceneColor, string> = {
  sky1: '#2B3038', sky2: '#363C45', sky3: '#474A50', sun: '#E6DDC4', star: '#E6DDC4', cloud: '#3C424B',
  far: '#4D5750', mid: '#3B443F',
  rockLit: '#7A5E54', rockShade: '#54413D', rockLine: '#46363A',
  forestBack: '#323C35', forestFront: '#242C27', meadowBack: '#4E4A3E', meadowFront: '#3D3A31', trail: '#9A927E',
}

export const cssVar = (k: SceneColor) => `--fi-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`

type Paint = (k: SceneColor, prop?: 'fill' | 'stroke') => string

// Paints with the --fi-* tokens, so artwork follows the light/dark theme
export const cssPaint: Paint = (k, prop = 'fill') => `style="${prop}:var(${cssVar(k)})"`

interface Options {
  paint: Paint
  // 'both' draws sun and moon, shown or hidden by --fi-sun-show / --fi-moon-show
  sky: 'day' | 'night' | 'both'
  grain?: boolean
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const f = (n: number) => n.toFixed(1)

function pines(r: () => number, y0: number, hMin: number, hMax: number, x0 = -12, x1 = 620) {
  let d = ''
  let x = x0
  while (x < x1) {
    const h = hMin + r() * (hMax - hMin)
    const hw = h * 0.3
    const yb = y0 + r() * 8 - 4
    d += `M${f(x - hw)} ${f(yb)}L${f(x)} ${f(yb - h)}L${f(x + hw)} ${f(yb)}Z`
    x += hw * 1.25 + r() * 5
  }
  return d
}

type Pt = [number, number]

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const poly = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z'

// A tilted sandstone slab: long face rising from bottom-left to the tip, steep drop on the right
function slab(paint: Paint, bl: Pt, tip: Pt, sh: Pt, br: Pt) {
  let s = `<path ${paint('rockLit')} d="${poly([bl, tip, sh, br])}"/>`
  s += `<path ${paint('rockShade')} d="${poly([lerp(tip, sh, 0.45), sh, br, lerp(br, bl, 0.3)])}"/>`
  // Bedding lines run the length of the slab, parallel to its face
  for (const t of [0.28, 0.55]) {
    s += `<path ${paint('rockLine', 'stroke')} stroke-width="1.2" opacity=".45" d="M${lerp(bl, br, t).map(f).join(' ')}L${lerp(tip, sh, t).map(f).join(' ')}"/>`
  }
  return s
}

// Slab scaled from the proportions of the big slab in the Chautauqua view
function lean(paint: Paint, x: number, base: number, h: number, w: number) {
  return slab(paint, [x, base], [x + 0.55 * w, base - h], [x + w, base - 0.74 * h], [x + 0.82 * w, base])
}

// Green Mountain's skyline, traced from the view across Chautauqua Meadow
const RIDGE: Pt[] = [
  [70, 240], [90, 212], [115, 200], [135, 185], [165, 171], [200, 162], [235, 158], [270, 158],
  [300, 160], [325, 156], [370, 155], [400, 156], [440, 160], [480, 165], [520, 174], [545, 181],
  [575, 185], [600, 195],
]

function ridgeY(x: number) {
  for (let i = 1; i < RIDGE.length; i++) {
    if (x <= RIDGE[i][0]) return lerp(RIDGE[i - 1], RIDGE[i], (x - RIDGE[i - 1][0]) / (RIDGE[i][0] - RIDGE[i - 1][0]))[1]
  }
  return RIDGE[RIDGE.length - 1][1]
}

// Flat-bottomed cumulus built from overlapping puffs
function cloud(paint: Paint, x: number, y: number, w: number) {
  const h = w * 0.32
  const puffs: [number, number, number][] = [[0.2, 0.35, 0.45], [0.42, 0.62, 0.62], [0.66, 0.48, 0.5], [0.84, 0.25, 0.32]]
  let s = `<g ${paint('cloud')}><rect x="${f(x)}" y="${f(y - h * 0.35)}" width="${f(w)}" height="${f(h * 0.35)}" rx="${f(h * 0.17)}"/>`
  for (const [px, py, pr] of puffs) s += `<circle cx="${f(x + w * px)}" cy="${f(y - h * py)}" r="${f(h * pr)}"/>`
  return s + '</g>'
}

function tree(x: number, yb: number, h: number) {
  const hw = h * 0.3
  return `M${f(x - hw)} ${f(yb)}L${f(x)} ${f(yb - h)}L${f(x + hw)} ${f(yb)}Z`
}

// Inner SVG markup for a 600×500 viewBox
export function flatironsMarkup({ paint, sky, grain = false }: Options) {
  const r = rng(41)
  const rs = rng(7)
  let s = ''

  if (grain) {
    s += '<defs><filter id="fi-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs>'
  }

  // Sky in flat bands
  s += `<rect width="600" height="500" ${paint('sky3')}/><rect width="600" height="235" ${paint('sky2')}/><rect width="600" height="150" ${paint('sky1')}/>`

  if (sky !== 'night') {
    const show = sky === 'both' ? ' style="opacity:var(--fi-sun-show)"' : ''
    s += `<g${show}><circle cx="440" cy="110" r="40" ${paint('sun')} opacity=".4"/><circle cx="440" cy="110" r="26" ${paint('sun')}/>`
    // A few birds heading for the foothills
    s += `<g class="fi-birds" fill="none" stroke-width="1.6" stroke-linecap="round" ${paint('forestFront', 'stroke')}>`
    for (const [x, y, w] of [[252, 112, 8], [272, 122, 6], [288, 108, 7], [306, 126, 5]]) {
      s += `<path d="M${x - w} ${y}Q${x - w / 2} ${y - w / 2} ${x} ${y}Q${x + w / 2} ${y - w / 2} ${x + w} ${y}"/>`
    }
    s += '</g></g>'
  }
  if (sky !== 'day') {
    const show = sky === 'both' ? ' style="opacity:var(--fi-moon-show)"' : ''
    s += `<g${show}>`
    for (let i = 0; i < 46; i++) {
      s += `<circle cx="${f(rs() * 600)}" cy="${f(rs() * 230)}" r="${f(0.6 + rs() * 1.2)}" ${paint('star')} opacity="${f(0.5 + rs() * 0.5)}"/>`
    }
    s += `<circle cx="124" cy="86" r="20" ${paint('sun')}/><circle cx="133" cy="80" r="17" ${paint('sky1')}/>`
    s += `<path class="fi-shooting-star" d="M342 46L402 76" stroke-width="1.4" stroke-linecap="round" ${paint('star', 'stroke')}/></g>`
  }

  // High wisps and fair-weather cumulus, building up behind the mountain on the right
  s += `<g class="fi-clouds"><g ${paint('cloud')} opacity=".7"><rect x="120" y="82" width="190" height="6" rx="3"/><rect x="230" y="94" width="140" height="5" rx="2.5"/><rect x="-30" y="76" width="110" height="5" rx="2.5"/></g>`
  s += cloud(paint, 34, 128, 72) + cloud(paint, 118, 146, 112) + cloud(paint, 506, 136, 120) + cloud(paint, 470, 196, 150)
  s += '</g>'

  // Distant foothills, then Green Mountain
  s += `<path ${paint('far')} d="M0 500L0 206Q40 196 80 204L600 230L600 500Z"/>`
  // Mountain drawn 1.15× around the treeline so it fills the frame like the real view
  s += '<g transform="translate(320 252) scale(1.15) translate(-320 -252)">'
  s += `<path ${paint('forestBack')} d="${poly([...RIDGE, [600, 500], [70, 500]])}"/>`

  // Forest stippling the mountain's flanks
  let flank = ''
  for (let i = 0; i < 340; i++) {
    const x = 92 + r() * 508
    const top = ridgeY(x) + 6
    if (top > 236) continue
    flank += tree(x, top + r() * (238 - top), 4 + r() * 4)
  }
  s += `<path ${paint('forestFront')} d="${flank}"/>`

  // Rocky slope below the big slab
  s += `<path ${paint('rockLit')} opacity=".45" d="M338 200L372 188L412 196L440 222L398 228L352 222Z"/>`

  // The Flatirons, smallest on the left rising to the big slab
  s += slab(paint, [98, 236], [140, 186], [149, 190], [122, 236])
  s += slab(paint, [124, 236], [172, 180], [182, 184], [152, 236])
  s += slab(paint, [158, 236], [226, 163], [235, 170], [190, 236])
  s += slab(paint, [222, 236], [287, 160], [300, 165], [264, 236])
  s += slab(paint, [298, 236], [343, 137], [370, 158], [366, 236])
  // Outcrops on the right shoulder
  s += slab(paint, [512, 184], [522, 170], [534, 171], [540, 184])
  s += slab(paint, [530, 186], [540, 173], [552, 175], [557, 188])
  s += slab(paint, [520, 238], [538, 204], [553, 210], [558, 238])
  s += slab(paint, [546, 238], [560, 213], [571, 219], [574, 238])
  // Smaller outcrops poking out of the trees
  s += slab(paint, [416, 228], [425, 212], [435, 214], [439, 228])
  s += slab(paint, [466, 220], [474, 204], [484, 207], [488, 220])
  s += slab(paint, [262, 236], [270, 224], [278, 226], [281, 236])

  // Trees closing in around the slab bases
  let skirt = ''
  for (let i = 0; i < 160; i++) {
    const x = 92 + r() * 508
    skirt += tree(x, 234 + r() * 10, 8 + r() * 6)
  }
  s += `<path ${paint('forestFront')} d="${skirt}"/>`
  s += '</g>'

  // Ponderosa treeline at the meadow's edge, taller on the left
  s += `<path ${paint('forestFront')} d="${pines(r, 252, 26, 48, -12, 190)}${pines(r, 256, 12, 26, 190, 612)}"/><rect y="250" width="600" height="14" ${paint('forestFront')}/>`

  // Chautauqua Meadow
  s += `<path ${paint('meadowBack')} d="M0 500L0 262Q160 252 330 262T600 254L600 500Z"/>`
  s += `<path ${paint('meadowFront')} d="M0 500L0 352Q170 330 330 344T600 336L600 500Z"/>`
  let grass = ''
  for (let i = 0; i < 90; i++) {
    const x = r() * 600
    const y = 360 + r() * 140
    grass += `M${f(x)} ${f(y)}l${f(r() * 4 - 2)} -${f(5 + r() * 7)}`
  }
  s += `<path ${paint('rockLine', 'stroke')} stroke-width="1" opacity=".22" d="${grass}"/>`

  // Lone trees and shrubs out in the grass
  s += `<path ${paint('forestFront')} d="${tree(220, 278, 15)}${tree(263, 281, 12)}${tree(354, 260, 10)}"/>`
  s += `<path ${paint('forestFront')} d="${tree(92, 270, 13)}${tree(432, 266, 9)}"/>`
  s += `<g ${paint('forestBack')}><circle cx="394" cy="272" r="7"/><circle cx="401" cy="275" r="5"/><circle cx="150" cy="292" r="5"/><circle cx="470" cy="286" r="6"/><circle cx="476" cy="289" r="4"/><circle cx="300" cy="302" r="4"/></g>`
  // Sun-bleached grass catching the light
  let dry = ''
  for (let i = 0; i < 70; i++) {
    const x = r() * 600
    const y = 272 + r() * 80
    dry += `M${f(x)} ${f(y)}l${f(r() * 3 - 1.5)} -${f(3 + r() * 5)}`
  }
  s += `<path ${paint('trail', 'stroke')} stroke-width="1" opacity=".5" d="${dry}"/>`

  // The trail bending off toward the Flatirons, and a trail marker post
  s += `<path ${paint('trail')} d="M494 300C484 318 470 336 474 350C490 372 548 388 600 398L600 414C540 404 476 386 462 356C456 336 476 318 490 300Z"/>`
  s += `<rect x="46" y="296" width="8" height="72" ${paint('rockShade')}/><rect x="47.5" y="301" width="5" height="8" ${paint('trail')}/>`

  if (grain) {
    s += '<rect width="600" height="500" filter="url(#fi-grain)" style="opacity:var(--fi-grain);mix-blend-mode:multiply"/>'
  }
  return s
}

// Static SVG document with fixed colors, for places without CSS (e.g. OpenGraph)
export function flatironsSvg(colors: Record<SceneColor, string>, viewBox: string, sky: 'day' | 'night') {
  const paint: Paint = (k, prop = 'fill') => `${prop}="${colors[k]}"`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${flatironsMarkup({ paint, sky })}</svg>`
}

// Wide foothills band for the page footer; transparent sky so it sits on the page
export const RIDGELINE_WIDTH = 1600
export const RIDGELINE_HEIGHT = 180

export function ridgelineMarkup() {
  const paint = cssPaint
  const r = rng(23)
  const W = RIDGELINE_WIDTH
  let far = 'M0 180L0 96'
  for (let x = 0; x < W; ) {
    x += 50 + r() * 70
    far += `L${f(x)} ${f(48 + r() * 50)}`
  }
  far += `L${W} 180Z`
  let s = `<path ${paint('far')} d="${far}"/>`
  s += `<path ${paint('mid')} d="M0 180L0 128Q300 118 600 108Q800 92 1000 104T${W} 122L${W} 180Z"/>`
  const c = W / 2
  s += lean(paint, c - 300, 150, 40, 34)
  s += lean(paint, c - 255, 150, 48, 40)
  s += lean(paint, c - 190, 150, 62, 50)
  s += lean(paint, c - 110, 150, 72, 56)
  s += lean(paint, c + 10, 150, 96, 70)
  s += lean(paint, c + 300, 150, 30, 40)
  s += `<path ${paint('forestBack')} d="${pines(r, 146, 18, 34, -12, W + 12)}"/><rect y="142" width="${W}" height="38" ${paint('forestBack')}/>`
  s += `<path ${paint('forestFront')} d="${pines(r, 166, 14, 28, -12, W + 12)}"/><rect y="162" width="${W}" height="18" ${paint('forestFront')}/>`
  return s
}

// Trailhead sign planted between pines, in the style of routed park signs
export function trailSignMarkup(title: string, subtitle: string) {
  const paint = cssPaint
  const r = rng(11)
  const wood = 'style="fill:var(--sign-wood)"'
  const post = 'style="fill:var(--sign-post)"'
  const ink = 'style="fill:var(--sign-text)"'
  let s = `<path ${paint('meadowBack')} d="M14 230Q300 176 586 230Z"/>`
  s += `<path ${paint('forestBack')} d="${pines(r, 216, 40, 78, 70, 170)}${pines(r, 216, 40, 78, 440, 530)}"/>`
  s += `<path ${paint('forestFront')} d="${pines(r, 224, 30, 58, 50, 150)}${pines(r, 224, 30, 58, 460, 550)}"/>`
  s += `<rect x="222" y="120" width="16" height="98" ${post}/><rect x="362" y="120" width="16" height="98" ${post}/>`
  s += `<rect x="160" y="34" width="280" height="106" rx="6" ${wood}/>`
  for (const y of [58, 81, 109, 126]) {
    s += `<path d="M172 ${y}Q${240 + r() * 120} ${y + 3 - r() * 6} 428 ${y}" style="stroke:var(--sign-post)" stroke-width="1.2" fill="none" opacity=".45"/>`
  }
  s += `<rect x="170" y="44" width="260" height="86" rx="3" fill="none" style="stroke:var(--sign-text)" stroke-width="1.5" opacity=".55"/>`
  s += `<text x="300" y="94" text-anchor="middle" ${ink} font-family="'Josefin Sans', Futura, sans-serif" font-weight="600" font-size="34" letter-spacing="6">${title.toUpperCase()}</text>`
  s += `<text x="300" y="117" text-anchor="middle" ${ink} font-family="'Josefin Sans', Futura, sans-serif" font-weight="600" font-size="12" letter-spacing="3" opacity=".85">${subtitle.toUpperCase()}</text>`
  return s
}
