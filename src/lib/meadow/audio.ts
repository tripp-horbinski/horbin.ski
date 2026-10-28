// Generated ambience for the meadow: wind that follows the gusts, a rustle when
// you brush the grass, snowy tree crickets after dark, and the dry crackle of a
// band-winged grasshopper in flight. No audio files.

function noiseBuffer(ctx: AudioContext, seconds: number, brown: boolean) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    } else {
      data[i] = white
    }
  }
  return buf
}

interface Cricket {
  osc: OscillatorNode
  amp: GainNode
  period: number
  next: number
}

export class Ambience {
  private ctx: AudioContext
  private master: GainNode
  private wind: GainNode
  private windBand: BiquadFilterNode
  private rustle: GainNode
  private cricketBus: GainNode
  private crickets: Cricket[] = []
  private click: AudioBuffer
  private timer: number

  constructor() {
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)

    const brown = ctx.createBufferSource()
    brown.buffer = noiseBuffer(ctx, 4, true)
    brown.loop = true
    this.windBand = ctx.createBiquadFilter()
    this.windBand.type = 'bandpass'
    this.windBand.Q.value = 0.6
    this.windBand.frequency.value = 400
    this.wind = ctx.createGain()
    this.wind.gain.value = 0.1
    brown.connect(this.windBand).connect(this.wind).connect(this.master)
    brown.start()

    const white = ctx.createBufferSource()
    white.buffer = noiseBuffer(ctx, 2, false)
    white.loop = true
    const hiss = ctx.createBiquadFilter()
    hiss.type = 'bandpass'
    hiss.frequency.value = 4200
    hiss.Q.value = 0.5
    this.rustle = ctx.createGain()
    this.rustle.gain.value = 0
    white.connect(hiss).connect(this.rustle).connect(this.master)
    white.start()

    this.cricketBus = ctx.createGain()
    this.cricketBus.gain.value = 0
    this.cricketBus.connect(this.master)
    for (const [freq, period, pan] of [[2950, 0.52, -0.6], [3120, 0.61, 0.4], [2800, 0.47, 0.85]]) {
      const osc = ctx.createOscillator()
      osc.frequency.value = freq
      const amp = ctx.createGain()
      amp.gain.value = 0
      const panner = ctx.createStereoPanner()
      panner.pan.value = pan
      osc.connect(amp).connect(panner).connect(this.cricketBus)
      osc.start()
      this.crickets.push({ osc, amp, period, next: ctx.currentTime + Math.random() })
    }

    // A single dry click, repeated for the crackle of grasshopper wings
    this.click = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.006), ctx.sampleRate)
    const cd = this.click.getChannelData(0)
    for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cd.length, 3)

    this.timer = window.setInterval(() => this.schedule(), 120)
  }

  // Each snowy tree cricket chirps on its own steady beat
  private schedule() {
    const now = this.ctx.currentTime
    for (const c of this.crickets) {
      if (c.next < now) c.next = now + 0.05
      while (c.next < now + 0.4) {
        const g = c.amp.gain
        for (let p = 0; p < 3; p++) {
          const t = c.next + p * 0.028
          g.setValueAtTime(0, t)
          g.linearRampToValueAtTime(0.05, t + 0.004)
          g.linearRampToValueAtTime(0, t + 0.018)
        }
        c.next += c.period * (0.97 + Math.random() * 0.06)
      }
    }
  }

  setEnabled(on: boolean) {
    if (on && this.ctx.state === 'suspended') this.ctx.resume()
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.4)
  }

  // gust and brush in 0..1; night and day are the palette's light levels
  update(gust: number, brush: number, night: number) {
    const t = this.ctx.currentTime
    this.wind.gain.setTargetAtTime(0.05 + 0.32 * gust, t, 0.3)
    this.windBand.frequency.setTargetAtTime(260 + 520 * gust, t, 0.4)
    this.rustle.gain.setTargetAtTime(0.006 + 0.02 * gust + 0.12 * brush, t, 0.08)
    this.cricketBus.gain.setTargetAtTime(night, t, 0.8)
  }

  private tick(at: number, gain: number, freq: number) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.click
    const hp = this.ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = freq
    const g = this.ctx.createGain()
    g.gain.value = gain
    src.connect(hp).connect(g).connect(this.master)
    src.start(at)
  }

  crackle(duration: number) {
    let t = this.ctx.currentTime + 0.02
    const end = t + duration
    while (t < end) {
      this.tick(t, 0.18 + Math.random() * 0.2, 2400)
      t += 0.012 + Math.random() * 0.03
    }
  }

  destroy() {
    window.clearInterval(this.timer)
    this.ctx.close()
  }
}
