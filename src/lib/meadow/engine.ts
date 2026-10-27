// Renders the meadow to a canvas and handles everything you can do in it.
// Layers sit at different depths and slide against each other as you move;
// the ground is sheared so every row of grass gets its own parallax.

import { Ambience } from './audio'
import { featureById, type FeatureId } from './features'
import { drawFigures, SHOULDER, type FigureState } from './figures'
import { Grass, gustiness, noise, type Pointer } from './grass'
import { lightAt, lit, paletteAt, rgba, smooth, type Palette } from './palette'
import { buildScene, FIGURES_Y, HEADLAMP_ROUTES, HORIZON, rng, X0, X1, type Pt, type Scene } from './scene'

// One full day when playing, in seconds
const DAY_SECONDS = 96
// Ground depth gained per photo pixel below the horizon
const K = 0.65 / 300
const GROUND_DEPTH = 0.35
const FIG_DEPTH = GROUND_DEPTH + (FIGURES_Y - HORIZON) * K
const DEPTH = { sky: 0.02, clouds: 0.06, far: 0.1, mountain: 0.18, forest: 0.28 }

type Hit = FeatureId | 'hikers' | 'sky'

interface Cloud {
  x: number
  y: number
  w: number
  h: number
  puffs: [number, number, number][]
}

