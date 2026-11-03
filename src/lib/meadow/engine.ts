// Renders the meadow to a canvas and handles everything you can do in it.
// Layers sit at different depths and slide against each other as you move;
// the ground is sheared so every row of grass gets its own parallax.

import { Grass, gustiness, type Pointer } from './grass'
import { blend, lit, PALETTE, rgba, smooth } from './palette'
import { drawPost } from './post'
import { DOGS } from './dogs'
import { drawFigure, drawRunner, onFigure, onRunner, RUNNER, STANCE, type Art } from './runner'
import { RUNNER_ART } from './runner-art'
import { buildScene, HORIZON, POST_Y, rng, RUNNER_SPOT, X0, X1, type Pt, type Scene } from './scene'
import { depth, FOCAL, pointAt, project, sideways, SUN } from './sun'
import { TERRAIN } from './terrain'

// Ground depth gained per photo pixel below the horizon
const K = 0.65 / 300
const GROUND_DEPTH = 0.35
const POST_DEPTH = GROUND_DEPTH + (POST_Y - HORIZON) * K
// Across the middle of the trail post, where post.ts draws it
const POST_X = 103
const RUNNER_DEPTH = GROUND_DEPTH + (RUNNER_SPOT[1] - HORIZON) * K
// Photo pixels to meadow units for Tripp, which puts his eyes on the horizon
const TRIPP_K = (RUNNER_SPOT[1] - HORIZON) / (RUNNER.footY - RUNNER.eyeY)
// And for each of his dogs: the horizon is at eye height wherever you stand,
// so a dog's withers come as far up to it as they do to his eyes. Nearest
// first, so the pointer finds the dog in front.
const PACK = DOGS.map((dog) => ({
  ...dog,
  depth: GROUND_DEPTH + (dog.at[1] - HORIZON) * K,
  k: ((dog.at[1] - HORIZON) * dog.withers) / (dog.art.footY - dog.withersY),
})).sort((a, b) => b.at[1] - a.at[1])
type Dog = (typeof PACK)[number]
// The right edge of Tripp and his dogs, which tall screens keep in the picture
const RIGHT = Math.max(
  RUNNER_SPOT[0] + (RUNNER.x1 - RUNNER.footX) * TRIPP_K,
  ...PACK.map(({ art, at, k, flip }) => at[0] + (flip ? art.footX - art.x0 : art.x1 - art.footX) * k),
)
// How far the glow round him spreads, in meadow units, and how long one breath of it takes in seconds
const GLOW = 9
const GLOW_PERIOD = 2.8
const DEPTH = { sky: 0.02, clouds: 0.06, mountain: 0.18, forest: 0.28 }

// Where the tag naming Tripp sits, over his cap
const TRIPP_TAG: Pt = [978, 419]

// What the pointer is on. Only Tripp and his dogs are links
type Hit = 'tripp' | 'dogs' | 'meadow' | 'mountain' | 'sky'

interface Cloud {
  x: number
  y: number
  w: number
  h: number
  puffs: [number, number, number][]
}

interface Mote {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
}

interface Bird {
  x: number
  y: number
  vx: number
  phase: number
}

export interface Callbacks {
  onHoverTripp(on: boolean): void
  onSelect(id: 'tripp' | 'dogs'): void
  // Where the tag naming Tripp goes while he's pointed at
  onTag(at: Pt | null): void
  // Where Tripp is on screen, every frame, for the link laid over him
  onTripp(box: Box): void
  // Where his dogs are on screen, every frame, for the link laid over them
  onDogs(box: Box): void
}

// A figure's white silhouette, for its outline, and the glow that breathes
// round it
interface Halo {
  mask: HTMLCanvasElement
  glow: HTMLCanvasElement
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

// Cumulus piled up in rows of puffs, each row narrower, so the tops go cauliflower
function makeCloud(r: () => number, x: number, y: number, w: number, tall = 1): Cloud {
  const h = w * 0.3 * tall
  const rows = tall > 1.2 ? 4 : 2
  const puffs: [number, number, number][] = []
  for (let row = 0; row < rows; row++) {
    const rw = w * (1 - row * (0.6 / rows)) * (0.9 + r() * 0.15)
    const off = (w - rw) / 2 + (r() - 0.5) * w * 0.1
    const n = Math.max(3, Math.round(rw / (w * 0.17)))
    const base = Math.min(h * 0.55, (rw / n) * 0.95)
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n
      const rad = base * (0.7 + 0.55 * Math.sin(u * Math.PI)) * (0.8 + r() * 0.4)
      puffs.push([off + rw * u + (r() - 0.5) * 6, -(row * h * 0.85) / rows - rad * (0.45 + r() * 0.3), rad])
    }
  }
  return { x, y, w, h, puffs }
}

