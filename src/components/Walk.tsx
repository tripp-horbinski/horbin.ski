'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { RESUME_PDF } from '@/lib/site'

// The sideways walk: the page's ordinary scroll carries the signs across the
// screen in front of the still meadow, so the wheel, trackpad, keyboard and
// scrollbar all work as usual. When the scrolling stops between signs, it
// settles on the next one in the direction it was going, so one gesture is one
// sign. With reduced motion or on a very short screen, the signs simply stack.
const STANDS_STILL = '(prefers-reduced-motion: reduce), (max-height: 560px)'
// How long the scrolling has to pause before it settles, and how small a nudge
// falls back to where it was instead of going on to the next sign
const SETTLE_MS = 140
const NUDGE_PX = 24

export default function Walk({ labels, children }: { labels: string[]; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current!
    const view = viewRef.current!
    const track = trackRef.current!
    const home = root.closest<HTMLElement>('.home')!
    const still = window.matchMedia(STANDS_STILL)
    const stops = labels.length
    let top = 0
    let length = 0
    let frame = 0
    let settleTimer = 0
    // The stop it last came to rest on: 0 is the open meadow, then each sign.
    // Null while it's out on the page below the walk
    let restingAt: number | null = 0
    let held = false

    const draw = () => {
      frame = 0
      const t = still.matches || !length ? 0 : Math.min(1, Math.max(0, (window.scrollY - top) / length))
      track.style.transform = still.matches ? '' : `translate3d(${(1 - t * stops) * view.clientWidth}px, 0, 0)`
      home.style.setProperty('--walk', String(t))
      home.toggleAttribute('data-walking', t > 0)
      // Past the last stop the last sign rises with the page and pushes his name
      // and line up out of the sky at the same speed, while the markers fade. On
      // screens where it reaches up over the résumé button, that moves to the markers
      const exit = still.matches ? 0 : Math.max(0, window.scrollY - top - length)
      home.style.setProperty('--exit', `${exit}px`)
      home.style.setProperty('--leave', String(Math.max(0, 1 - exit / (0.25 * view.offsetHeight))))
      home.toggleAttribute('data-gone', exit > 260)
      home.toggleAttribute('data-last', t * stops > stops - 0.5)
      const at = Math.round(t * stops) - 1
      navRef.current?.querySelectorAll('[data-stop]').forEach((b, i) => {
        if (i === at) b.setAttribute('aria-current', 'step')
        else b.removeAttribute('aria-current')
      })
    }
    const layout = () => {
      home.style.setProperty('--walk-len', still.matches ? '0px' : `${stops * 80}vw`)
      root.classList.toggle('walk-on', !still.matches)
      top = root.getBoundingClientRect().top + window.scrollY
      length = root.offsetHeight - view.offsetHeight
      draw()
    }
    const go = (i: number, behavior?: ScrollBehavior) => {
      if (!still.matches) window.scrollTo({ top: top + ((i + 1) / stops) * length, behavior })
    }

    const settle = () => {
      if (held || still.matches || !length || document.querySelector('dialog[open]')) return
      const y = window.scrollY - top
      const gap = length / stops
      if (y > length + 1) {
        restingAt = null
        return
      }
      const at = y / gap
      if (Math.abs(at - Math.round(at)) * gap < 1) {
        restingAt = Math.round(at)
        return
      }
      let to = Math.round(at)
      if (restingAt !== null) {
        const moved = y - restingAt * gap
        if (Math.abs(moved) < NUDGE_PX) to = restingAt
        else to = moved > 0 ? Math.ceil(at) : Math.floor(at)
      }
      restingAt = to
      window.scrollTo({ top: top + to * gap })
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(draw)
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(settle, SETTLE_MS)
    }
    // Not while a finger or the scrollbar is still holding the page
    const onHold = () => {
      held = true
    }
    const onRelease = () => {
      held = false
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(settle, SETTLE_MS)
    }
    // A link to the numbers, from the chevron, walks to the first stop
    const onClick = (e: MouseEvent) => {
      const stop = (e.target as Element).closest<HTMLElement>('[data-stop]')
      if (stop) return go(Number(stop.dataset.stop))
      if ((e.target as Element).closest('a[href="#numbers"]') && !still.matches) {
        e.preventDefault()
        go(0)
      }
    }
    // Tabbing to something on a sign brings that sign into view
    const onFocus = (e: FocusEvent) => {
      const stop = (e.target as Element).closest('.walk-stop')
      if (stop) go(Array.from(track.children).indexOf(stop), 'instant')
    }

    layout()
    if (window.location.hash === '#numbers') go(0, 'instant')
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', layout)
    window.addEventListener('pointerdown', onHold)
    window.addEventListener('pointerup', onRelease)
    window.addEventListener('pointercancel', onRelease)
    window.addEventListener('touchstart', onHold, { passive: true })
    window.addEventListener('touchend', onRelease, { passive: true })
    still.addEventListener('change', layout)
    document.addEventListener('click', onClick)
    track.addEventListener('focusin', onFocus)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      window.removeEventListener('pointerdown', onHold)
      window.removeEventListener('pointerup', onRelease)
      window.removeEventListener('pointercancel', onRelease)
      window.removeEventListener('touchstart', onHold)
      window.removeEventListener('touchend', onRelease)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', layout)
      still.removeEventListener('change', layout)
      document.removeEventListener('click', onClick)
      track.removeEventListener('focusin', onFocus)
    }
  }, [labels.length])

  return (
    <div ref={rootRef} className="walk">
      <div ref={viewRef} className="walk-view">
        <div ref={trackRef} className="walk-track">
          {children}
        </div>
        <nav ref={navRef} className="walk-nav" aria-label="Stops on the walk">
          {labels.map((label, i) => (
            <button key={label} type="button" data-stop={i}>
              <span>{label}</span>
            </button>
          ))}
          <a href="#work" className="walk-nav-more">
            Full story
          </a>
          <a href={RESUME_PDF} className="walk-nav-resume" target="_blank" rel="noopener noreferrer">
            Résumé
          </a>
        </nav>
      </div>
    </div>
  )
}