interface Hopper {
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  dur: number
  peak: number
  size: number
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

function sunAt(hour: number): Pt | null {
  const u = (hour - 11) / (18.9 - 11)
  if (u < -0.05 || u > 1.3) return null
  const y = u <= 1 ? 290 - 440 * Math.pow(Math.sin(((1 - u) * Math.PI) / 2), 0.8) : 290 + (u - 1) * 300
  return [200 + 860 * u, y]
}

function moonAt(hour: number): Pt | null {
  const v = (((hour - 20.3 + 24) % 24) / 10)
  if (v > 1) return null
  return [80 + 1040 * v, 300 - 250 * Math.sin(v * Math.PI)]
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

  private hour: number
  private playing = false
  private pal: Palette
  private palHour = -99
  private light = lightAt(12)
  private hourTick = -1

  private cam = { x: 0, y: 0 }
  private pointer: Pointer = { x: 0, y: 0, vx: 0, active: false }
  private aim: Pt | null = null
  private aimAt = -99
  private down: { x: number; y: number; at: number } | null = null
  private brush = 0
  private hover: Hit = 'sky'
  private pinned: FeatureId | null = null

  private fig: FigureState = { armAngle: -0.55, armRaise: 1, look: 0.6, snap: 0, flash: 0, sway: 0, breath: 0 }
  private snapClock = -1

  private clouds: Cloud[]
  private wisps: Path2D
  private stars: HTMLCanvasElement
  private twinkles: [number, number, number, number][] = []
  private hoppers: Hopper[] = []
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
    if (id && id !== this.pinned && featureById(id).layer !== 'ground') this.snapClock = 0
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
    this.s = Math.max(this.W / 1250, Math.min(this.H / 850, this.W / 700))
    // Tall screens slide left to keep the hikers in frame with the slabs
    this.ax = 600 - 170 * portrait
    this.hy = 0.56 - 0.12 * portrait
    this.P = this.reduced ? 0 : Math.min(60, this.W * 0.035)
    this.Py = this.reduced ? 0 : Math.min(24, this.H * 0.025)

    const half = (this.W / 2 + this.P) / this.s + 60
    const y1 = HORIZON + (this.H * (1 - this.hy) + this.Py) / this.s + 30
    const count = Math.round(Math.min(6500, Math.max(1200, (this.W * this.H * (1 - this.hy)) / 105)))
    this.grass.generate(this.ax - half, this.ax + half, y1, count)
    this.paintStars()
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
    const [x, y] = f.anchor
    if (f.layer === 'ground') return this.groundPt(x, y)
    if (f.layer === 'figures') return this.toScreen(x, y, FIG_DEPTH)
    return this.toScreen(x, y, f.layer === 'forest' ? DEPTH.forest : DEPTH.mountain)
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
    this.aim = [x, y]
    this.aimAt = this.t
    const hit = this.hitTest(x, y)
    if (hit === 'meadow' && Math.abs(dx) > 0) this.brush = Math.min(1, this.brush + Math.abs(dx) / 60)
    if (hit !== this.hover) {
      this.hover = hit
      const named = hit === 'sky' || hit === 'hikers' || hit === 'meadow' ? null : hit
      this.cb.onHover(named)
      this.canvas.style.cursor = named || hit === 'hikers' ? 'pointer' : 'default'
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
    this.layer(FIG_DEPTH)
    if (ctx.isPointInPath(scene.postHit, X, Y)) hit = 'post'
    else if (ctx.isPointInPath(this.hikersHit, X, Y)) hit = 'hikers'
    else {
      this.ground()
      if (ctx.isPointInPath(scene.trailHit, X, Y)) hit = 'trail'
      else if (ctx.isPointInPath(scene.meadowFar, X, Y)) hit = 'meadow'
      else {
        this.layer(DEPTH.forest)
        if (ctx.isPointInPath(scene.forestHit, X, Y)) hit = 'pines'
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

  private hikersHit = (() => {
    const p = new Path2D()
    p.rect(110, 432, 176, 214)
    return p
  })()

  private click(x: number, y: number) {
    const hit = this.hitTest(x, y)
    if (hit === 'meadow') this.flush(x, y)
    else if (hit === 'hikers') this.snapClock = 0
    else if (hit === 'sky') {
      if (this.light.stars > 0.5) this.launchMeteor(x, y)
      else if (this.light.day > 0.5) this.launchFlock(x, y)
    } else this.cb.onSelect(hit)
  }

  // Tap the grass: a grasshopper or two crackles away and seeds lift on the breeze
  private flush(x: number, y: number) {
    const n = 1 + Math.floor(Math.random() * 2.4)
    const sz = Math.max(1.1, this.s * 1.5)
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1
      const dur = 0.55 + Math.random() * 0.35
      this.hoppers.push({
        x0: x + (Math.random() - 0.5) * 20,
        y0: y,
        x1: x + dir * (70 + Math.random() * 130) * sz,
        y1: y + (Math.random() - 0.3) * 40 * sz,
        t: -i * 0.12,
        dur,
        peak: (50 + Math.random() * 70) * sz,
        size: sz * (0.85 + Math.random() * 0.3),
      })
      if (this.soundOn) window.setTimeout(() => this.audio?.crackle(dur * 0.8), i * 120)
    }
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
    }

    this.update(dt)
    this.draw()

    const hovered = this.hover !== 'sky' && this.hover !== 'hikers' && this.hover !== 'meadow' ? this.anchorOf(this.hover) : null
    this.cb.onAnchors(hovered, this.pinned ? this.anchorOf(this.pinned) : null)
  }

  private update(dt: number) {
    const { t } = this
    // Drift the camera toward the pointer; idle, it sways a little on its own
    const idle = t - this.aimAt > 5
    const tx = this.reduced ? 0 : idle ? 0.35 * Math.sin(t * 0.11) : (this.pointer.x / this.W - 0.5) * 2
    const ty = this.reduced ? 0 : idle ? 0.25 * Math.sin(t * 0.07) : (this.pointer.y / this.H - 0.5) * 2
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 2.2)
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 2.2)
    this.pointer.vx *= 0.9
    this.brush *= 0.92

    // He points at what you point at, or at whatever note is open, or at the First
    const target = this.aim && t - this.aimAt < 4 ? this.aim : this.anchorOf(this.pinned ?? 'first')
    const fx = this.ax + (target[0] - this.W / 2 + this.cam.x * this.P * FIG_DEPTH) / this.s
    const fy = HORIZON + (target[1] - this.H * this.hy + this.cam.y * this.Py * FIG_DEPTH) / this.s
    const ang = Math.atan2(fy - SHOULDER[1], fx - SHOULDER[0])
    const valid = ang > -2.5 && ang < 0.75
    const k = Math.min(1, dt * 7)
    this.fig.armRaise += ((valid ? 1 : 0) - this.fig.armRaise) * Math.min(1, dt * 5)
    if (valid) this.fig.armAngle += (ang - this.fig.armAngle) * k
    this.fig.look += (Math.max(-1, Math.min(1, (fx - 232) / 300)) - this.fig.look) * Math.min(1, dt * 3)
    this.fig.breath = this.reduced ? 0.5 : (Math.sin(t * 1.5) + 1) / 2

    const gust = gustiness(t) * (this.reduced ? 0 : 1)
    this.fig.sway = this.reduced ? 0 : (noise(t * 0.5 + 3) - 0.4) * gust * 1.5

    // Her camera: up, flash, hold, down
    if (this.snapClock >= 0) {
      const c = (this.snapClock += dt)
      if (c - dt < 0.55 && c >= 0.55 && this.soundOn) this.audio?.shutter()
      this.fig.snap = smooth(0, 0.35, c) * (1 - smooth(1.15, 1.55, c))
      this.fig.flash = c > 0.55 ? Math.max(0, 1 - (c - 0.55) / 0.22) : 0
      if (c > 1.6) this.snapClock = -1
    }

    this.hoppers = this.hoppers.filter((h) => (h.t += dt) < h.dur + 0.3)
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
    const sun = sunAt(this.hour)

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

    // Sun and its haze
    if (sun) {
      this.layer(DEPTH.sky)
      const u = (this.hour - 11) / 7.9
      const disk = u < 0.7 ? '#FFFBEF' : u < 0.92 ? '#FFE7B8' : '#FFC488'
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

    // Hazy southern foothills
    this.layer(DEPTH.far)
    ctx.fillStyle = pal.far
    ctx.fill(scene.far)

    this.drawMountain(sun, at)

    // Lower forest down to the meadow
    this.layer(DEPTH.forest)
    ctx.fillStyle = pal.pineDark
    ctx.fill(scene.forestFill)
    for (const band of scene.forest) {
      ctx.fillStyle = pal.pineDark
      ctx.fill(band.dark)
      ctx.fillStyle = pal.pineLit
      ctx.fill(band.lit)
    }

    // Meadow, trail, and what grows out in it
    this.ground()
    ctx.fillStyle = pal.meadowFar
    ctx.fill(scene.meadowFar)
    ctx.fillStyle = rgba(pal.verge, 0.32)
    ctx.fill(scene.swath)
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
    ctx.fillStyle = pal.pineDark
    ctx.fill(scene.lone.dark)
    ctx.fillStyle = pal.pineLit
    ctx.fill(scene.lone.lit)
    ctx.fillStyle = pal.bush
    ctx.fill(scene.bushes)
    ctx.fillStyle = lit('#A6D84A', pal.light)
    ctx.fill(scene.bushBright)
    ctx.fillStyle = rgba(pal.pineDark, 0.45)
    ctx.fill(scene.bushShade)
    this.drawWalkers(at)

    // Grass, with the hikers standing in it
    this.screen()
    this.grass.draw(ctx, pal, this.groundPt, this.s, at, this.reduced ? 0 : 1, this.pointer, () => {
      this.layer(FIG_DEPTH)
      drawFigures(ctx, pal.light, this.fig)
      this.screen()
    })

    this.drawCritters()
    this.drawShadows(at)

    // Soft vignette, like the edge of a print
    this.screen()
    const v = ctx.createRadialGradient(this.W / 2, this.H * 0.45, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H * 0.45, Math.max(this.W, this.H) * 0.8)
    v.addColorStop(0, 'rgba(20,16,12,0)')
    v.addColorStop(1, `rgba(20,16,12,${0.22 + 0.15 * light.stars})`)
    ctx.fillStyle = v
    ctx.fillRect(0, 0, this.W, this.H)
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

    // A crescent moon, its dark side faintly lit by earthshine
    const moon = moonAt(this.hour)
    if (moon) {
      this.layer(DEPTH.sky)
      const [mx, my] = moon
      const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 90)
      glow.addColorStop(0, `rgba(230,226,205,${0.22 * light.stars})`)
      glow.addColorStop(1, 'rgba(230,226,205,0)')
      ctx.fillStyle = glow
      ctx.fillRect(mx - 90, my - 90, 180, 180)
      ctx.globalAlpha = light.stars
      ctx.save()
      ctx.beginPath()
      ctx.arc(mx, my, 13, 0, Math.PI * 2)
      ctx.fillStyle = '#F2ECD8'
      ctx.fill()
      ctx.clip()
      ctx.fillStyle = '#2A3146'
      ctx.beginPath()
      ctx.arc(mx + 6, my - 4, 12.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.globalAlpha = 1
    }
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

  private drawMountain(sun: Pt | null, at: number) {
    const { ctx, pal, scene, light } = this
    this.layer(DEPTH.mountain)
    ctx.fillStyle = pal.mtn
    ctx.fill(scene.mountain)
    ctx.fillStyle = rgba(pal.talus, 0.75)
    ctx.fill(scene.talus)
    ctx.fillStyle = pal.mtnDark
    ctx.fill(scene.stippleDark)
    ctx.fillStyle = pal.mtnLit
    ctx.fill(scene.stippleLit)
    ctx.fillStyle = pal.rockLit
    ctx.fill(scene.boulders)
    ctx.fillStyle = pal.rockShade
    ctx.fill(scene.boulderShade)
    ctx.fillStyle = pal.mtnDark
    ctx.fill(scene.talusTrees)

    for (const sl of scene.slabs) {
      ctx.fillStyle = pal.rockLit
      ctx.fill(sl.path)
      ctx.fillStyle = pal.rockShade
      ctx.fill(sl.shade)
      ctx.fillStyle = pal.rockHi
      ctx.fill(sl.hi)
      ctx.fillStyle = rgba(pal.rockShade, 0.4)
      ctx.fill(sl.streaks)
      ctx.fillStyle = rgba(pal.rockHi, 0.55)
      ctx.fill(sl.flecks)
      ctx.strokeStyle = rgba(pal.rockLine, 0.6)
      ctx.lineWidth = 1
      ctx.stroke(sl.lines)
      const lift = sl.id && (sl.id === this.hover || sl.id === this.pinned)
      if (lift) {
        ctx.fillStyle = 'rgba(255,244,226,0.16)'
        ctx.fill(sl.path)
        ctx.strokeStyle = 'rgba(255,248,232,0.95)'
        ctx.lineWidth = 1.4
        ctx.stroke(sl.path)
      }
    }
    ctx.fillStyle = pal.pineDark
    ctx.fill(scene.skirt.dark)
    ctx.fillStyle = pal.mtnLit
    ctx.fill(scene.skirt.lit)

    if (this.hover === 'green' || this.pinned === 'green') {
      ctx.strokeStyle = 'rgba(255,248,232,0.9)'
      ctx.lineWidth = 1.4
      ctx.stroke(scene.ridge)
    }

    // Backlit rim along the skyline when the sun drops behind it
    if (sun && sun[1] > 120) {
      const rim = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 420)
      const k = smooth(120, 280, sun[1]) * (1 - smooth(310, 420, sun[1]))
      rim.addColorStop(0, rgba(pal.glow, 0.95 * k))
      rim.addColorStop(1, rgba(pal.glow, 0))
      ctx.strokeStyle = rim
      ctx.lineWidth = 2.2
      ctx.stroke(scene.ridge)
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      const bloom = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 260)
      bloom.addColorStop(0, rgba(pal.glow, 0.45 * k))
      bloom.addColorStop(1, rgba(pal.glow, 0))
      ctx.fillStyle = bloom
      ctx.fillRect(sun[0] - 260, sun[1] - 260, 520, 520)
      ctx.restore()
    }

    // Headlamps of climbers still out on the rock after dark
    if (light.stars > 0.05) {
      HEADLAMP_ROUTES.forEach(([a, b], i) => {
        const u = (at * 0.004 + i * 0.37) % 1
        const x = a[0] + (b[0] - a[0]) * u + Math.sin(at * 0.7 + i) * 1.2
        const y = a[1] + (b[1] - a[1]) * u
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

  // Tiny hikers out on the far side of the meadow, like the ones in the photo
  private drawWalkers(at: number) {
    const { ctx, pal } = this
    const a = 1 - this.light.stars
    if (a < 0.05) return
    const people: [number, number, string][] = [
      [288, 468, '#B8433A'], [300, 469, '#E9E4DA'], [311, 467, '#3C6FA8'], [323, 468, '#B8433A'],
      [190, 466, '#D9783A'], [198, 467, '#3C6FA8'],
    ]
    const walk = (at * 3.2) % 480
    people.push([560 - walk, 462 + walk * 0.012, '#E9E4DA'], [572 - walk, 462 + walk * 0.012, '#8E3B54'])
    for (const [x, y, shirt] of people) {
      ctx.fillStyle = rgba(lit('#3A3A3E', pal.light), a)
      ctx.fillRect(x - 1, y - 3, 2, 3)
      ctx.fillStyle = rgba(lit(shirt, pal.light), a)
      ctx.fillRect(x - 1.2, y - 6.5, 2.4, 3.8)
      ctx.fillStyle = rgba(lit('#B88466', pal.light), a)
      ctx.fillRect(x - 0.8, y - 8.2, 1.6, 1.7)
    }
  }

  private drawCritters() {
    const { ctx, pal } = this
    this.screen()
    for (const m of this.motes) {
      ctx.fillStyle = rgba(pal.seed, Math.min(1, (1 - m.life / m.max) * 1.4))
      ctx.beginPath()
      ctx.ellipse(m.x, m.y, 2.2, 0.9, Math.atan2(m.vy, m.vx), 0, Math.PI * 2)
      ctx.fill()
    }

    // Band-winged grasshoppers flash their hindwings in flight
    for (const h of this.hoppers) {
      if (h.t < 0) continue
      const u = Math.min(1, h.t / h.dur)
      const x = h.x0 + (h.x1 - h.x0) * u
      const y = h.y0 + (h.y1 - h.y0) * u - Math.sin(u * Math.PI) * h.peak
      const fade = h.t > h.dur ? 1 - (h.t - h.dur) / 0.3 : 1
      // Mirror for leftward hops, then pitch the body along its arc
      const dir = h.x1 < h.x0 ? -1 : 1
      const vy = h.y1 - h.y0 - Math.cos(u * Math.PI) * Math.PI * h.peak
      const ang = u < 1 ? Math.atan2(vy, Math.abs(h.x1 - h.x0)) : 0
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(h.size * dir, h.size)
      ctx.rotate(ang)
      ctx.globalAlpha = fade
      if (u < 1) {
        // Fanned hindwing: yellow with a black outer band
        const open = 0.35 + 0.65 * Math.abs(Math.sin(h.t * 38))
        ctx.fillStyle = lit('#2B2116', pal.light)
        ctx.beginPath()
        ctx.moveTo(0, -0.5)
        ctx.arc(0, -0.5, 8.5, Math.PI + 0.25, Math.PI + 0.25 + 1.9 * open)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = lit('#F2B630', pal.light)
        ctx.beginPath()
        ctx.moveTo(0, -0.5)
        ctx.arc(0, -0.5, 6.2, Math.PI + 0.25, Math.PI + 0.25 + 1.9 * open)
        ctx.closePath()
        ctx.fill()
      }
      ctx.fillStyle = lit('#7F7048', pal.light)
      ctx.beginPath()
      ctx.ellipse(0, 0, 7.5, 2.3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = lit('#5E5236', pal.light)
      ctx.lineWidth = 1.1
      ctx.beginPath()
      const legs = u < 1 ? 0.5 : 1
      ctx.moveTo(-1, 0.5)
      ctx.lineTo(-5, -3 * legs)
      ctx.lineTo(-8, 2.5)
      ctx.moveTo(4, 1)
      ctx.lineTo(5, 3.5)
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  // Cloud shadows sliding across the mountain and the meadow on a sunny day
  private drawShadows(at: number) {
    const { ctx, light } = this
    if (light.sun < 0.05) return
    this.layer(DEPTH.mountain)
    ctx.save()
    ctx.clip(this.scene.land)
    ctx.globalCompositeOperation = 'multiply'
    const span = 2600
    for (const [x0, y, rx, ry] of [[300, 320, 170, 34], [900, 300, 220, 40], [520, 520, 280, 44], [1250, 580, 320, 56], [-200, 470, 260, 40]]) {
      const x = ((((x0 + 700 + at * 7) % span) + span) % span) - 700
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx)
      g.addColorStop(0, `rgba(96,110,150,${0.32 * light.sun})`)
      g.addColorStop(0.7, `rgba(96,110,150,${0.24 * light.sun})`)
      g.addColorStop(1, 'rgba(96,110,150,0)')
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(1, ry / rx)
      ctx.translate(-x, -y)
      ctx.fillStyle = g
      ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2)
      ctx.restore()
    }
    ctx.restore()
  }
}
