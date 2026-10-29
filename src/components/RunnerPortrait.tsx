'use client'

import { useEffect, useRef, useState } from 'react'
import { blend, paletteAt, rgba, type Palette } from '@/lib/meadow/palette'
import { drawFigure, FIGURES, type FigureName } from '@/lib/meadow/runner'

// Preview hours, to see the figure in the light it will get in the meadow
const LIGHTS = [
  { label: 'Morning', hour: 8.5 },
  { label: 'Midday', hour: 12.5 },
  { label: 'Golden hour', hour: 18.1 },
  { label: 'Night', hour: 22 },
]

function backdrop(ctx: CanvasRenderingContext2D, W: number, H: number, pal: Palette) {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7)
  sky.addColorStop(0, pal.sky0)
  sky.addColorStop(0.7, pal.sky1)
  sky.addColorStop(1, pal.sky2)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // A hazy ridge, and the meadow in front
  ctx.fillStyle = blend(pal.mtn, pal.sky2, 0.45)
  ctx.beginPath()
  ctx.moveTo(0, H * 0.66)
  ctx.bezierCurveTo(W * 0.25, H * 0.6, W * 0.45, H * 0.55, W * 0.62, H * 0.54)
  ctx.bezierCurveTo(W * 0.78, H * 0.53, W * 0.9, H * 0.58, W, H * 0.6)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.fill()
  ctx.fillStyle = pal.meadowFar
  ctx.fillRect(0, H * 0.68, W, H)
  ctx.fillStyle = pal.meadowMid
  ctx.beginPath()
  ctx.moveTo(0, H * 0.8)
  ctx.quadraticCurveTo(W * 0.5, H * 0.76, W, H * 0.81)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.fill()
}

const DESCRIPTIONS: Record<FigureName, string> = {
  finish:
    'Screen print of Tripp after the Milwaukee Lakefront Marathon, smiling and throwing a shaka: backwards black cap, stubble, a black La Sportiva singlet fading to orange and yellow, black shorts, a moose tattoo on his thigh, a black watch, a water bottle in the other hand, and tan Hoka running shoes.',
  bridge:
    'Screen print of Tripp running across the Hoan Bridge in the Milwaukee Lakefront Marathon, mid-stride with his fists up: backwards black cap, stubble, a black La Sportiva singlet fading to orange and yellow, black shorts, a moose tattoo on his thigh, a black watch, and tan Hoka running shoes.',
}

export default function RunnerPortrait({ figure = 'finish' }: { figure?: FigureName }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hour, setHour] = useState(12.5)
  const { art, stance } = FIGURES[figure]

  // The print is still, so it only redraws for a new hour or a new size
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const W = rect.width
      const H = rect.height
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      const pal = paletteAt(hour)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      backdrop(ctx, W, H, pal)

      // Figure scaled to stand on the meadow with room above the cap, a
      // shadow along the line through his feet
      const k = (H * 0.88) / (art.y1 - art.y0)
      const fx = W * 0.5
      const fy = H * 0.97 - (art.y1 - art.footY) * k
      ctx.fillStyle = rgba(pal.pineDark, 0.28)
      ctx.beginPath()
      ctx.ellipse(fx, fy, (stance.length / 2 + 30) * k, 16 * k, stance.angle, 0, Math.PI * 2)
      ctx.fill()
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (fx - art.footX * k), dpr * (fy - art.footY * k))
      drawFigure(ctx, art, pal.light)
    }
    draw()
    const resize = new ResizeObserver(draw)
    resize.observe(canvas)
    return () => resize.disconnect()
  }, [hour, art, stance])

  return (
    <figure className="portrait">
      <canvas
        ref={canvasRef}
        className="portrait-canvas"
        role="img"
        aria-label={DESCRIPTIONS[figure]}
      />
      <figcaption className="portrait-lights">
        {LIGHTS.map((l) => (
          <button key={l.label} type="button" className="meadow-sign" aria-pressed={hour === l.hour} onClick={() => setHour(l.hour)}>
            {l.label}
          </button>
        ))}
      </figcaption>
    </figure>
  )
}
