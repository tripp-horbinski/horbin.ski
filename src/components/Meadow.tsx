'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { CERTIFICATIONS, EDUCATION, PROFILE, ROLES } from '@/content/career'
import { PROJECTS } from '@/content/projects'
import { MeadowEngine, type Box } from '@/lib/meadow/engine'
import { featureById, type FeatureId } from '@/lib/meadow/features'
import { formatHour, paletteAt, phaseName, smooth } from '@/lib/meadow/palette'
import { CREDLY, EMAIL, GITHUB, LINKEDIN, RESUME_PDF } from '@/lib/site'

const GUIDE: FeatureId[] = ['first', 'second', 'third', 'fourth', 'fifth', 'green', 'meadow', 'trail', 'tripp']

// The scene opens at 2:45 in the afternoon, whatever the site's theme
const START_HOUR = 14.75

// The career walk the page scrolls through over the meadow: where its Resume
// button lands, a stop for each step of his career, oldest first, and today.
// Each stop sets the hour, from dawn for his first step to the hour the scene
// opens on, now
const DAWN = 6.5
const NOW = 2026 + 9 / 12
const yearOf = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return y + (m - 1) / 12
}
const hourOf = (month: string) => DAWN + ((yearOf(month) - 2014) / (NOW - 2014)) * (START_HOUR - DAWN)

type Step = {
  meta: string
  title: string
  org: string
  impact?: { value: string; label: string }[]
  text?: string
  // Somewhere to see more, for the Golden Jacket: Credly
  href?: string
  link?: string
  hour: number
}
const SCHOOL = EDUCATION[0]
// In the order they happened: school, each role (a role told in phases, a
// stop for each, so GoFundMe's turn to full stack is its own step), and the
// Golden Jacket where it fell
const STEPS: Step[] = [
  { month: SCHOOL.start, meta: SCHOOL.dates, title: SCHOOL.degree, org: SCHOOL.school },
  ...ROLES.flatMap((r) =>
    (r.phases ?? [{ label: '', dates: r.dates, start: r.start, highlights: r.highlights, impact: r.impact }]).map((p) => ({
      month: p.start,
      meta: p.dates,
      title: r.title,
      org: [r.org, p.label, r.place].filter(Boolean).join(' · '),
      impact: p.impact,
      // Without numbers, a stop leads with its first bullet
      text: p.impact.length ? undefined : p.highlights[0],
    })),
  ),
  ...CERTIFICATIONS.map((c) => ({ month: c.month, meta: c.date, title: c.name, org: c.issuer, text: c.note, href: c.href, link: 'Verify on Credly' })),
]
  .sort((a, b) => a.month.localeCompare(b.month))
  .map(({ month, ...step }) => ({ ...step, hour: hourOf(month) }))
// The hour at each stop: the summary, the steps, today, evening coming on
// over what he builds on his own time after the sun's left the meadow, and
// night under the stars for getting in touch
const EVENING = 18.9
const NIGHT = 21.5
const HOURS = [START_HOUR, ...STEPS.map((step) => step.hour), START_HOUR, EVENING, NIGHT]
const LATEST = ROLES[0]

