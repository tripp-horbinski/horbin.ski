'use client'

import Image from 'next/image'
import { useRef } from 'react'
import type { Shot } from '@/content/projects'

// A project's screenshots, as on its store listing: a row of them, a strip to
// swipe where they don't fit. One opens full size in a native <dialog>, which
// looks after focus and Esc, on a scrolling strip of its own, so swiping works
// there too. Its images are lazy, so none of them load until it's opened.
export default function Screenshots({ name, shots }: { name: string; shots: Shot[] }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const track = useRef<HTMLUListElement>(null)

  const open = (i: number) => {
    dialog.current!.showModal()
    track.current!.scrollTo({ left: i * track.current!.clientWidth, behavior: 'instant' })
  }

  const step = (by: number) => {
    const t = track.current!
    const at = Math.round(t.scrollLeft / t.clientWidth)
    t.scrollTo({ left: ((at + by + shots.length) % shots.length) * t.clientWidth })
  }

  return (
    <>
      <ul className="shots">
        {shots.map((s, i) => (
          <li key={s.full}>
            <button type="button" className="shot" aria-haspopup="dialog" onClick={() => open(i)}>
              <Image src={s.thumb} width={540} height={960} sizes="(min-width: 1024px) 180px, 168px" alt={s.alt} />
            </button>
          </li>
        ))}
      </ul>
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
