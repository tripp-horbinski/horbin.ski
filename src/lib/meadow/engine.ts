// Renders the meadow to a canvas and handles everything you can do in it.
// Layers sit at different depths and slide against each other as you move;
// the ground is sheared so every row of grass gets its own parallax.

import { Ambience } from './audio'
import { featureById, type FeatureId } from './features'
import { Grass, gustiness, type Pointer } from './grass'
import { blend, lightAt, lit, paletteAt, rgba, smooth, type Palette } from './palette'
import { drawPost } from './post'
import { drawRunner, onRunner, RUNNER, STANCE } from './runner'
import { buildScene, HORIZON, POST_Y, rng, RUNNER_SPOT, X0, X1, type Pt, type Scene } from './scene'
import { depth, facing, FOCAL, moonAt, pointAt, project, sideways, sunDirection } from './sun'
import { TERRAIN } from './terrain'

// One full day when playing, in seconds
const DAY_SECONDS = 96
// Ground depth gained per photo pixel below the horizon
const K = 0.65 / 300
const GROUND_DEPTH = 0.35
const POST_DEPTH = GROUND_DEPTH + (POST_Y - HORIZON) * K
// Across the middle of the trail post, where post.ts draws it
const POST_X = 103
const RUNNER_DEPTH = GROUND_DEPTH + (RUNNER_SPOT[1] - HORIZON) * K
// Photo pixels to meadow units for Tripp, which puts his eyes on the horizon
const TRIPP_K = (RUNNER_SPOT[1] - HORIZON) / (RUNNER.footY - RUNNER.eyeY)
const DEPTH = { sky: 0.02, clouds: 0.06, mountain: 0.18, forest: 0.28 }
// Climbers' headlamps: which slab, and where each route starts relative to its tip
const HEADLAMPS: [FeatureId, number, number][] = [['third', -70, 80], ['third', -52, 72], ['first', -42, 100]]