export class MeadowEngine {
  private ctx: CanvasRenderingContext2D
  private scene: Scene
  private grass = new Grass()
  private cb: Callbacks
  private ro: ResizeObserver
  private raf = 0
  private last = 0
  private t = 0

  private W = 0
  private H = 0
  private dpr = 1
  private s = 1
  private ax = 600
  private hy = 0.56
  private P = 40
  private Py = 16
  private postX = POST_X

  private pal = PALETTE
  // Where the sun falls in the frame
  private sunPos = project(SUN)
  private facetColors: string[] = []
  private treeColors: [string, string][] = []
  // Tree shadows on the meadow hills, and how much of each crown half is in sun
  private shadows = new Path2D()
  private litLeft = 0.5

  private cam = { x: 0, y: 0 }
  private pointer: Pointer = { x: 0, y: 0, vx: 0, active: false }
  private movedAt = -99
  private down: { x: number; y: number; at: number } | null = null
  private hover: Hit = 'sky'
  private trippBox: Box = { x: 0, y: 0, w: 0, h: 0 }
  // His halo and each dog's, made when first needed after a resize
  private trippHalo: Halo | null = null
  private dogHalos = new Map<Dog, Halo>()


  private clouds: Cloud[]
  private wisps: Path2D
  private motes: Mote[] = []
  private birds: Bird[] = []
  private nextFlock = 8
  private reduced: boolean

  constructor(private canvas: HTMLCanvasElement, cb: Callbacks) {
    this.ctx = canvas.getContext('2d')!
    this.cb = cb
    this.scene = buildScene()
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const r = rng(3)
    this.clouds = [
      makeCloud(r, 95, 172, 120), makeCloud(r, 222, 198, 112), makeCloud(r, 1040, 306, 270, 1.9),
      makeCloud(r, 588, 232, 84), makeCloud(r, -420, 214, 200), makeCloud(r, 1480, 252, 280, 1.4),
      makeCloud(r, -800, 160, 240), makeCloud(r, 1880, 200, 160), makeCloud(r, 330, 118, 60),
    ]

    // High cirrus: many faint, overlapping strands so the edges feather out
    this.wisps = new Path2D()
    for (const [x, y, len, a, n, spread] of [
      [250, 150, 280, -0.5, 18, 26], [700, 110, 320, -0.1, 20, 30], [-320, 96, 300, -0.18, 16, 24],
      [1320, 90, 340, -0.14, 18, 28], [20, 104, 140, -0.04, 8, 12],
    ]) {
      for (let k = 0; k < n; k++) {
        const off = (r() - 0.5) * spread
        const sx = x + (r() - 0.5) * 50 - Math.sin(a) * off
        const sy = y + Math.cos(a) * off
        const l = len * (0.35 + r() * 0.65)
        const ex = sx + Math.cos(a) * l
        const ey = sy + Math.sin(a) * l
        const cx = (sx + ex) / 2 + (r() - 0.5) * 30
        const cy = (sy + ey) / 2 + 4 + r() * 10
        const w = 1.5 + r() * 4.5
        this.wisps.moveTo(sx, sy)
        this.wisps.quadraticCurveTo(cx, cy - w, ex, ey)
        this.wisps.quadraticCurveTo(cx, cy + w, sx, sy)
      }
    }

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.lightMountain()
    this.resize()

    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointerleave', this.onLeave)
    canvas.addEventListener('pointercancel', this.onLeave)
    this.raf = requestAnimationFrame(this.frame)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('pointerleave', this.onLeave)
    this.canvas.removeEventListener('pointercancel', this.onLeave)
  }

  // --- Public controls ---

  // Scrolled out of sight, the scene stops drawing until it's back
  setVisible(on: boolean) {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    if (!on) return
    this.last = 0
    this.raf = requestAnimationFrame(this.frame)
  }

  // --- View ---

  private resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.W = Math.max(1, rect.width)
    this.H = Math.max(1, rect.height)
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (this.W * this.H * dpr * dpr > 5e6) dpr = Math.sqrt(5e6 / (this.W * this.H))
    this.dpr = dpr
    this.canvas.width = Math.round(this.W * dpr)
    this.canvas.height = Math.round(this.H * dpr)

