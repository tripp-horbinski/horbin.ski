'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { ARCTIC_CIRCLE_TRAIL } from '@/lib/arctic-circle-trail'

const { width: W, height: H, track, length: LENGTH, km: KM, camps, days, huts, start, end, gain, year } = ARCTIC_CIRCLE_TRAIL
// How much of the trail the map shows across when it's in close, in map units of 100 m
const ACROSS = 260
const P = 600
const PH = 44

// Where he is at a distance along the track: the point there, and the ground's height
function pointAt(along: number) {
  let lo = 0
  let hi = track.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (track[mid][2] <= along) lo = mid
    else hi = mid
  }
  const a = track[lo]
  const b = track[hi]
  const f = b[2] > a[2] ? Math.min(1, Math.max(0, (along - a[2]) / (b[2] - a[2]))) : 0
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ele: a[3] + (b[3] - a[3]) * f }
}

// The track between two distances along it, as SVG path data in map units
function stretch(a0: number, a1: number) {
  const points = [pointAt(a0), ...track.filter((t) => t[2] > a0 && t[2] < a1).map(([x, y]) => ({ x, y })), pointAt(a1)]
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')
}

// How far he's walked by his watch's count: its distances at each camp,
// in a straight line between them
const knots = [[0, 0], ...camps.map((c) => [c.along, c.km]), [LENGTH, KM]]
function kmAt(along: number) {
  const i = Math.max(0, knots.findIndex(([a], j) => j + 1 < knots.length && along <= knots[j + 1][0]))
  const [a0, k0] = knots[i]
  const [a1, k1] = knots[i + 1]
  return k0 + ((k1 - k0) * (along - a0)) / (a1 - a0 || 1)
}

// Near the map's east edge a label reads to its left, so it isn't cut off
const leftOf = (x: number) => (x > W - 40 ? ' trail-label-left' : '')

const highest = Math.max(...track.map((t) => t[3]))
const profileY = (ele: number) => PH - 2 - (ele / highest) * (PH - 6)
const profileLine = track.map(([, , a, e], i) => `${i ? 'L' : 'M'}${((a / LENGTH) * P).toFixed(1)} ${profileY(e).toFixed(1)}`).join('')
const ease = (f: number) => (f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2)
const hours = (h: number) => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min`
const climbed = (m: number) => `+${m.toLocaleString('en-US')} m`

// A night's camp by its hut, or out in the open by where it was
const campName = (c: (typeof camps)[number]) => (c.place === 'Camp' ? `a camp at km ${c.km}` : c.place)
const longest = Math.max(...days.map((d) => d.km))

// The trip a day at a time: the start, zoomed out on the whole trail, then
// each day's walk to that night's camp, and the last into Sisimiut, zoomed back
// out on the whole of it walked
const STOPS = [
  {
    tab: 'Start',
    along: 0,
    z: 0,
    eyebrow: `${start.date}–${end.date}, ${year}`,
    title: `${start.place} to ${end.place}`,
    stats: `${KM} km · ${days.length} days · ${climbed(gain)}`,
    note: `West from ${start.place}, near the edge of the ice sheet, to ${end.place} on the coast: ${camps.length} nights, ${camps.filter((c) => c.place !== 'Camp').length} of them at the trail's huts.`,
  },
  ...days.map((d, i) => {
    const camp = camps[i]
    const from = i === 0 ? start.place : campName(camps[i - 1])
    const to = camp ? campName(camp) : end.place
    return {
      tab: `${d.day}`,
      along: camp ? camp.along : LENGTH,
      z: camp ? 1 : 0,
      eyebrow: `Day ${d.day} · ${d.date}`,
      title: `${from[0].toUpperCase()}${from.slice(1)} to ${to}`,
      stats: `${d.km.toFixed(1)} km · ${climbed(d.gain)} · ${hours(d.hours)} on the trail`,
      note: [camp ? `Night ${camp.night} at ${campName(camp)}.` : `Into ${end.place}, on the coast.`, d.km === longest ? 'The longest day.' : '']
        .filter(Boolean)
        .join(' '),
    }
  }),
]
const LAST = STOPS.length - 1

