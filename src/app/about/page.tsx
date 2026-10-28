import Link from 'next/link'
import RunnerPortrait from '@/components/RunnerPortrait'

export const metadata = {
  title: 'About',
  description: 'Tripp Horbinski, a developer and backpacker in Boulder, Colorado.',
}

export default function AboutPage() {
  return (
    <div>
      <Link href="/" className="trail-arrow">
        Meadow
      </Link>
      <h1 className="mt-8 text-xl md:text-2xl leading-none">Tripp Horbinski</h1>
      <p className="mt-2 mb-6 font-display text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-nav)' }}>
        Boulder, Colorado &middot; Elev. 5,328 ft
      </p>
      <RunnerPortrait />
      <ul className="legend mt-8">
        <li>
          <span className="legend-symbol" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <ellipse cx="10" cy="13.2" rx="4.4" ry="3.6" />
              <circle cx="4.6" cy="8.4" r="1.9" />
              <circle cx="8.1" cy="5.4" r="1.9" />
              <circle cx="11.9" cy="5.4" r="1.9" />
              <circle cx="15.4" cy="8.4" r="1.9" />
            </svg>
          </span>
          <p>
            I&apos;m a dog dad to 2{' '}
            <a href="https://puppe.rs" target="_blank" rel="noopener noreferrer" className="link">
              puppers
            </a>
            .
          </p>
        </li>
        <li>
          <span className="legend-symbol" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <rect x="9" y="3" width="2" height="15" />
              <path d="M4 4.5h9.5l2.5 2.5-2.5 2.5H4z" />
              <path d="M16 10.5H6.5L4 13l2.5 2.5H16z" />
            </svg>
          </span>
          <p>
            You can view my{' '}
            <a href="https://github.com/tripp-horbinski" target="_blank" rel="noopener noreferrer" className="link">
              AI slop
            </a>
            {' '}or connect with me on{' '}
            <a
              href="https://www.linkedin.com/in/tripp-horbinski/"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              LinkedIn
            </a>
            .
          </p>
        </li>
      </ul>
    </div>
  )
}
