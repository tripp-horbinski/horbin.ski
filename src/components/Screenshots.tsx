'use client'

import Image from 'next/image'
import { useRef } from 'react'
import type { Shot } from '@/content/projects'

// A project's screenshots: a carousel showing one at a time, so its sign stays
// small, moved by its arrows or a swipe. One opens full size in a native
// <dialog>, which looks after focus and Esc, on a scrolling strip of its own, so
// swiping works there too. Its images are lazy, so none of them load until it's opened.
export default function Screenshots({ name, shots }: { name: string; shots: Shot[] }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const track = useRef<HTMLUListElement>(null)
  const row = useRef<HTMLUListElement>(null)

  const open = (i: number) => {
    dialog.current!.showModal()
    track.current!.scrollTo({ left: i * track.current!.clientWidth, behavior: 'instant' })
  }

  const step = (by: number) => {
    const t = track.current!
    const at = Math.round(t.scrollLeft / t.clientWidth)
    t.scrollTo({ left: ((at + by + shots.length) % shots.length) * t.clientWidth })
  }

  // One screenshot along, round to the other end from either end
  const slide = (by: number) => {
    const r = row.current!
    const width = r.firstElementChild!.getBoundingClientRect().width + parseFloat(getComputedStyle(r).columnGap)
    const last = shots.length - Math.round((r.clientWidth + parseFloat(getComputedStyle(r).columnGap)) / width)
    const at = Math.round(r.scrollLeft / width) + by
    r.scrollTo({ left: (at < 0 ? last : at > last ? 0 : at) * width })
  }

  return (
    <>
      <div className="shots" role="group" aria-label={`${name} screenshots`}>
        <ul ref={row} className="shots-track">
          {shots.map((s, i) => (
            <li key={s.full}>
              <button type="button" className="shot" aria-haspopup="dialog" onClick={() => open(i)}>
                <Image src={s.thumb} width={540} height={960} sizes="(min-width: 761px) 152px, 120px" alt={s.alt} />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="shot-button shots-prev" aria-label="Previous screenshots" onClick={() => slide(-1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button type="button" className="shot-button shots-next" aria-label="More screenshots" onClick={() => slide(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <dialog
        ref={dialog}
        className="shot-view"
        aria-label={`${name} screenshots`}
        onClick={(e) => {
          if (!(e.target as Element).closest('img, button')) dialog.current!.close()
        }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          step(e.key === 'ArrowLeft' ? -1 : 1)
        }}
      >
        <ul ref={track} className="shot-track">
          {shots.map((s) => (
            <li key={s.full}>
              <Image src={s.full} width={1080} height={1920} sizes="(min-width: 640px) 60vh, 100vw" alt={s.alt} />
            </li>
          ))}
        </ul>
        <button type="button" className="shot-button shot-close" aria-label="Close" onClick={() => dialog.current!.close()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <button type="button" className="shot-button shot-prev" aria-label="Previous screenshot" onClick={() => step(-1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button type="button" className="shot-button shot-next" aria-label="Next screenshot" onClick={() => step(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </dialog>
    </>
  )
}
