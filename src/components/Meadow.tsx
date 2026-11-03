'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { PROFILE } from '@/content/career'
import { MeadowEngine, type Box } from '@/lib/meadow/engine'
import type { Pt } from '@/lib/meadow/scene'
import { PUPPERS, RESUME_PDF } from '@/lib/site'

function placeTag(el: HTMLElement | null, pos: Pt | null) {
  if (!el) return
  el.style.visibility = pos ? 'visible' : 'hidden'
  if (pos) el.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`
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
  const heroRef = useRef<HTMLElement>(null)
  const spotRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tagRef = useRef<HTMLDivElement>(null)
  const trippRef = useRef<HTMLAnchorElement>(null)
  const dogsRef = useRef<HTMLAnchorElement>(null)
  const [onTripp, setOnTripp] = useState(false)

  const select = useEffectEvent((id: 'tripp' | 'dogs') => {
    if (id === 'dogs') window.open(PUPPERS, '_blank', 'noopener,noreferrer')
    else router.push('/#contact')
  })

  useEffect(() => {
    const engine = new MeadowEngine(canvasRef.current!, {
      onHoverTripp: setOnTripp,
      onSelect: (id) => select(id),
      onTag: (at) => placeTag(tagRef.current, at),
      onTripp: (box) => placeLink(trippRef.current, box),
      onDogs: (box) => placeLink(dogsRef.current, box),
    })

    // The meadow holds still while the page rises over it. Once it's covered it
    // stops drawing and hides, so the keyboard can't land on anything under the page
    const seen = new IntersectionObserver(([entry]) => {
      engine.setVisible(entry.isIntersecting)
      if (heroRef.current) heroRef.current.style.visibility = entry.isIntersecting ? '' : 'hidden'
    })
    seen.observe(spotRef.current!)

    return () => {
      seen.disconnect()
      engine.destroy()
    }
  }, [])

  return (
    // The opening screen: the meadow, and over its sky his name, his line and
    // his resume a click away. The page scrolls it away
    <>
      <div ref={spotRef} className="home-spot" aria-hidden="true" />
      <section ref={heroRef} className="home-hero" aria-labelledby="home-name">
        <div className="meadow">
          <canvas
            ref={canvasRef}
            className="meadow-canvas"
            role="img"
            aria-label="Illustration of the Flatirons above Chautauqua Meadow in Boulder, Colorado, with golden late-summer grass and a trail post in the foreground."
          />

          {/* The canvas picks Tripp out by his outline for the pointer; this link
              is for the keyboard and the screen reader */}
          <a ref={trippRef} href="#contact" className="meadow-tripp">
            Get in touch with Tripp
          </a>
          {/* And his dogs, the same way */}
          <a ref={dogsRef} href={PUPPERS} target="_blank" rel="noopener noreferrer" className="meadow-dogs">
            Tripp&apos;s dogs, on puppe.rs, his app for pet sitters
          </a>

          <div ref={tagRef} className="meadow-label" aria-hidden="true">
            {onTripp && <span>Meet Tripp</span>}
          </div>
        </div>

        <div className="home-head">
          <h1 id="home-name">Tripp Horbinski</h1>
          <p className="home-tagline">{PROFILE.tagline}</p>
          <div className="home-actions">
            <a href={RESUME_PDF} className="meadow-sign" target="_blank" rel="noopener noreferrer">
              Résumé
            </a>
          </div>
        </div>
        <a href="#numbers" className="home-cue" aria-label="Scroll to my work, by the numbers">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4.5 5l4.5 4.5L13.5 5M4.5 9.5L9 14l4.5-4.5" />
          </svg>
        </a>
      </section>
    </>
  )
}