// The ways to reach him, each with its mark
const ICON = { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true } as const
const CONTACT = [
  {
    label: 'Email',
    href: `mailto:${EMAIL}`,
    text: EMAIL,
    icon: (
      <svg {...ICON} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <rect x="1.5" y="3.25" width="13" height="9.5" rx="1.5" />
        <path d="M2 4l6 4.75L14 4" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: LINKEDIN,
    text: 'in/tripp-horbinski',
    icon: (
      <svg {...ICON}>
        <rect x="1" y="1" width="14" height="14" rx="2" fill="currentColor" />
        <circle cx="4.9" cy="4.8" r="1.1" fill="#F3EAD6" />
        <path d="M3.9 6.6h2v5.9h-2zM7.4 6.6h1.9v.9c.4-.7 1.2-1.1 2.1-1.1 1.6 0 2.3 1 2.3 2.7v3.4h-2V9.5c0-.8-.3-1.3-1-1.3s-1.3.5-1.3 1.4v2.9h-2z" fill="#F3EAD6" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: GITHUB,
    text: 'tripp-horbinski',
    icon: (
      <svg {...ICON} fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
  },
  {
    label: 'AWS certifications',
    href: CREDLY,
    text: 'Every AWS certification, on Credly',
    // A medal on its ribbon
    icon: (
      <svg {...ICON} viewBox="0 0 20 20" fill="currentColor">
        <path d="M5.5 1.5h3.2l1.3 4.2-2.4 1.9zM14.5 1.5h-3.2L10 5.7l2.4 1.9z" />
        <circle cx="10" cy="12.5" r="5.5" />
      </svg>
    ),
  },
]

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
  // The walk's stops, today, then the projects, in the order the page passes them
  const stepRefs = useRef<(HTMLElement | null)[]>([])
  // Scrolled past the opening screen, where the time-of-day options go
  const [past, setPast] = useState(false)
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

    // The cards live on the grass: they, and the first screen's scroll cue,
    // fade out where they'd scroll up past the meadow's far edge into the
    // trees and the mountain, a fade that's redrawn as they scroll
    const root = document.documentElement
    const clip = (grass: number) => {
      for (const id of ['home-cue', 'career', 'projects', 'contact']) {
        const el = document.getElementById(id)
        if (!el) continue
        const cut = grass - el.getBoundingClientRect().top
        const mask = cut > 0 ? `linear-gradient(to bottom, transparent ${cut}px, #000 ${cut + 28}px)` : ''
        el.style.maskImage = mask
        el.style.webkitMaskImage = mask
      }
    }

    // How far down the walk the page is, in stops (the summary 0, the steps
    // from 1, then today, the projects and getting in touch), by where the
    // stops' middles are against the middle of the grass; the hour follows it
    let raf = 0
    let shown = START_HOUR
    const measure = () => {
      raf = 0
      const grass = engine.horizon() + 6
      root.style.setProperty('--grass', `${Math.round(grass)}px`)
      clip(grass)
      const line = (grass + window.innerHeight) / 2
      const centers = stepRefs.current.map((el) => {
        const r = el!.getBoundingClientRect()
        return r.top + r.height / 2
      })
      const last = centers.length - 1
      let p = 0
      if (line >= centers[last]) p = last
      else if (line > centers[0]) {
        const i = centers.findIndex((c, k) => k < last && line >= c && line < centers[k + 1])
        p = i + (line - centers[i]) / (centers[i + 1] - centers[i])
      }
      const i = Math.min(last - 1, Math.floor(p))
      // The opening hour rewinds to dawn on the way to the first step
      const f = i === 0 ? smooth(0, 1, p - i) : p - i
      const h = HOURS[i] + (HOURS[i + 1] - HOURS[i]) * f
      engine.setHour(h)
      if (Math.abs(h - shown) > 1 / 12) {
        shown = h
        setHour(h)
      }
      setPast(window.scrollY > window.innerHeight * 0.5)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    measure()

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setPinned(null)
      setPanel(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      engine.destroy()
      engineRef.current = null
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('keydown', onKey)
      root.style.removeProperty('--grass')
    }
  }, [])

  // The Resume button and the bar's links slide down to their part of the page
  const toSection = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }
  const toCareer = toSection('career')

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
    <>
    <div className="meadow">
      <canvas
        ref={canvasRef}
        className="meadow-canvas"
        role="img"
        aria-label="Illustration of the Flatirons above Chautauqua Meadow in Boulder, Colorado, with golden late-summer grass and a trail post in the foreground."
      />

      <header className={`meadow-top${past ? ' meadow-top-away' : ''}`}>
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

      {/* The canvas picks Tripp out by his outline for the pointer; this link
          is for the keyboard and the screen reader */}
      <a ref={trippRef} href="#contact" className="meadow-tripp" onClick={toSection('contact')}>
        Get in touch with Tripp
      </a>

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

    {/* The page over the scene: who he is and the quick ways to his resume,
        then his career as a walk down the trail. Empty space lets the
        pointer through to the meadow */}
    <div className="home">
      <section className="home-hero" aria-labelledby="home-name">
        {/* Who he is and the quick ways to his resume and to him stay put
            over the sky while everything else scrolls */}
        <div className="home-head">
          <h1 id="home-name">Tripp Horbinski</h1>
          <p className="home-tagline">{PROFILE.tagline}</p>
          <p className="home-role">
            {PROFILE.headline} &middot; Milwaukee &middot; AWS Golden Jacket
          </p>
          <div className="home-actions">
            <a href="#career" className="meadow-sign" onClick={toCareer}>
              Resume
            </a>
            <a href="#contact" className="meadow-sign" onClick={toSection('contact')}>
              Get in touch
            </a>
          </div>
        </div>
        <a id="home-cue" href="#career" className="home-cue" onClick={toCareer} aria-label="Scroll to walk my career">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4.5 5l4.5 4.5L13.5 5M4.5 9.5L9 14l4.5-4.5" />
          </svg>
        </a>
      </section>

      <section id="career" className="home-walk" aria-labelledby="career-title">
        <div
          className="home-step"
          ref={(el) => {
            stepRefs.current[0] = el
          }}
        >
          <article className="home-card">
            <header>
              <span>Career</span>
            </header>
            <h2 id="career-title">{PROFILE.headline}</h2>
            <p>{PROFILE.intro}</p>
            <dl className="home-facts">
              <div>
                <dt>Most recently</dt>
                <dd>
                  {LATEST.title}, {LATEST.org} &middot; {LATEST.dates}
                </dd>
              </div>
              <div>
                <dt>Certified</dt>
                <dd>
                  {CERTIFICATIONS[0].name} &middot; {CERTIFICATIONS[0].date}
                </dd>
              </div>
            </dl>
            <div className="home-card-actions">
              <a href={RESUME_PDF} className="meadow-sign" target="_blank" rel="noopener noreferrer">
                View resume
              </a>
              <a href={RESUME_PDF} className="meadow-sign" download>
                Download PDF
              </a>
            </div>
            <p className="home-hint">Keep scrolling to walk it, 2014 to today.</p>
          </article>
        </div>

        {STEPS.map((step, i) => (
          <div
            // A role's phases share its title; with the dates each is unique
            key={`${step.title} ${step.meta}`}
            className="home-step"
            ref={(el) => {
              stepRefs.current[i + 1] = el
            }}
          >
            <article className="home-card">
              <header>
                <span>{step.meta}</span>
              </header>
              <h2>{step.title}</h2>
              <p className="home-org">{step.org}</p>
              {step.impact && step.impact.length > 0 && (
                <dl className="home-impact">
                  {step.impact.map((n) => (
                    <div key={n.label}>
                      <dt>{n.value}</dt>
                      <dd>{n.label}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {step.text && <p>{step.text}</p>}
              {step.href && (
                <a href={step.href} className="home-more" target="_blank" rel="noopener noreferrer">
                  {step.link} &rarr;
                </a>
              )}
            </article>
          </div>
        ))}

        <div
          className="home-step home-step-today"
          ref={(el) => {
            stepRefs.current[STEPS.length + 1] = el
          }}
        >
          <article className="home-card">
            <header>
              <span>Today</span>
            </header>
            <h2>That&apos;s the trail so far</h2>
            <p>The whole of it is on my resume, and I&apos;d like to hear from you.</p>
            <div className="home-card-actions">
              <a href={RESUME_PDF} className="meadow-sign" target="_blank" rel="noopener noreferrer">
                View resume
              </a>
              <a href={RESUME_PDF} className="meadow-sign" download>
                Download PDF
              </a>
              <a href="#contact" className="meadow-sign" onClick={toSection('contact')}>
                Get in touch
              </a>
            </div>
            <p className="home-hint">Keep scrolling for what I build on my own time.</p>
          </article>
        </div>
      </section>

      {/* What he builds because he loves to, as the evening comes on */}
      <section
        id="projects"
        className="home-projects"
        aria-labelledby="projects-title"
        ref={(el) => {
          stepRefs.current[STEPS.length + 2] = el
        }}
      >
        <div className="home-projects-hold">
        <header className="home-projects-head">
          <h2 id="projects-title">On my own time</h2>
          <p>Things I&apos;ve built because I love building them</p>
        </header>
        <div className="home-projects-list">
          {PROJECTS.map((p) => (
            <article key={p.id} className="home-card home-project">
              <header>
                <span>
                  {p.kind} &middot; {p.year}
                </span>
              </header>
              <h3>{p.name}</h3>
              <p>{p.summary}</p>
              <p className="home-stack">{p.stack.join(' · ')}</p>
              <div className="home-project-links">
                {p.link && (
                  <a href={p.link.href} className="home-more" target="_blank" rel="noopener noreferrer">
                    {p.link.text} &rarr;
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
        </div>
      </section>

      {/* Who he is off the keyboard and how to reach him, under the stars */}
      <section
        id="contact"
        className="home-step home-contact"
        aria-labelledby="contact-title"
        ref={(el) => {
          stepRefs.current[STEPS.length + 3] = el
        }}
      >
        <article className="home-card home-contact-card">
          <header>
            <span>Get in touch</span>
          </header>
          <h2 id="contact-title">I&apos;d like to hear from you</h2>
          <p>
            Off the keyboard I run marathons and backpack: in August 2025 I walked the{' '}
            Arctic Circle Trail, 167 km across Greenland. My long trail at home is the
            Ice Age Trail, and I&apos;m a dog dad to two{' '}
            <a href="https://puppe.rs" target="_blank" rel="noopener noreferrer">
              puppers
            </a>
            .
          </p>
          <ul className="home-contact-list">
            {CONTACT.map((c) => (
              <li key={c.label}>
                {c.icon}
                <a
                  href={c.href}
                  aria-label={`${c.label}: ${c.text}`}
                  {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {c.text}
                </a>
              </li>
            ))}
          </ul>
          <div className="home-card-actions">
            <a href={`mailto:${EMAIL}`} className="meadow-sign">
              Email me
            </a>
            <a href={RESUME_PDF} className="meadow-sign" download>
              Download PDF
            </a>
          </div>
        </article>
      </section>
    </div>

    </>
  )
}
