import Link from 'next/link'
import type { CSSProperties } from 'react'
import CareerTimeline, { type Mark, type Span } from '@/components/CareerTimeline'
import SheetNav from '@/components/SheetNav'
import { CERTIFICATIONS, EDUCATION, PROFILE, ROLES, SKILLS, type Impact } from '@/content/career'
import { RESUME_PDF } from '@/lib/site'
import { generatePersonStructuredData } from '@/lib/structured-data'

export const metadata = {
  title: 'Career',
  description:
    'Tripp Horbinski’s career: a software engineer in Milwaukee, full stack on GoFundMe Pro since 2025 after six years in cloud and DevOps, with an AWS Golden Jacket.',
}

// Each role's color on the timeline and beside it below, oldest first, in
// tokens with light and dark values in globals.css; the Golden Jacket's is gold
const LEGS = ['var(--leg-1)', 'var(--leg-2)', 'var(--leg-3)', 'var(--leg-4)', 'var(--leg-5)']
const GOLD = 'var(--leg-6)'

// "2023-04" as a year, the start of that month, or with `through` the end of it
const year = (month: string, through = false) => {
  const [y, m] = month.split('-').map(Number)
  return y + (m - 1 + (through ? 1 : 0)) / 12
}

// How long he was there, counting both the first and last months, as LinkedIn does
function tenure(start: string, end: string) {
  const [y0, m0] = start.split('-').map(Number)
  const [y1, m1] = end.split('-').map(Number)
  const months = (y1 - y0) * 12 + (m1 - m0) + 1
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo${m > 1 ? 's' : ''}`].filter(Boolean).join(' ')
}

// Names short enough for the timeline's bars
const SHORT: Record<string, string> = { 'Northwestern Mutual': 'NM' }

// A role's numbers set large, then its bullets
function Detail({ impact, highlights }: { impact: Impact[]; highlights: string[] }) {
  return (
    <>
      {impact.length > 0 && (
        <dl className="career-impact">
          {impact.map((i) => (
            <div key={i.label}>
              <dt>{i.value}</dt>
              <dd>{i.label}</dd>
            </div>
          ))}
        </dl>
      )}
      <ul>
        {highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
    </>
  )
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function CareerPage() {
  const school = EDUCATION[0]
  const oldestFirst = [...ROLES].reverse()
  const color = (org: string) => LEGS[1 + oldestFirst.findIndex((r) => r.org === org)]
  const spans: Span[] = [
    {
      id: slug(school.school),
      label: 'MSOE',
      title: `${school.school}, ${school.dates}`,
      start: year(school.start),
      end: year(school.end),
      color: LEGS[0],
      school: true,
    },
    ...oldestFirst.map((r) => ({
      id: slug(r.org),
      label: SHORT[r.org] ?? r.org,
      title: `${r.org}, ${r.title}, ${r.dates}`,
      start: year(r.start),
      end: year(r.end, true),
      color: color(r.org),
    })),
  ]
  const marks: Mark[] = CERTIFICATIONS.map((c) => ({ id: 'certifications', label: `${c.name}, ${c.date}`, at: year(c.month, true), color: GOLD }))

  return (
    <div className="resume career">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generatePersonStructuredData()) }}
      />
      <SheetNav current="/career/" />

      <header className="resume-head">
        <div>
          <h1 className="sheet-title">{PROFILE.name}</h1>
          <p className="sheet-sub">
            {PROFILE.headline} &middot; <span className="whitespace-nowrap">{PROFILE.location}</span>
          </p>
        </div>
        <a href={RESUME_PDF} className="resume-download" download>
          Download PDF
        </a>
      </header>
      <ul className="resume-contact">
        {PROFILE.contact.map((c) => (
          <li key={c.label}>
            <a
              href={c.href}
              className="link"
              {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {c.text}
            </a>
          </li>
        ))}
      </ul>
      <p className="resume-summary">{PROFILE.summary}</p>

      <CareerTimeline spans={spans} marks={marks} from={2014} to={2027} />

      <section aria-labelledby="experience">
        <h2 id="experience" className="sheet-label">
          Experience
        </h2>
        {ROLES.map((role) => (
          <article key={role.org} id={slug(role.org)} className="resume-entry career-role" style={{ '--leg': color(role.org) } as CSSProperties}>
            <h3>
              <span>
                {role.org}, <span className="resume-org">{role.title}</span>
              </span>
              <span className="trail-list-meta">
                {role.dates} &middot; {role.place}
              </span>
            </h3>
            <p className="career-tenure">{tenure(role.start, role.end)}</p>
            {role.phases ? (
              role.phases.map((phase) => (
                <div key={phase.label} className="career-phase">
                  <h4>
                    <span>{phase.label}</span>
                    <span className="trail-list-meta">{phase.dates}</span>
                  </h4>
                  <Detail impact={phase.impact} highlights={phase.highlights} />
                </div>
              ))
            ) : (
              <Detail impact={role.impact} highlights={role.highlights} />
            )}
          </article>
        ))}
      </section>

      <section aria-labelledby="certifications-label" id="certifications">
        <h2 id="certifications-label" className="sheet-label">
          Certifications
        </h2>
        {CERTIFICATIONS.map((c) => (
          <article key={c.name} className="resume-entry">
            <h3>
              <span>
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="link">
                  {c.name}
                </a>
                , <span className="resume-org">{c.issuer}</span>
              </span>
              <span className="trail-list-meta">{c.date}</span>
            </h3>
            <p>{c.note}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="skills">
        <h2 id="skills" className="sheet-label">
          Technical skills
        </h2>
        <dl className="resume-skills">
          {SKILLS.map((s) => (
            <div key={s.group}>
              <dt>{s.group}</dt>
              <dd>{s.items.join(', ')}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="education" id={slug(school.school)}>
        <h2 id="education" className="sheet-label">
          Education
        </h2>
        {EDUCATION.map((e) => (
          <article key={e.school} className="resume-entry">
            <h3>
              <span>
                {e.school}, <span className="resume-org">{e.degree}</span>
              </span>
              <span className="trail-list-meta">
                {e.dates} &middot; {e.place}
              </span>
            </h3>
          </article>
        ))}
      </section>

      <p className="career-next">
        What I build on the side is on{' '}
        <Link href="/projects/" className="link">
          Projects
        </Link>
        , and I&apos;d like to hear from you:{' '}
        <Link href="/about/" className="link">
          get in touch
        </Link>
        .
      </p>
    </div>
  )
}