type Hit = FeatureId | 'sky'

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
  onHover(id: FeatureId | null): void
  onSelect(id: FeatureId): void
  onHour(hour: number): void
  onAnchors(hover: Pt | null, pinned: Pt | null): void
  // Where Tripp is on screen, every frame, for the link laid over him
  onTripp(box: Box): void
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

  private hour: number
  private playing = false
  private pal: Palette
  private palHour = -99
  private light = lightAt(12)
  private hourTick = -1
  // Real sun for the hour, where it falls in the frame, and the mountain colors it gives
  private sunDir: [number, number, number] = [0, 0, 1]
  private sunPos: Pt | null = null
  // Where the moon is in the frame when it's up, how much is lit, and its bright side
  private moon: { at: Pt; lit: number; limb: number } | null = null
  private facetColors: string[] = []
  private treeColors: [string, string][] = []
  // Tree shadows on the meadow hills, and how much of each crown half is in sun
  private shadows = new Path2D()
  private litLeft = 0.5

  private cam = { x: 0, y: 0 }
  private pointer: Pointer = { x: 0, y: 0, vx: 0, active: false }
  private movedAt = -99
  private down: { x: number; y: number; at: number } | null = null
  private brush = 0
  private hover: Hit = 'sky'
  private pinned: FeatureId | null = null
  private trippBox: Box = { x: 0, y: 0, w: 0, h: 0 }
  // His silhouette in white at the size he's drawn, made when first needed after a resize
  private trippMask: HTMLCanvasElement | null = null


  private clouds: Cloud[]
  private wisps: Path2D
  private stars: HTMLCanvasElement
  private twinkles: [number, number, number, number][] = []
  private motes: Mote[] = []
  private meteors: Mote[] = []
  private nextMeteor = 6
  private birds: Bird[] = []
  private nextFlock = 8
  private reduced: boolean
  private audio: Ambience | null = null
  private soundOn = false
  private audioTick = 0

  constructor(private canvas: HTMLCanvasElement, hour: number, cb: Callbacks) {
    this.ctx = canvas.getContext('2d')!
    this.cb = cb
    this.hour = hour
    this.pal = paletteAt(hour)
    this.scene = buildScene()
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.stars = document.createElement('canvas')

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
    this.audio?.destroy()
  }

  // --- Public controls ---

  setHour(h: number) {
    this.hour = ((h % 24) + 24) % 24
  }

  setPlaying(on: boolean) {
    this.playing = on
  }

  setSound(on: boolean) {
    this.soundOn = on
    if (on && !this.audio) this.audio = new Ambience()
    this.audio?.setEnabled(on)
  }

  setPinned(id: FeatureId | null) {
    this.pinned = id
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
    // Tall screens pull back a little and look past the slabs to the right,
    // so Tripp on the trail stays in the picture
    this.s = Math.max(this.W / 1250, Math.min(this.H / 850, this.W / (700 + 80 * portrait)))
    this.ax = 600 + 100 * portrait
    this.hy = 0.56 - 0.12 * portrait
    this.P = this.reduced ? 0 : Math.min(60, this.W * 0.035)
    this.Py = this.reduced ? 0 : Math.min(24, this.H * 0.025)
    // The trail post keeps its spot unless that's off the left edge; then it
    // stands just inside it
    this.postX = Math.max(POST_X, this.ax - (this.W / 2 - 24 - this.P) / this.s + 16)

    const half = (this.W / 2 + this.P) / this.s + 60
    const y1 = HORIZON + (this.H * (1 - this.hy) + this.Py) / this.s + 30
    const count = Math.round(Math.min(6500, Math.max(1200, (this.W * this.H * (1 - this.hy)) / 105)))
    this.grass.generate(this.ax - half, this.ax + half, y1, count)
    this.paintStars()
    this.trippMask = null
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

  private anchorOf(id: FeatureId): Pt {
    const f = featureById(id)
    const slab = this.scene.slabs.find((sl) => sl.id === id)
    const [x, y] = slab ? slab.top : f.anchor
    if (f.layer === 'ground') return this.groundPt(x, y)
    if (f.layer === 'runner') return this.toScreen(x, y, RUNNER_DEPTH)
    return this.toScreen(x, y, DEPTH.mountain)
  }

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
    if (hit === 'meadow' && Math.abs(dx) > 0) this.brush = Math.min(1, this.brush + Math.abs(dx) / 60)
    if (hit !== this.hover) {
      this.hover = hit
      const named = hit === 'sky' || hit === 'meadow' ? null : hit
      this.cb.onHover(named)
      this.canvas.style.cursor = named ? 'pointer' : 'default'
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
      this.cb.onHover(null)
    }
  }

  private hitTest(x: number, y: number): Hit {
    const { ctx, scene } = this
    const X = x * this.dpr
    const Y = y * this.dpr
    let hit: Hit = 'sky'
    this.trippTransform()
    if (onRunner(ctx, X, Y)) hit = 'tripp'
    else {
      this.ground()
      if (ctx.isPointInPath(scene.trailHit, X, Y)) hit = 'trail'
      else if (ctx.isPointInPath(scene.meadowFar, X, Y)) hit = 'meadow'
      else {
        this.layer(DEPTH.forest)
        if (ctx.isPointInPath(scene.hillHit, X, Y)) hit = 'meadow'
        else {
          this.layer(DEPTH.mountain)
          const slab = scene.slabs.find((sl) => sl.id && ctx.isPointInPath(sl.path, X, Y))
          if (slab) hit = slab.id!
          else if (ctx.isPointInPath(scene.mountain, X, Y)) hit = 'green'
        }
      }
    }
    this.screen()
    return hit
  }

  private click(x: number, y: number) {
    const hit = this.hitTest(x, y)
    if (hit === 'meadow') this.flush(x, y)
    else if (hit === 'sky') {
      if (this.light.stars > 0.5) this.launchMeteor(x, y)
      else if (this.light.day > 0.5) this.launchFlock(x, y)
    } else this.cb.onSelect(hit)
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

  private launchMeteor(x?: number, y?: number) {
    const sx = x ?? this.W * (0.2 + Math.random() * 0.6)
    const sy = y ?? this.H * (0.05 + Math.random() * 0.25)
    const dir = Math.random() < 0.5 ? -1 : 1
    this.meteors.push({ x: sx, y: sy, vx: dir * (420 + Math.random() * 200), vy: 220 + Math.random() * 120, life: 0, max: 0.9 })
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

    if (this.playing) {
      this.hour = (this.hour + (dt * 24) / DAY_SECONDS) % 24
      const tick = Math.floor(this.hour * 12)
      if (tick !== this.hourTick) {
        this.hourTick = tick
        this.cb.onHour(this.hour)
      }
    }
    if (Math.abs(this.hour - this.palHour) > 0.004) {
      this.pal = paletteAt(this.hour)
      this.light = lightAt(this.hour)
      this.palHour = this.hour
      this.relight()
    }

    this.update(dt)
    this.draw()

    const hovered = this.hover !== 'sky' && this.hover !== 'meadow' ? this.anchorOf(this.hover) : null
    this.cb.onAnchors(hovered, this.pinned ? this.anchorOf(this.pinned) : null)
    this.cb.onTripp(this.trippBox)
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
    this.brush *= 0.92

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
    this.meteors = this.meteors.filter((m) => {
      m.life += dt
      m.x += m.vx * dt
      m.y += m.vy * dt
      return m.life < m.max
    })
    this.birds = this.birds.filter((b) => {
      b.x += b.vx * dt
      b.y += Math.sin(this.t * 1.3 + b.phase) * 0.2
      return b.x > -80 && b.x < this.W + 80
    })

    if (!this.reduced) {
      if (this.light.stars > 0.7 && (this.nextMeteor -= dt) < 0) {
        this.launchMeteor()
        this.nextMeteor = 7 + Math.random() * 12
      }
      if (this.light.day > 0.8 && (this.nextFlock -= dt) < 0) {
        this.launchFlock()
        this.nextFlock = 28 + Math.random() * 30
      }
    }

    if (this.audio && this.soundOn && (this.audioTick -= dt) < 0) {
      this.audioTick = 0.1
      this.audio.update(gust, this.brush, this.light.crickets)
    }
  }

  private draw() {
    const { ctx, pal, scene, light } = this
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

    if (light.stars > 0.01) this.drawNight(at)
    this.drawMoon()

    // Sun and its haze, wherever the real sun is; from here it mostly stays off to the right
    if (sun) {
      this.layer(DEPTH.sky)
      const alt = this.sunDir[2]
      const disk = alt > 0.35 ? '#FFFBEF' : alt > 0.14 ? '#FFE7B8' : '#FFC488'
      const halo = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 300)
      halo.addColorStop(0, rgba(pal.glow, 0.75 * light.sun + 0.25))
      halo.addColorStop(0.12, rgba(pal.glow, 0.35))
      halo.addColorStop(1, rgba(pal.glow, 0))
      ctx.fillStyle = halo
      ctx.fillRect(sun[0] - 300, sun[1] - 300, 600, 600)
      ctx.fillStyle = disk
      ctx.beginPath()
      ctx.arc(sun[0], sun[1], 17, 0, Math.PI * 2)
      ctx.fill()
    }

    this.drawClouds(sun, at)
    this.drawBirds(at)

    this.drawMountain(sun, at)

    // The rolling meadow hills and woods in front of the mountain, then their trees
    this.layer(DEPTH.forest)
    scene.facets.forEach((f, i) => {
      if (f.kind !== 'hill' && f.kind !== 'wood') return
      ctx.fillStyle = this.facetColors[i]
      ctx.fill(f.path)
    })
    if (light.sun > 0.01) {
      ctx.fillStyle = rgba(pal.pineDark, 0.3 * light.sun)
      ctx.fill(this.shadows)
    }
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
    if (this.hover === 'trail') {
      ctx.fillStyle = 'rgba(255,250,235,0.28)'
      ctx.fill(scene.trail)
    }
    ctx.fillStyle = pal.talus
    ctx.fill(scene.stones)

    // Grass, with the trail post and Tripp standing in it
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
    ])

    this.drawSeeds()

    // Soft vignette, like the edge of a print
    this.screen()
    const v = ctx.createRadialGradient(this.W / 2, this.H * 0.45, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H * 0.45, Math.max(this.W, this.H) * 0.8)
    v.addColorStop(0, 'rgba(20,16,12,0)')
    v.addColorStop(1, `rgba(20,16,12,${0.22 + 0.15 * light.stars})`)
    ctx.fillStyle = v
    ctx.fillRect(0, 0, this.W, this.H)
  }

  // Tripp on the trail. The camera is at eye height, so anyone standing on
  // the level meadow has their eyes on the horizon, however far off they are
  private drawTripp() {
    const { ctx, pal, light, dpr } = this
    // Where he is on screen, for his outline and the link over him
    const [x, y] = RUNNER_SPOT
    const [left, top] = this.toScreen(x + (RUNNER.x0 - RUNNER.footX) * TRIPP_K, y - (RUNNER.footY - RUNNER.y0) * TRIPP_K, RUNNER_DEPTH)
    this.trippBox.x = left
    this.trippBox.y = top
    this.trippBox.w = (RUNNER.x1 - RUNNER.x0) * TRIPP_K * this.s
    this.trippBox.h = (RUNNER.y1 - RUNNER.y0) * TRIPP_K * this.s

    this.trippTransform()
    ctx.fillStyle = rgba(pal.pineDark, 0.16 + 0.18 * light.sun)
    ctx.beginPath()
    ctx.ellipse(RUNNER.footX, RUNNER.footY, STANCE.length / 2 + 30, 16, STANCE.angle, 0, Math.PI * 2)
    ctx.fill()

    // Outlined in white while you point at him, like the rocks: his white
    // silhouette nudged out all around, then him on top
    if (this.hover === 'tripp') {
      this.trippMask ??= this.maskTripp()
      const w = 1.2 * this.s * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        ctx.drawImage(this.trippMask, left * dpr + Math.cos(a) * w, top * dpr + Math.sin(a) * w)
      }
      this.trippTransform()
    }
    drawRunner(ctx, pal.light, 'white')
  }

  // From the photo's pixels to the meadow, where he stands
  private trippTransform() {
    const [x, y] = RUNNER_SPOT
    this.layer(RUNNER_DEPTH)
    this.ctx.transform(TRIPP_K, 0, 0, TRIPP_K, x - RUNNER.footX * TRIPP_K, y - RUNNER.footY * TRIPP_K)
  }

  private maskTripp() {
    const z = TRIPP_K * this.s * this.dpr
    const c = document.createElement('canvas')
    c.width = Math.ceil((RUNNER.x1 - RUNNER.x0) * z)
    c.height = Math.ceil((RUNNER.y1 - RUNNER.y0) * z)
    const g = c.getContext('2d')!
    g.setTransform(z, 0, 0, z, -RUNNER.x0 * z, -RUNNER.y0 * z)
    drawRunner(g, '#FFFFFF')
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = 'rgba(255,248,232,0.95)'
    g.fillRect(0, 0, c.width, c.height)
    return c
  }

  // Stars and the Milky Way, painted once per resize; late summer puts the core low in the south
  private paintStars() {
    const c = this.stars
    c.width = Math.round(this.W * this.dpr)
    c.height = Math.round(this.H * this.dpr)
    const g = c.getContext('2d')!
    const r = rng(17)
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const horizonY = this.H * this.hy
    const n = Math.round((this.W * horizonY) / 900)
    for (let i = 0; i < n; i++) {
      const a = 0.25 + r() * 0.6
      g.fillStyle = `rgba(246,241,225,${a})`
      const sz = r() < 0.92 ? 0.8 : 1.4
      g.fillRect(r() * this.W, r() * horizonY, sz, sz)
    }

    const k = this.s
    const toS = (x: number, y: number): Pt => [this.W / 2 + (x - this.ax) * k, horizonY + (y - HORIZON) * k]
    const along = (u: number): Pt => toS(-60 + 1100 * u, 380 - 980 * u)
    for (let u = 0; u <= 1; u += 0.025) {
      const [x, y] = along(u)
      const rad = (120 + 60 * r()) * k * (u < 0.3 ? 1.2 : 1)
      const glow = g.createRadialGradient(x, y, 0, x, y, rad)
      glow.addColorStop(0, u < 0.3 ? 'rgba(255,232,206,0.07)' : 'rgba(206,214,255,0.045)')
      glow.addColorStop(1, 'rgba(206,214,255,0)')
      g.fillStyle = glow
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
    for (let i = 0; i < 2600; i++) {
      const u = r()
      const [x, y] = along(u)
      const spread = (r() + r() + r() - 1.5) * 90 * k
      g.fillStyle = `rgba(240,238,255,${0.15 + r() * 0.5})`
      g.fillRect(x + spread * 0.7, y + spread * 0.7, 0.7, 0.7)
    }
    // The dark dust lane down the middle
    g.globalCompositeOperation = 'destination-out'
    for (let u = 0.02; u < 0.75; u += 0.02) {
      const [x, y] = along(u)
      const rad = 34 * k
      const lane = g.createRadialGradient(x + 18 * k, y + 10 * k, 0, x + 18 * k, y + 10 * k, rad)
      lane.addColorStop(0, 'rgba(0,0,0,0.35)')
      lane.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = lane
      g.fillRect(x + 18 * k - rad, y + 10 * k - rad, rad * 2, rad * 2)
    }
    g.globalCompositeOperation = 'source-over'

    this.twinkles = Array.from({ length: 60 }, () => [r() * this.W, r() * horizonY * 0.9, 0.8 + r() * 1.1, r() * 6])
  }

  private drawNight(at: number) {
    const { ctx, light } = this
    this.screen()
    ctx.globalAlpha = light.stars
    ctx.drawImage(this.stars, 0, 0, this.W, this.H)
    ctx.fillStyle = '#F6F1E1'
    for (const [x, y, rad, p] of this.twinkles) {
      ctx.globalAlpha = light.stars * (0.55 + 0.45 * Math.sin(at * (1.2 + p * 0.3) + p))
      ctx.beginPath()
      ctx.arc(x, y, rad, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (const m of this.meteors) {
      const fade = Math.sin((m.life / m.max) * Math.PI)
      const tail = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.18, m.y - m.vy * 0.18)
      tail.addColorStop(0, `rgba(255,250,235,${0.95 * fade * light.stars})`)
      tail.addColorStop(1, 'rgba(255,250,235,0)')
      ctx.strokeStyle = tail
      ctx.lineWidth = 1.6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(m.x - m.vx * 0.18, m.y - m.vy * 0.18)
      ctx.stroke()
    }
  }

  // The real moon, only its lit part, with its bright side toward the sun:
  // pale by day, glowing at night. It's drawn larger than life so it reads.
  private drawMoon() {
    if (!this.moon) return
    const { ctx, light } = this
    const { at: [mx, my], lit, limb } = this.moon
    const R = 13
    this.layer(DEPTH.sky)
    const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 90)
    glow.addColorStop(0, `rgba(230,226,205,${0.22 * light.stars})`)
    glow.addColorStop(1, 'rgba(230,226,205,0)')
    ctx.fillStyle = glow
    ctx.fillRect(mx - 90, my - 90, 180, 180)
    ctx.save()
    ctx.translate(mx, my)
    // Turn so +x points at the bright limb
    ctx.rotate(Math.atan2(-Math.cos(limb), -Math.sin(limb)))
    // The lit part: from the bright limb round to the terminator, an ellipse
    // that bulges toward the bright side for a crescent and away for a gibbous
    ctx.globalAlpha = 0.5 + 0.5 * light.stars
    ctx.fillStyle = '#F2ECD8'
    ctx.beginPath()
    for (let k = 0; k <= 24; k++) {
      const a = -Math.PI / 2 + (Math.PI * k) / 24
      ctx.lineTo(R * Math.cos(a), R * Math.sin(a))
    }
    for (let k = 0; k <= 24; k++) {
      const a = Math.PI / 2 - (Math.PI * k) / 24
      ctx.lineTo((1 - 2 * lit) * R * Math.cos(a), R * Math.sin(a))
    }
    ctx.fill()
    ctx.restore()
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
      if (sun && this.light.sun > 0.2) {
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
    const day = this.light.day
    if (day < 0.05) return

    // A red-tail riding thermals over the meadow
    this.layer(DEPTH.clouds)
    const a = at * 0.32
    const hx = 860 + Math.cos(a) * 80
    const hy = 120 + Math.sin(a) * 24
    const bank = Math.sin(a) * 0.25
    ctx.save()
    ctx.translate(hx, hy)
    ctx.rotate(bank)
    ctx.fillStyle = rgba(lit('#3A2E28', this.pal.light), day)
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
    ctx.strokeStyle = rgba(lit('#2E2A26', this.pal.light), day)
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
  private relight() {
    const { pal, light } = this
    const s = (this.sunDir = sunDirection(this.hour))
    this.sunPos = s[2] > -0.02 ? project(s) : null
    const m = moonAt(this.hour)
    const at = m.dir[2] > -0.01 ? project(m.dir) : null
    this.moon = at && { at, lit: m.lit, limb: m.limb }
    const lighting = (n?: number[], tone?: number) => {
      if (tone !== undefined) return tone
      const lambert = Math.max(0, n![0] * s[0] + n![1] * s[1] + n![2] * s[2])
      return Math.min(1, 0.14 + 0.08 * n![2] + 0.85 * lambert * light.sun * smooth(-0.02, 0.06, s[2]))
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
    if (sun[2] < 0.03) return path
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

  private drawMountain(sun: Pt | null, at: number) {
    const { ctx, pal, scene, light } = this
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

    for (const sl of scene.slabs) {
      if (sl.id !== this.hover && sl.id !== this.pinned) continue
      ctx.fillStyle = 'rgba(255,244,226,0.16)'
      ctx.fill(sl.path)
      ctx.strokeStyle = 'rgba(255,248,232,0.95)'
      ctx.lineWidth = 1.2
      ctx.stroke(sl.path)
    }

    if (this.hover === 'green' || this.pinned === 'green') {
      ctx.strokeStyle = 'rgba(255,248,232,0.9)'
      ctx.lineWidth = 1.4
      ctx.stroke(scene.ridge)
    }

    // Backlit rim along the skyline while the sun is low in the west
    const alt = this.sunDir[2]
    const rimK = smooth(-0.02, 0.02, alt) * (1 - smooth(0.08, 0.35, alt)) * smooth(0, 0.3, facing(this.sunDir))
    if (sun && rimK > 0.01) {
      const cx = Math.min(1500, Math.max(-300, sun[0]))
      const cy = Math.min(420, Math.max(60, sun[1]))
      const rim = ctx.createRadialGradient(cx, cy, 0, cx, cy, 760)
      rim.addColorStop(0, rgba(pal.glow, 0.95 * rimK))
      rim.addColorStop(1, rgba(pal.glow, 0))
      ctx.strokeStyle = rim
      ctx.lineWidth = 2.2
      ctx.stroke(scene.ridge)
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, 520)
      bloom.addColorStop(0, rgba(pal.glow, 0.4 * rimK))
      bloom.addColorStop(1, rgba(pal.glow, 0))
      ctx.fillStyle = bloom
      ctx.fillRect(cx - 520, cy - 520, 1040, 1040)
      ctx.restore()
    }

    // Headlamps of climbers still out on the Third and First after dark
    if (light.stars > 0.05) {
      HEADLAMPS.forEach(([id, dx, dy], i) => {
        const top = scene.slabs.find((sl) => sl.id === id)?.top
        if (!top) return
        const u = (at * 0.004 + i * 0.37) % 1
        const x = top[0] + dx * (1 - u) + Math.sin(at * 0.7 + i) * 1.2
        const y = top[1] + 6 + dy * (1 - u)
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 7)
        glow.addColorStop(0, `rgba(255,236,190,${0.55 * light.stars})`)
        glow.addColorStop(1, 'rgba(255,236,190,0)')
        ctx.fillStyle = glow
        ctx.fillRect(x - 7, y - 7, 14, 14)
        ctx.fillStyle = `rgba(255,248,226,${light.stars})`
        ctx.beginPath()
        ctx.arc(x, y, 0.9, 0, Math.PI * 2)
        ctx.fill()
      })
    }
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
