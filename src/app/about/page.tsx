import Link from 'next/link'
import MapSheet from '@/components/MapSheet'
import SheetNav from '@/components/SheetNav'
import { JACKET_FRAME } from '@/lib/meadow/jacket-print'
import { CREDLY, EMAIL, GITHUB, LINKEDIN } from '@/lib/site'
import { generatePersonStructuredData } from '@/lib/structured-data'

export const metadata = {
  title: 'About',
  description:
    'Tripp Horbinski is a software engineer in Milwaukee, Wisconsin, who builds beautiful, useful software: full stack since 2025, after six years in cloud and DevOps, and an AWS Golden Jacket. He runs marathons and backpacks.',
}

// Where to find him, in the order a recruiter would reach for them
const CONTACT = [
  { label: 'Email', href: `mailto:${EMAIL}`, text: EMAIL },
  { label: 'LinkedIn', href: LINKEDIN, text: 'in/tripp-horbinski' },
  { label: 'GitHub', href: GITHUB, text: 'tripp-horbinski' },
  { label: 'Resume', href: '/career/', text: 'My career, and the PDF' },
]

export default function AboutPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generatePersonStructuredData()) }}
      />
      <SheetNav current="/about/" />
      <MapSheet place="milwaukee" />
      <div className="intro">
        <figure className="portrait-plate" style={{ aspectRatio: `${JACKET_FRAME.width} / ${JACKET_FRAME.height}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; the export doesn't optimize images */}
          <img
            src="/about/tripp.svg"
            alt="Screen print of Tripp smiling with his arms crossed, in his gold AWS Certified bomber jacket and jeans"
          />
        </figure>
        <div className="intro-head">
          <h1 className="sheet-title">Tripp Horbinski</h1>
          <p className="sheet-sub">
            Milwaukee, Wisconsin <span className="whitespace-nowrap">&middot; Elev. 617&nbsp;ft</span>
          </p>
        </div>
        <ul className="map-key intro-body">
          <li>
            {/* Angle brackets, for code */}
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 5L2.5 10L7 15M13 5l4.5 5L13 15" />
            </svg>
            <p>
              I&apos;m a software engineer who builds beautiful, useful software: six years in cloud and DevOps,
              then full stack at GoFundMe. It&apos;s all on{' '}
              <Link href="/career/" className="link">
                Career
              </Link>
              , and what I build on the side is on{' '}
              <Link href="/projects/" className="link">
                Projects
              </Link>
              .
            </p>
          </li>
          <li>
            {/* A medal on its ribbon */}
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M5.5 1.5h3.2l1.3 4.2-2.4 1.9zM14.5 1.5h-3.2L10 5.7l2.4 1.9z" />
              <circle cx="10" cy="12.5" r="5.5" />
            </svg>
            <p>
              I&apos;ve held every AWS certification since December 2023, the Golden Jacket. You can{' '}
              <a href={CREDLY} target="_blank" rel="noopener noreferrer" className="link">
                verify them on Credly
              </a>
              .
            </p>
          </li>
          <li>
            {/* A trail blaze, as the Ice Age Trail is marked */}
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <rect x="7" y="3" width="6" height="14" rx="1" />
            </svg>
            <p>
              I run marathons and backpack: in August 2025 I walked the{' '}
              <Link href="/backpacking/" className="link">
                Arctic Circle Trail
              </Link>
              , 167 km across Greenland. My long trail at home is the Ice Age Trail.
            </p>
          </li>
          <li>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <ellipse cx="10" cy="13.2" rx="4.4" ry="3.6" />
              <circle cx="4.6" cy="8.4" r="1.9" />
              <circle cx="8.1" cy="5.4" r="1.9" />
              <circle cx="11.9" cy="5.4" r="1.9" />
              <circle cx="15.4" cy="8.4" r="1.9" />
            </svg>
            <p>
              I&apos;m a dog dad to 2{' '}
              <a href="https://puppe.rs" target="_blank" rel="noopener noreferrer" className="link">
                puppers
              </a>
              .
            </p>
          </li>
        </ul>

        <div className="intro-more">
          <h2 className="sheet-label">Get in touch</h2>
          <dl className="contact">
            {CONTACT.map((c) => (
              <div key={c.label}>
                <dt className="trail-list-meta">{c.label}</dt>
                <dd>
                  <a
                    href={c.href}
                    className="link"
                    {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {c.text}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