// The Arctic Circle Trail as Tripp walked it in August 2025, from his watch's
// track: pick a day, or drag along the height strip, and a hiker walks the
// real track there while the map follows him. With reduced motion he jumps.
export default function TripMap() {
  const viewRef = useRef<HTMLDivElement>(null)
  const reducedRef = useRef(false)
  const motion = useRef({ along: 0, z: 0 })
  const [frame, setFrame] = useState(motion.current)
  // The stop he's walking to; `n` walks him back to it after a drag
  const [goal, setGoal] = useState({ i: 0, n: 0 })
  const [scrubbing, setScrubbing] = useState(false)
  const [view, setView] = useState({ w: 0, h: 0 })

  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = viewRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setView({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Walk him to the stop, zooming in or out as it asks
  useEffect(() => {
    if (scrubbing) return
    const from = { ...motion.current }
    const to = { along: STOPS[goal.i].along, z: STOPS[goal.i].z }
    const duration = reducedRef.current ? 0 : Math.min(1700, 650 + Math.abs(to.along - from.along) * 1.4)
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      // The frame's clock can start a moment before t0
      const f = duration ? Math.min(1, Math.max(0, (now - t0) / duration)) : 1
      const e = ease(f)
      motion.current = { along: from.along + (to.along - from.along) * e, z: from.z + (to.z - from.z) * e }
      setFrame(motion.current)
      if (f < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [goal, scrubbing])

  const go = (i: number) => setGoal((g) => ({ i: Math.max(0, Math.min(LAST, i)), n: g.n + 1 }))
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(goal.i + 1)
    else if (e.key === 'ArrowLeft') go(goal.i - 1)
    else return
    e.preventDefault()
  }

  // Dragging along the height strip walks him anywhere; letting go settles on
  // the nearest stop
  const nearestTo = (along: number) => STOPS.reduce((best, s, i) => (Math.abs(s.along - along) < Math.abs(STOPS[best].along - along) ? i : best), 0)
  function scrubTo(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    motion.current = { along: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * LENGTH, z: 1 }
    setFrame(motion.current)
  }
  function scrubStart(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrubbing(true)
    scrubTo(e)
  }
  function scrubEnd() {
    if (!scrubbing) return
    setScrubbing(false)
    go(nearestTo(motion.current.along))
  }

  const { along, z } = frame
  const here = pointAt(along)
  const active = scrubbing ? nearestTo(along) : goal.i
  const stop = STOPS[active]

  // The map's scale, zoomed between the whole trail and close in on him, and
  // where it sits in the window: centered on the trail when it's all in view,
  // on him when it's close, and never past its own edges
  const close = view.w ? Math.max(1.4, view.w / ACROSS) : 2
  const whole = view.w ? Math.min(view.w / (W + 30), view.h / (H + 30)) : 0.4
  const k = whole * (close / whole) ** z
  const cx = W / 2 + (here.x - W / 2) * z
  const cy = H / 2 + (here.y - H / 2) * z
  const fit = (size: number, extent: number, center: number) =>
    extent * k <= size ? (size - extent * k) / 2 : Math.min(0, Math.max(size - extent * k, size / 2 - center * k))
  const tx = fit(view.w, W, cx)
  const ty = fit(view.h, H, cy)
  const place = (x: number, y: number) => ({ left: x * k + tx, top: y * k + ty })
  // A scale bar of a round number of kilometers, 40 to 110 px long
  const perKm = (1000 / ARCTIC_CIRCLE_TRAIL.unit) * k
  const barKm = [1, 2, 5, 10, 20, 50].find((n) => n * perKm >= 40) ?? 50

  return (
    <figure className="trip" onKeyDown={onKey} style={{ '--leg': 'var(--accent)' } as CSSProperties}>
      <p className="trail-readout">
        <span>
          km {kmAt(along).toFixed(0)} &middot; {Math.round(here.ele)} m
        </span>
        <b>{stop.eyebrow}</b>
      </p>
      <div ref={viewRef} className={`trail-view${z < 0.5 ? ' trail-view-far' : ''}`}>
        <div
          className="trail-sheet"
          style={{ width: W * close, height: H * close, transform: `translate3d(${tx}px, ${ty}px, 0) scale(${k / close})` }}
        >
          {ARCTIC_CIRCLE_TRAIL.inks.map(({ ink, src }) => (
            <div
              key={ink}
              className={`map-ink ${ink === 'water' ? 'map-ink-lake' : ''}`}
              style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }}
              aria-hidden="true"
            />
          ))}
        </div>
        {/* The whole route faint, and in full as far as he's walked */}
        <svg className="trail-route" aria-hidden="true">
          <g transform={`translate(${tx} ${ty}) scale(${k})`} style={{ stroke: 'var(--accent)' }}>
            <path className="trail-route-ahead" d={stretch(0, LENGTH)} />
            {along > 0 && <path className="trail-route-walked" d={stretch(0, along)} />}
          </g>
        </svg>
        {huts
          .filter((hut) => !camps.some((c) => Math.hypot(c.x - hut.x, c.y - hut.y) < 8))
          .map((hut) => (
            <span key={hut.name} className={`trail-hut${leftOf(hut.x)}`} style={place(hut.x, hut.y)} aria-hidden="true">
              <i />
              <span>{hut.name}</span>
            </span>
          ))}
        {[start, end].map((town) => (
          <span key={town.place} className={`trail-town${leftOf(town.x)}`} style={place(town.x, town.y)} aria-hidden="true">
            <i />
            <span>{town.place}</span>
          </span>
        ))}
        {camps.map((c, i) => (
          <button
            key={c.night}
            type="button"
            onClick={() => go(i + 1)}
            className={`trail-camp${i + 1 === active ? ' trail-camp-active' : c.along <= along ? ' trail-camp-reached' : ''}${leftOf(c.x)}`}
            style={place(c.x, c.y)}
            aria-label={`Night ${c.night}, ${campName(c)}`}
          >
            <i>{c.night}</i>
            <span>{c.place === 'Camp' ? `Night ${c.night}` : c.place}</span>
          </button>
        ))}
        <p className="trail-title" style={{ opacity: Math.max(0, 1 - z * 2) }} aria-hidden="true">
          <b>Arctic Circle Trail</b>
          <span>
            West Greenland &middot; {KM} km &middot; {days.length} days
          </span>
        </p>
        <p className="trail-scale" aria-hidden="true">
          <i style={{ width: barKm * perKm }} />
          {barKm} km
        </p>
        <span className="trail-hiker" style={place(here.x, here.y)} aria-hidden="true">
          {/* A hiker with his pack and pole, walking west */}
          <svg viewBox="0 0 20 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8.5" cy="3.4" r="2.3" fill="currentColor" stroke="none" />
            <rect x="10.8" y="6.6" width="4.6" height="7" rx="1.4" fill="currentColor" stroke="none" />
            <path d="M9.4 7.2L9 14.2L11.8 22M9 14.2L5.8 21.6M8.8 9.4L5 12.2M3.2 9.6L3.2 22.4" />
          </svg>
        </span>
      </div>

      <nav className="trail-bar" aria-label="Days on the trail">
        <button type="button" className="trail-step" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous day">
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M7.5 2.5L4 6l3.5 3.5" />
          </svg>
        </button>
        <ol>
          {STOPS.map((s, i) => (
            <li key={s.tab}>
              <button type="button" onClick={() => go(i)} aria-current={i === active ? 'step' : undefined} aria-label={s.eyebrow}>
                {i && i === active ? `Day ${s.tab}` : s.tab}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="trail-step" onClick={() => go(active + 1)} disabled={active === LAST} aria-label="Next day">
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M4.5 2.5L8 6l-3.5 3.5" />
          </svg>
        </button>
      </nav>

      <div
        className="trail-profile"
        onPointerDown={scrubStart}
        onPointerMove={(e) => scrubbing && scrubTo(e)}
        onPointerUp={scrubEnd}
        onPointerCancel={scrubEnd}
        title="Drag to walk the trail"
        aria-hidden="true"
      >
        <svg viewBox={`0 0 ${P} ${PH}`} preserveAspectRatio="none">
          <defs>
            <clipPath id="trip-profile-walked">
              <rect x="0" y="0" width={(along / LENGTH) * P} height={PH} />
            </clipPath>
          </defs>
          <path className="trail-profile-fill" d={`${profileLine}L${P} ${PH}L0 ${PH}Z`} />
          <path className="trail-profile-line" d={profileLine} />
          <path className="trail-profile-walked" d={profileLine} clipPath="url(#trip-profile-walked)" />
          <line className="trail-profile-here" x1={(along / LENGTH) * P} x2={(along / LENGTH) * P} y1="0" y2={PH} />
        </svg>
        <p>
          <span>
            {start.place} <b>{start.date}</b>
          </span>
          <span>
            {end.place} <b>{end.date}</b>
          </span>
        </p>
      </div>

      <div className="trip-day" aria-live="polite">
        <p className="trail-eyebrow">{stop.eyebrow}</p>
        <h3>{stop.title}</h3>
        <p className="trip-stats">{stop.stats}</p>
        <p>{stop.note}</p>
      </div>

      <figcaption className="trip-credit">
        Track from my watch. Elevation: Copernicus DEM GLO-30, &copy; DLR e.V. 2010–2014 and &copy; Airbus Defence and Space
        GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA. Huts &copy; OpenStreetMap contributors.
        Contours every 50 m.
      </figcaption>
    </figure>
  )
}
