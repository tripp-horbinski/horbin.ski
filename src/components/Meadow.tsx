'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { MeadowEngine, type Box } from '@/lib/meadow/engine'
import { featureById, type FeatureId } from '@/lib/meadow/features'
import { formatHour, paletteAt, phaseName } from '@/lib/meadow/palette'

const GUIDE: FeatureId[] = ['first', 'second', 'third', 'fourth', 'fifth', 'green', 'meadow', 'trail', 'tripp']

// The scene opens at 2:45 in the afternoon, whatever the site's theme
const START_HOUR = 14.75

function boulderHour() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return get('hour') + get('minute') / 60
}

function placeLabel(el: HTMLElement | null, pos: [number, number] | null) {
  if (!el) return
  el.style.visibility = pos ? 'visible' : 'hidden'
  if (pos) el.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`
}

// Beside the anchor, flipped and clamped to stay on screen
function placeNote(el: HTMLElement | null, pin: HTMLElement | null, pos: [number, number] | null) {
  placeLabel(pin, pos)
  if (!el) return
  el.style.visibility = pos ? 'visible' : 'hidden'
  if (!pos) return
  const W = window.innerWidth
  const H = window.innerHeight
  const w = el.offsetWidth
  const h = el.offsetHeight
  let left = pos[0] + 26
  if (left + w > W - 16) left = pos[0] - 26 - w
  left = Math.max(16, Math.min(W - w - 16, left))
  const top = Math.max(84, Math.min(H - h - 112, pos[1] - 34))
  el.style.transform = `translate(${left}px, ${top}px)`
}

// Over Tripp, wherever he is on screen
function placeLink(el: HTMLElement | null, b: Box) {
  if (!el) return
  el.style.visibility = 'visible'
  el.style.width = `${b.w}px`
  el.style.height = `${b.h}px`
  el.style.transform = `translate(${b.x}px, ${b.y}px)`
}

export default function Meadow() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<MeadowEngine | null>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const trippRef = useRef<HTMLAnchorElement>(null)
  const [hour, setHour] = useState(START_HOUR)
  const [playing, setPlaying] = useState(false)
  const [sound, setSound] = useState(false)
  const [hover, setHover] = useState<FeatureId | null>(null)
  const [pinned, setPinned] = useState<FeatureId | null>(null)
  // The time of day, sound and field guide wait in one panel, so the scene has the screen
  const [panel, setPanel] = useState(false)
  const [touch, setTouch] = useState(false)

  const select = useRef<(id: FeatureId) => void>(() => {})
  select.current = (id) => {
    const f = featureById(id)
    if (f.href) router.push(f.href)
    else setPinned((p) => (p === id ? null : id))
  }

  useEffect(() => {
    setTouch(window.matchMedia('(hover: none)').matches)
    const engine = new MeadowEngine(canvasRef.current!, START_HOUR, {
      onHover: setHover,
      onSelect: (id) => select.current(id),
      onHour: setHour,
      onAnchors: (h, p) => {
        placeLabel(labelRef.current, h)
        placeNote(noteRef.current, pinRef.current, p)
      },
      onTripp: (box) => placeLink(trippRef.current, box),
    })
    engineRef.current = engine

    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setPinned(null)
      setPanel(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      engine.destroy()
      engineRef.current = null
      root.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => engineRef.current?.setPinned(pinned), [pinned])
  useEffect(() => engineRef.current?.setPlaying(playing), [playing])

  // A strip of the day's sky colors for the time slider
  const track = useMemo(
    () =>
      `linear-gradient(90deg, ${Array.from({ length: 49 }, (_, i) => `${paletteAt(i / 2).sky1} ${((i / 48) * 100).toFixed(1)}%`).join(', ')})`,
    [],
  )

  function changeHour(h: number) {
    setHour(h)
    engineRef.current?.setHour(h)
  }

  // Audio has to start inside the click, so this skips the effect round-trip
  function toggleSound() {
    const next = !sound
    setSound(next)
    engineRef.current?.setSound(next)
  }

  function openFromGuide(id: FeatureId) {
    const href = featureById(id).href
    if (href) return router.push(href)
    setPinned(id)
    setPanel(false)
    requestAnimationFrame(() => closeRef.current?.focus())
  }

  const note = pinned ? featureById(pinned) : null

  return (
    <div className="meadow">
      <canvas
        ref={canvasRef}
        className="meadow-canvas"
        role="img"
        aria-label="Illustration of the Flatirons above Chautauqua Meadow in Boulder, Colorado, with golden late-summer grass and a trail post in the foreground."
      />

      <header className="meadow-top">
        <button
          type="button"
          className="meadow-sign"
          onClick={() => setPanel((p) => !p)}
          aria-expanded={panel}
          aria-controls="meadow-panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
          </svg>
          <span className="hidden sm:inline">Options</span>
        </button>
      </header>

      <div className="meadow-title">
        <h1>Tripp Horbinski</h1>
      </div>

      {/* The canvas picks Tripp out by his outline for the pointer; this link
          is for the keyboard and the screen reader */}
      <Link ref={trippRef} href="/about/" className="meadow-tripp">
        About Tripp
      </Link>

      {panel && (
        <div id="meadow-panel" className="meadow-panel">
          <div className="meadow-clock">
            <button
              type="button"
              className="meadow-play"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause the day' : 'Let the day pass'}
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <rect x="2.5" y="2" width="3" height="10" fill="currentColor" />
                  <rect x="8.5" y="2" width="3" height="10" fill="currentColor" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3.5 2L12 7L3.5 12Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <label htmlFor="meadow-time" className="sr-only">
              Time of day
            </label>
            <input
              id="meadow-time"
              className="meadow-range"
              type="range"
              min={0}
              max={24}
              step={1 / 12}
              value={hour}
              onChange={(e) => changeHour(Number(e.target.value))}
              aria-valuetext={`${formatHour(hour)}, ${phaseName(hour)}`}
              style={{ '--track': track } as CSSProperties}
            />
            <button type="button" className="meadow-now" onClick={() => changeHour(boulderHour())}>
              Now
            </button>
            <output htmlFor="meadow-time" className="meadow-readout">
              <strong>{formatHour(hour)}</strong>
              <span>{phaseName(hour)}</span>
            </output>
          </div>

          <button type="button" className="meadow-sign" onClick={toggleSound} aria-pressed={sound}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
              {sound ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
            </svg>
            Sound {sound ? 'on' : 'off'}
          </button>

          <nav className="meadow-guide" aria-label="Field guide">
            <h2>Field guide</h2>
            <ol>
              {GUIDE.map((id) => {
                const f = featureById(id)
                return (
                  <li key={id}>
                    <button type="button" onClick={() => openFromGuide(id)}>
                      <span>{f.name}</span>
                      <small>{f.meta}</small>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          <p className="meadow-hint">
            {touch ? 'Drag to look around' : 'Move to look around'} &middot; Point at the rocks &middot; Tap the grass
          </p>
        </div>
      )}

      <div ref={labelRef} className="meadow-label" aria-hidden="true">
        {hover && hover !== pinned && <span>{featureById(hover).name}</span>}
      </div>
      <div ref={pinRef} className="meadow-pin" aria-hidden="true" hidden={!note} />
      <section
        ref={noteRef}
        className="meadow-note"
        hidden={!note}
        aria-labelledby="meadow-note-title"
        aria-live="polite"
      >
        {note && (
          <>
            <header>
              <h2 id="meadow-note-title">{note.name}</h2>
              <button ref={closeRef} type="button" onClick={() => setPinned(null)} aria-label="Close note">
                &times;
              </button>
            </header>
            <p className="meadow-note-meta">{note.meta}</p>
            <p>{note.note}</p>
          </>
        )}
      </section>
    </div>
  )
}
