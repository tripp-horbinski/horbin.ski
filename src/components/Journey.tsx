'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const motion = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')

// His career journey, his selected work and experience, folded away under the
// numbers for whoever wants more. It opens from its button, for a link into
// it (a number's project, or an address ending in one), and for the browser's
// find-in-page; folded, it's still in the page for search engines to read
export default function Journey({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLDivElement>(null)
  // Where to go once it's open
  const goTo = useRef<string | null>(null)

  useEffect(() => {
    const body = bodyRef.current!
    const inside = (id: string) => (id ? body.querySelector(`#${CSS.escape(id)}`) : null)
    // (Open, a link scrolls there on its own)
    const reveal = (id: string) => {
      if (!body.hasAttribute('hidden') || !inside(id)) return false
      goTo.current = id
      setOpen(true)
      return true
    }

    // A link to something inside it can't scroll there while it's folded, so
    // it opens first and scrolls once it has
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href^="#"]')
      const id = a?.getAttribute('href')!.slice(1) ?? ''
      if (!a || !reveal(id)) return
      e.preventDefault()
      history.pushState(null, '', `#${id}`)
    }
    const onHash = () => reveal(location.hash.slice(1))
    const onFound = () => setOpen(true)
    onHash()
    document.addEventListener('click', onClick)
    window.addEventListener('hashchange', onHash)
    body.addEventListener('beforematch', onFound)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('hashchange', onHash)
      body.removeEventListener('beforematch', onFound)
    }
  }, [])

  // Folded, it's hidden until the browser's find-in-page finds something in
  // it (React only knows hidden as on or off)
  useEffect(() => {
    const body = bodyRef.current!
    if (!open) body.setAttribute('hidden', 'until-found')
    else if (goTo.current) {
      body.querySelector(`#${CSS.escape(goTo.current)}`)?.scrollIntoView({ behavior: motion() })
      goTo.current = null
    }
  }, [open])

  // Folding it from its end goes back up to where it opened
  function close() {
    setOpen(false)
    requestAnimationFrame(() => toggleRef.current?.scrollIntoView({ behavior: motion(), block: 'center' }))
  }

  const chevron = (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 4.5L6 8l3.5-3.5" />
    </svg>
  )

  return (
    <>
      <div ref={toggleRef} className="journey-toggle">
        <p>The projects behind these numbers, and where I&apos;ve worked</p>
        <button type="button" className="meadow-sign" aria-expanded={open} aria-controls="journey" onClick={() => (open ? close() : setOpen(true))}>
          {open ? 'Close the career journey' : 'Open the career journey'}
          {chevron}
        </button>
      </div>
      <div ref={bodyRef} id="journey" className="journey" hidden={!open}>
        {children}
        <div className="journey-end">
          <button type="button" className="meadow-sign" aria-expanded={open} aria-controls="journey" onClick={close}>
            Close the career journey
            {chevron}
          </button>
        </div>
      </div>
    </>
  )
}
