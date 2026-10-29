'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'

export type Span = {
  // The section on the page it scrolls to
  id: string
  // Its name on the line, and in full for its tooltip
  label: string
  title: string
  // In years, e.g. 2023.25 for the start of April 2023
  start: number
  end: number
  color: string
  school?: boolean
}

export type Mark = { id: string; label: string; at: number; color: string }

// His career on one line, years to scale: a bar for school and each role,
// a marker for the Golden Jacket. It stays at the top of the screen while the
// page scrolls under it, the part being read lit up, and each bar or marker
// scrolls to its section.
export default function CareerTimeline({ spans, marks, from, to }: { spans: Span[]; marks: Mark[]; from: number; to: number }) {
  const lineRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string | null>(null)
  const pct = (year: number) => `${((year - from) / (to - from)) * 100}%`
  const years = Array.from({ length: Math.floor((to - from) / 2) + 1 }, (_, i) => from + i * 2).filter((y) => y < to)

  // The section being read: the last whose top has come up past two fifths
  // of the way down the screen, or just under the line on a short one
  useEffect(() => {
    const ids = [...spans.map((s) => s.id), ...marks.map((m) => m.id)]
    let raf = 0
    const measure = () => {
      raf = 0
      const below = Math.max((lineRef.current?.getBoundingClientRect().bottom ?? 0) + 24, window.innerHeight * 0.4)
      let best: { id: string; top: number } | null = null
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top !== undefined && top <= below && (!best || top > best.top)) best = { id, top }
      }
      setActive(best?.id ?? null)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [spans, marks])

  function go(e: MouseEvent, id: string) {
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    const bar = lineRef.current?.offsetHeight ?? 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - bar - 16, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <nav ref={lineRef} className="career-line" aria-label="Career timeline">
      <div className="career-track">
        {spans.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => go(e, s.id)}
            className={`career-span${s.school ? ' career-span-school' : ''}${active === s.id ? ' career-span-active' : ''}`}
            style={{ left: pct(s.start), width: pct(from + s.end - s.start), '--leg': s.color } as CSSProperties}
            aria-current={active === s.id ? 'location' : undefined}
            aria-label={s.title}
            title={s.title}
          >
            <span>{s.label}</span>
          </a>
        ))}
        {marks.map((m) => (
          <a
            key={m.id}
            href={`#${m.id}`}
            onClick={(e) => go(e, m.id)}
            className={`career-mark${active === m.id ? ' career-span-active' : ''}`}
            style={{ left: pct(m.at), '--leg': m.color } as CSSProperties}
            aria-label={m.label}
            title={m.label}
          >
            <i />
          </a>
        ))}
      </div>
      <div className="career-years" aria-hidden="true">
        {years.map((y) => (
          <span key={y} style={{ left: pct(y) }}>
            {y}
          </span>
        ))}
      </div>
    </nav>
  )
}