    const portrait = Math.min(1, Math.max(0, (1.3 - this.W / this.H) / 0.7))
    this.P = this.reduced ? 0 : Math.min(60, this.W * 0.035)
    this.Py = this.reduced ? 0 : Math.min(24, this.H * 0.025)
    // Tall screens pull back a little and look past the slabs to the right,
    // as far as it takes for Tripp and his dogs on the trail to stay in the
    // picture, however the camera drifts
    this.s = Math.max(this.W / 1250, Math.min(this.H / 850, this.W / (700 + 80 * portrait)))
    this.ax = Math.max(600 + 100 * portrait, RIGHT - (this.W / 2 - this.P - 12) / this.s)
    this.hy = 0.56 - 0.12 * portrait
    // The trail post keeps its spot unless that's off the left edge; then it
    // stands just inside it
    this.postX = Math.max(POST_X, this.ax - (this.W / 2 - 24 - this.P) / this.s + 16)

    const half = (this.W / 2 + this.P) / this.s + 60
    const y1 = HORIZON + (this.H * (1 - this.hy) + this.Py) / this.s + 30
    const count = Math.round(Math.min(6500, Math.max(1200, (this.W * this.H * (1 - this.hy)) / 105)))
    this.grass.generate(this.ax - half, this.ax + half, y1, count)
    this.trippHalo = null
    this.dogHalos.clear()
  }


  private layer(depth: number) {
    const k = this.dpr * this.s
    this.ctx.setTransform(
      k, 0, 0, k,
      this.dpr * (this.W / 2 - this.ax * this.s - this.cam.x * this.P * depth),
      this.dpr * (this.H * this.hy - HORIZON * this.s - this.cam.y * this.Py * depth),
    )
  }

  // Ground plane: depth grows with y, which is an affine shear
  private ground() {
    const { dpr, s, cam, P, Py } = this
    const d0 = GROUND_DEPTH - HORIZON * K
    this.ctx.setTransform(
      dpr * s, 0, dpr * (-cam.x * P * K), dpr * (s - cam.y * Py * K),
      dpr * (this.W / 2 - this.ax * s - cam.x * P * d0),
      dpr * (this.H * this.hy - HORIZON * s - cam.y * Py * d0),
    )
  }

  private screen() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  private toScreen(x: number, y: number, depth: number): Pt {
    return [
      this.W / 2 + (x - this.ax) * this.s - this.cam.x * this.P * depth,
      this.H * this.hy + (y - HORIZON) * this.s - this.cam.y * this.Py * depth,
    ]
  }

  private groundPt = (x: number, y: number): Pt => this.toScreen(x, y, GROUND_DEPTH + (y - HORIZON) * K)

  // --- Input ---

  private onMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const dx = x - this.pointer.x
    this.pointer.vx = this.pointer.vx * 0.6 + (dx / Math.max(0.008, 1 / 60)) * 0.4
    this.pointer.x = x
    this.pointer.y = y
    this.pointer.active = true
    this.movedAt = this.t
    const hit = this.hitTest(x, y)
    if (hit !== this.hover) {
      this.hover = hit
      this.cb.onHoverTripp(hit === 'tripp')
      this.canvas.style.cursor = hit === 'tripp' || hit === 'dogs' ? 'pointer' : 'default'
    }
  }

  private onDown = (e: PointerEvent) => {
    this.onMove(e)
    this.down = { x: this.pointer.x, y: this.pointer.y, at: performance.now() }
  }

  private onUp = (e: PointerEvent) => {
    const d = this.down
    this.down = null
    if (!d) return
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (Math.hypot(x - d.x, y - d.y) < 12 && performance.now() - d.at < 700) this.click(x, y)
    if (e.pointerType !== 'mouse') this.pointer.active = false
  }

  private onLeave = () => {
    this.pointer.active = false
    if (this.hover !== 'sky') {
      this.hover = 'sky'
      this.cb.onHoverTripp(false)
    }
  }

  private hitTest(x: number, y: number): Hit {
    const { ctx, scene } = this
    const X = x * this.dpr
    const Y = y * this.dpr
    let hit: Hit = 'sky'
    // Whichever of his dogs and him is nearer wins
    if (this.onDog(X, Y, true)) hit = 'dogs'
    else if (this.onTripp(X, Y)) hit = 'tripp'
    else if (this.onDog(X, Y, false)) hit = 'dogs'
    else {
      this.ground()
      if (ctx.isPointInPath(scene.meadowFar, X, Y)) hit = 'meadow'
      else {
        this.layer(DEPTH.forest)
        if (ctx.isPointInPath(scene.hillHit, X, Y)) hit = 'meadow'
        else {
          this.layer(DEPTH.mountain)
          if (ctx.isPointInPath(scene.mountain, X, Y)) hit = 'mountain'
        }
      }
    }
    this.screen()
    return hit
  }

  private click(x: number, y: number) {
    const hit = this.hitTest(x, y)
    if (hit === 'meadow') this.flush(x, y)
    else if (hit === 'sky') this.launchFlock(x, y)
    else if (hit !== 'mountain') this.cb.onSelect(hit)
  }

  // Tap the grass: it shivers and seeds lift on the breeze
  private flush(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      this.motes.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y - Math.random() * 30,
        vx: (Math.random() - 0.3) * 40,
        vy: -20 - Math.random() * 50,
        life: 0,
        max: 1.8 + Math.random() * 1.6,
      })
    }
    this.grass.burst(x, y, this.groundPt, this.s)
  }

  private launchFlock(x?: number, y?: number) {
    const bx = x === undefined ? -40 : x
    const by = y ?? this.H * (0.12 + Math.random() * 0.15)
    const dir = x === undefined ? 1 : Math.random() < 0.5 ? -1 : 1
    for (let i = 0; i < 5; i++) {
      this.birds.push({ x: bx - dir * i * 18, y: by + (i % 2) * 10 + i * 3, vx: dir * (70 + Math.random() * 25), phase: Math.random() * 6 })
    }
  }

  // --- Frame ---

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016
    this.last = now
    this.t += dt

    this.update(dt)
    this.draw()

    this.cb.onTag(this.hover === 'tripp' ? this.toScreen(TRIPP_TAG[0], TRIPP_TAG[1], RUNNER_DEPTH) : null)
    this.cb.onTripp(this.trippBox)
    this.cb.onDogs(this.dogsBox())
  }

  private update(dt: number) {
    const { t } = this
    // Drift the camera toward the pointer; idle, it sways a little on its own
    const idle = t - this.movedAt > 5
    const tx = this.reduced ? 0 : idle ? 0.35 * Math.sin(t * 0.11) : (this.pointer.x / this.W - 0.5) * 2
    const ty = this.reduced ? 0 : idle ? 0.25 * Math.sin(t * 0.07) : (this.pointer.y / this.H - 0.5) * 2
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 2.2)
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 2.2)
    this.pointer.vx *= 0.9

    const gust = gustiness(t) * (this.reduced ? 0 : 1)

    const breeze = 18 + 60 * gust
    this.motes = this.motes.filter((m) => {
      m.life += dt
      m.vx += (breeze - m.vx) * dt * 0.8
      m.vy += (-8 - m.vy) * dt * 0.9
      m.x += m.vx * dt
      m.y += m.vy * dt + Math.sin(m.life * 4 + m.max) * 0.3
      return m.life < m.max
    })
    this.birds = this.birds.filter((b) => {
      b.x += b.vx * dt
      b.y += Math.sin(this.t * 1.3 + b.phase) * 0.2
      return b.x > -80 && b.x < this.W + 80
    })

    if (!this.reduced && (this.nextFlock -= dt) < 0) {
      this.launchFlock()
      this.nextFlock = 28 + Math.random() * 30
    }
  }

  private draw() {
    const { ctx, pal, scene } = this
    const at = this.reduced ? 0 : this.t
    const sun = this.sunPos

    // Sky
    this.screen()
    const yAt = (py: number) => this.H * this.hy + (py - HORIZON) * this.s
    const sky = ctx.createLinearGradient(0, yAt(-300), 0, yAt(420))
    sky.addColorStop(0, pal.sky0)
    sky.addColorStop(0.62, pal.sky1)
    sky.addColorStop(1, pal.sky2)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, this.W, this.H)


    // Sun and its haze, wherever the real sun is; from here it mostly stays off to the right
    if (sun) {
      this.layer(DEPTH.sky)
      const halo = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 300)
      halo.addColorStop(0, rgba(pal.glow, 1))
      halo.addColorStop(0.12, rgba(pal.glow, 0.35))
      halo.addColorStop(1, rgba(pal.glow, 0))
      ctx.fillStyle = halo
      ctx.fillRect(sun[0] - 300, sun[1] - 300, 600, 600)
      ctx.fillStyle = '#FFFBEF'
      ctx.beginPath()
      ctx.arc(sun[0], sun[1], 17, 0, Math.PI * 2)
      ctx.fill()
    }

    this.drawClouds(sun, at)
    this.drawBirds(at)

    this.drawMountain()

    // The rolling meadow hills and woods in front of the mountain, then their trees
    this.layer(DEPTH.forest)
    scene.facets.forEach((f, i) => {
      if (f.kind !== 'hill' && f.kind !== 'wood') return
      ctx.fillStyle = this.facetColors[i]
      ctx.fill(f.path)
    })
    ctx.fillStyle = rgba(pal.pineDark, 0.3)
    ctx.fill(this.shadows)
    for (const grove of scene.woods) {
      ctx.fillStyle = pal.pineDark
      ctx.fill(grove.dark)
      ctx.fillStyle = pal.pineLit
      ctx.globalAlpha = this.litLeft
      ctx.fill(grove.left)
      ctx.globalAlpha = 1 - this.litLeft
      ctx.fill(grove.right)
      ctx.globalAlpha = 1
    }

    // Meadow, trail, and what grows out in it
    this.ground()
    ctx.fillStyle = pal.meadowFar
    ctx.fill(scene.meadowFar)
    ctx.fillStyle = pal.meadowMid
    ctx.fill(scene.meadowMid)
    ctx.fillStyle = pal.meadowNear
    ctx.fill(scene.meadowNear)
    ctx.fillStyle = rgba(pal.verge, 0.4)
    ctx.fill(scene.verge)
    ctx.fillStyle = pal.trail
    ctx.fill(scene.trail)
    ctx.fillStyle = pal.talus
    ctx.fill(scene.stones)

    // Grass, with the trail post, Tripp and his dogs standing in it
    this.screen()
    this.grass.draw(ctx, pal, this.groundPt, this.s, at, this.reduced ? 0 : 1, this.pointer, [
      [POST_Y, () => {
        this.layer(POST_DEPTH)
        ctx.translate(this.postX - POST_X, 0)
        drawPost(ctx, pal.light)
        this.screen()
      }],
      [RUNNER_SPOT[1], () => {
        this.drawTripp()
        this.screen()
      }],
      ...PACK.map((dog): [number, () => void] => [dog.at[1], () => {
        this.drawDog(dog)
        this.screen()
      }]),
    ])

    this.drawSeeds()

    // Soft vignette, like the edge of a print
    this.screen()
    const v = ctx.createRadialGradient(this.W / 2, this.H * 0.45, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H * 0.45, Math.max(this.W, this.H) * 0.8)
    v.addColorStop(0, 'rgba(20,16,12,0)')
    v.addColorStop(1, 'rgba(20,16,12,0.22)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, this.W, this.H)
  }

  // Tripp on the trail. The camera is at eye height, so anyone standing on
  // the level meadow has their eyes on the horizon, however far off they are
  private drawTripp() {
    const { ctx, pal, dpr } = this
    // Where he is on screen, for his outline and the link over him
    const [x, y] = RUNNER_SPOT
    const [left, top] = this.toScreen(x + (RUNNER.x0 - RUNNER.footX) * TRIPP_K, y - (RUNNER.footY - RUNNER.y0) * TRIPP_K, RUNNER_DEPTH)
    this.trippBox.x = left
    this.trippBox.y = top
    this.trippBox.w = (RUNNER.x1 - RUNNER.x0) * TRIPP_K * this.s
    this.trippBox.h = (RUNNER.y1 - RUNNER.y0) * TRIPP_K * this.s

    this.trippTransform()
    ctx.fillStyle = rgba(pal.pineDark, 0.34)
    ctx.beginPath()
    ctx.ellipse(RUNNER.footX, RUNNER.footY, STANCE.length / 2 + 30, 16, STANCE.angle, 0, Math.PI * 2)
    ctx.fill()

    this.trippHalo ??= this.haloOf(RUNNER_ART, TRIPP_K * this.s * dpr, false)
    this.drawHalo(this.trippHalo, left, top, this.hover === 'tripp')
    this.trippTransform()
    drawRunner(ctx, pal.light, 'white')
  }

  // One of his dogs beside him, with a shadow under all four paws, glowing
  // like him since they're a link too
  private drawDog(dog: Dog) {
    const { ctx, pal } = this
    const { x0, x1, footX, footY } = dog.art
    this.dogTransform(dog)
    ctx.fillStyle = rgba(pal.pineDark, 0.34)
    ctx.beginPath()
    ctx.ellipse(footX, footY, 0.35 * (x1 - x0), 0.05 * (x1 - x0), dog.stance, 0, Math.PI * 2)
    ctx.fill()
    let halo = this.dogHalos.get(dog)
    if (!halo) this.dogHalos.set(dog, (halo = this.haloOf(dog.art, dog.k * this.s * this.dpr, dog.flip)))
    const box = this.dogBox(dog)
    this.drawHalo(halo, box.x, box.y, this.hover === 'dogs')
    this.dogTransform(dog)
    drawFigure(ctx, dog.art, pal.light)
  }

  // Where a dog's box is on screen
  private dogBox({ art, at: [x, y], depth, k, flip }: Dog): Box {
    const [left, top] = this.toScreen(x + (flip ? art.footX - art.x1 : art.x0 - art.footX) * k, y - (art.footY - art.y0) * k, depth)
    return { x: left, y: top, w: (art.x1 - art.x0) * k * this.s, h: (art.y1 - art.y0) * k * this.s }
  }

  // Where both of them are on screen, for the link laid over them
  private dogsBox(): Box {
    const boxes = PACK.map((dog) => this.dogBox(dog))
    const x = Math.min(...boxes.map((b) => b.x))
    const y = Math.min(...boxes.map((b) => b.y))
    return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y }
  }

  // A soft white glow breathes round a figure that's a link, so it reads as
  // something to click, held at its brightest while you point at it and held
  // still for reduced motion. While you point at it, it's outlined in white too: its
  // white silhouette nudged out all around, to be drawn over. The
  // figure's box is at (left, top) on screen.
  private drawHalo({ mask, glow }: Halo, left: number, top: number, lit: boolean) {
    const { ctx, dpr } = this
    const breath = lit ? 1 : this.reduced ? 0.5 : 0.5 - 0.5 * Math.cos((this.t * Math.PI * 2) / GLOW_PERIOD)
    const pad = (glow.width - mask.width) / 2
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 0.3 + 0.65 * breath
    ctx.drawImage(glow, left * dpr - pad, top * dpr - pad)
    ctx.globalAlpha = 1
    if (!lit) return
    const w = 1.2 * this.s * dpr
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      ctx.drawImage(mask, left * dpr + Math.cos(a) * w, top * dpr + Math.sin(a) * w)
    }
  }

  private dogTransform({ art, at: [x, y], depth, k, flip }: Dog) {
    const kx = flip ? -k : k
    this.layer(depth)
    this.ctx.transform(kx, 0, 0, k, x - art.footX * kx, y - art.footY * k)
  }

  // Whether a point lands on one of his dogs standing nearer than him, or
  // with `nearer` false, farther
  private onDog(X: number, Y: number, nearer: boolean) {
    return PACK.some((dog) => {
      if (dog.at[1] > RUNNER_SPOT[1] !== nearer) return false
      this.dogTransform(dog)
      return onFigure(this.ctx, dog.art, X, Y)
    })
  }

  private onTripp(X: number, Y: number) {
    this.trippTransform()
    return onRunner(this.ctx, X, Y)
  }

  // From the photo's pixels to the meadow, where he stands
  private trippTransform() {
    const [x, y] = RUNNER_SPOT
    this.layer(RUNNER_DEPTH)
    this.ctx.transform(TRIPP_K, 0, 0, TRIPP_K, x - RUNNER.footX * TRIPP_K, y - RUNNER.footY * TRIPP_K)
  }

  // A figure's silhouette in white at the size it's drawn, `z` device pixels
  // to its photo's pixel, turned round with `flip`
  private haloOf(art: Art, z: number, flip: boolean): Halo {
    const mask = document.createElement('canvas')
    mask.width = Math.ceil((art.x1 - art.x0) * z)
    mask.height = Math.ceil((art.y1 - art.y0) * z)
    const g = mask.getContext('2d')!
    g.setTransform(flip ? -z : z, 0, 0, z, (flip ? art.x1 : -art.x0) * z, -art.y0 * z)
    drawFigure(g, art, '#FFFFFF')
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = 'rgba(255,248,232,0.95)'
    g.fillRect(0, 0, mask.width, mask.height)

    // That silhouette blurred into a halo, with a margin for it to spread
    // into. It's drawn off the canvas so only its shadow lands, and twice, so
    // the halo is bright at the figure's edge
    const blur = GLOW * this.s * this.dpr
    const pad = Math.ceil(blur * 1.5)
    const glow = document.createElement('canvas')
    glow.width = mask.width + pad * 2
    glow.height = mask.height + pad * 2
    const h = glow.getContext('2d')!
    h.shadowColor = 'rgba(255,248,232,1)'
    h.shadowBlur = blur
    h.shadowOffsetX = glow.width
    h.drawImage(mask, pad - glow.width, pad)
    h.drawImage(mask, pad - glow.width, pad)
    return { mask, glow }
  }

  private cloudX(c: Cloud, at: number) {
    const span = X1 - X0 + 600
    return ((((c.x - X0 + 300 + at * 2.2) % span) + span) % span) + X0 - 300
  }

  private drawClouds(sun: Pt | null, at: number) {
    const { ctx, pal } = this
    this.layer(DEPTH.clouds)

    // Cirrus first, drifting slower than the cumulus below it
    ctx.save()
    ctx.translate(((at * 1.2) % 3000), 0)
    ctx.fillStyle = rgba(pal.cloudHi, 0.16)
    ctx.fill(this.wisps)
    ctx.translate(-3000, 0)
    ctx.fill(this.wisps)
    ctx.restore()

    for (const c of this.clouds) {
      const x = this.cloudX(c, at)
      let lx = -0.3
      let ly = -0.95
      if (sun) {
        const dx = sun[0] - (x + c.w / 2)
        const dy = sun[1] - (c.y - c.h / 2)
        const d = Math.hypot(dx, dy) || 1
        lx = dx / d
        ly = dy / d
      }
      const body = new Path2D()
      const hb = c.h * 0.28
      body.roundRect(x, c.y - hb, c.w, hb, hb / 2)
      for (const [px, py, pr] of c.puffs) {
        body.moveTo(x + px + pr, c.y + py)
        body.arc(x + px, c.y + py, pr, 0, Math.PI * 2)
      }
      // Three flat tones: the whole silhouette in shade, then the same shape
      // nudged toward the light, then highlights on the upper billows only
      ctx.fillStyle = pal.cloudShade
      ctx.fill(body)
      ctx.save()
      ctx.clip(body)
      const nudge = Math.min(14, c.h * 0.14)
      const litBody = new Path2D()
      const hiBody = new Path2D()
      for (const [px, py, pr] of c.puffs) {
        const cx = x + px + lx * nudge
        const cy = c.y + py + ly * nudge
        litBody.moveTo(cx + pr, cy)
        litBody.arc(cx, cy, pr, 0, Math.PI * 2)
        if (py + pr < -c.h * 0.3) {
          const hx = x + px + lx * pr * 0.32
          const hy = c.y + py + ly * pr * 0.32
          hiBody.moveTo(hx + pr * 0.66, hy)
          hiBody.arc(hx, hy, pr * 0.66, 0, Math.PI * 2)
        }
      }
      ctx.fillStyle = pal.cloudLit
      ctx.fill(litBody)
      ctx.fillStyle = pal.cloudHi
      ctx.fill(hiBody)
      ctx.restore()
    }
  }

  private drawBirds(at: number) {
    const { ctx } = this

    // A red-tail riding thermals over the meadow
    this.layer(DEPTH.clouds)
    const a = at * 0.32
    const hx = 860 + Math.cos(a) * 80
    const hy = 120 + Math.sin(a) * 24
    const bank = Math.sin(a) * 0.25
    ctx.save()
    ctx.translate(hx, hy)
    ctx.rotate(bank)
    ctx.fillStyle = lit('#3A2E28', this.pal.light)
    ctx.beginPath()
    ctx.moveTo(-10, -1)
    ctx.quadraticCurveTo(-5, -3.5, 0, -1)
    ctx.quadraticCurveTo(5, -3.5, 10, -1)
    ctx.quadraticCurveTo(5, 0.6, 1, 1)
    ctx.lineTo(0, 3.2)
    ctx.lineTo(-1, 1)
    ctx.quadraticCurveTo(-5, 0.6, -10, -1)
    ctx.fill()
    ctx.restore()

    this.screen()
    ctx.strokeStyle = lit('#2E2A26', this.pal.light)
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    for (const b of this.birds) {
      const flap = Math.sin(at * 11 + b.phase) * 3.2
      const w = 5.5
      ctx.beginPath()
      ctx.moveTo(b.x - w, b.y - flap)
      ctx.quadraticCurveTo(b.x - w / 2, b.y - 2, b.x, b.y)
      ctx.quadraticCurveTo(b.x + w / 2, b.y - 2, b.x + w, b.y - flap)
      ctx.stroke()
    }
  }

  // Light each part of the mountain by which way it faces the real sun
  private lightMountain() {
    const { pal } = this
    const s = SUN
    const lighting = (n?: number[], tone?: number) => {
      if (tone !== undefined) return tone
      const lambert = Math.max(0, n![0] * s[0] + n![1] * s[1] + n![2] * s[2])
      return Math.min(1, 0.14 + 0.08 * n![2] + 0.85 * lambert)
    }
    const openShade = blend(pal.talus, pal.mtnDark, 0.55)
    const openLit = blend(pal.talus, pal.meadowFar, 0.25)
    // Meadow hills get more contrast than the mountain so their rolls read
    const hillShade = blend(pal.meadowMid, pal.pineDark, 0.4)
    const hillLit = blend(pal.meadowFar, pal.seed, 0.35)
    this.litLeft = 1 - smooth(-0.35, 0.35, sideways(s))
    this.shadows = this.castShadows(s)
    this.facetColors = this.scene.facets.map((f) => {
      const t = lighting(f.n, f.tone)
      const c =
        f.kind === 'land' ? blend(pal.mtnDark, pal.mtnLit, t)
        : f.kind === 'open' ? blend(openShade, openLit, t)
        : f.kind === 'hill' ? blend(hillShade, hillLit, smooth(0.35, 1, t))
        : f.kind === 'wood' ? blend(pal.pineDark, pal.mtnDark, 0.3)
        : t < 0.5 ? blend(pal.rockShade, pal.rockLit, t / 0.5) : blend(pal.rockLit, pal.rockHi, (t - 0.5) / 0.5)
      return f.haze ? blend(c, pal.sky2, f.haze) : c
    })
    this.treeColors = TERRAIN.groups.map((n) => {
      const t = lighting(n)
      return [blend(pal.pineDark, pal.mtnDark, 0.4), blend(pal.pineDark, pal.mtnLit, 0.15 + 0.7 * t)]
    })
  }


  // Each tree's shadow on the ground, from the real sun: a crown-shaped patch
  // stretched away from the sun, found by putting the tree back on the map
  private castShadows(sun: [number, number, number]) {
    const path = new Path2D()
    for (const t of this.scene.woodTrees) {
      const base = pointAt(t.x, t.y, t.range)
      const tall = (t.h * depth(base)) / FOCAL
      let se = (-sun[0] / sun[2]) * tall
      let sn = (-sun[1] / sun[2]) * tall
      const len = Math.hypot(se, sn)
      if (len > tall * 5) {
        se *= (tall * 5) / len
        sn *= (tall * 5) / len
      }
      const w = tall * 0.2
      const pe = (-sn / (len || 1)) * w
      const pn = (se / (len || 1)) * w
      const at = (k: number, side: number) => project([base[0] + se * k + pe * side, base[1] + sn * k + pn * side, base[2]])
      const pts = [at(0.2, 0), at(0.62, 1), at(1, 0), at(0.62, -1)]
      if (pts.some((p) => !p)) continue
      const [a, b, c, d] = pts as Pt[]
      const mid = (p: Pt, q: Pt) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as Pt
      const m0 = mid(a, b)
      path.moveTo(m0[0], m0[1])
      for (const [corner, next] of [[b, c], [c, d], [d, a], [a, b]] as [Pt, Pt][]) {
        const m = mid(corner, next)
        path.quadraticCurveTo(corner[0], corner[1], m[0], m[1])
      }
    }
    return path
  }

  private drawMountain() {
    const { ctx, pal, scene } = this
    this.layer(DEPTH.mountain)
    ctx.fillStyle = pal.mtn
    ctx.fill(scene.mountain)
    // Forest first, then the trees on it, then open slopes and rock printed over
    scene.facets.forEach((f, i) => {
      if (f.kind !== 'land') return
      ctx.fillStyle = this.facetColors[i]
      ctx.fill(f.path)
    })
    scene.trees.forEach((band, g) => {
      ctx.fillStyle = this.treeColors[g][0]
      ctx.fill(band.dark)
      ctx.fillStyle = this.treeColors[g][1]
      ctx.fill(band.lit)
    })
    scene.facets.forEach((f, i) => {
      if (f.kind !== 'open' && f.kind !== 'rock') return
      ctx.fillStyle = this.facetColors[i]
      ctx.fill(f.path)
    })
  }

  private drawSeeds() {
    const { ctx, pal } = this
    this.screen()
    for (const m of this.motes) {
      ctx.fillStyle = rgba(pal.seed, Math.min(1, (1 - m.life / m.max) * 1.4))
      ctx.beginPath()
      ctx.ellipse(m.x, m.y, 2.2, 0.9, Math.atan2(m.vy, m.vx), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
