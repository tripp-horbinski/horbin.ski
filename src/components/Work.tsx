import Image from 'next/image'
import { CERTIFICATIONS, CHAPTERS, EDUCATION, PROFILE, ROLES, WORK } from '@/content/career'
import { PROJECTS } from '@/content/projects'
import { CREDLY, EMAIL, GITHUB, LINKEDIN, RESUME_PDF } from '@/lib/site'
import Screenshots from './Screenshots'
import Walk from './Walk'

// A project's years, short: 2018–21, or 2025
const years = (dates: string) => {
  const [first, last] = [dates.match(/\d{4}/)![0], dates.slice(-4)]
  return first === last ? first : `${first}–${last.slice(2)}`
}

// The two chapters on the walk, each number with where and when
// it's from and where to see more: its project below, or for the Golden
// Jacket's, Credly
const STORY = CHAPTERS.map((c) => ({
  ...c,
  numbers: c.numbers.map(([id, value]) => {
    const w = WORK.find((p) => p.id === id)
    if (w) return { ...w.impact.find((n) => n.value === value)!, href: `#${id}`, from: `${w.org} · ${years(w.dates)}` }
    const cert = CERTIFICATIONS.find((p) => p.id === id)!
    return { ...cert.impact.find((n) => n.value === value)!, href: cert.href, from: `${cert.name} · ${cert.month.slice(0, 4)}` }
  }),
}))

// The ways to reach him, each with its mark
const ICON = { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true } as const
const CONTACT = [
  {
    label: 'Email',
    href: `mailto:${EMAIL}`,
    text: EMAIL,
    icon: (
      <svg {...ICON} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <rect x="1.5" y="3.25" width="13" height="9.5" rx="1.5" />
        <path d="M2 4l6 4.75L14 4" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: LINKEDIN,
    text: 'in/tripp-horbinski',
    icon: (
      <svg {...ICON}>
        <rect x="1" y="1" width="14" height="14" rx="2" fill="currentColor" />
        <circle cx="4.9" cy="4.8" r="1.1" fill="#F3EAD6" />
        <path d="M3.9 6.6h2v5.9h-2zM7.4 6.6h1.9v.9c.4-.7 1.2-1.1 2.1-1.1 1.6 0 2.3 1 2.3 2.7v3.4h-2V9.5c0-.8-.3-1.3-1-1.3s-1.3.5-1.3 1.4v2.9h-2z" fill="#F3EAD6" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: GITHUB,
    text: 'tripp-horbinski',
    icon: (
      <svg {...ICON} fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
  },
  {
    label: 'AWS certifications',
    href: CREDLY,
    text: 'Every AWS certification, on Credly',
    // A medal on its ribbon
    icon: (
      <svg {...ICON} viewBox="0 0 20 20" fill="currentColor">
        <path d="M5.5 1.5h3.2l1.3 4.2-2.4 1.9zM14.5 1.5h-3.2L10 5.7l2.4 1.9z" />
        <circle cx="10" cy="12.5" r="5.5" />
      </svg>
    ),
  },
]

const external = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})

function Stat({ n }: { n: (typeof STORY)[number]['numbers'][number] }) {
  return (
    <li>
      <a href={n.href} {...external(n.href)}>
        <strong>{n.value}</strong>
        <span>{n.label}</span>
        <small>{n.from}</small>
      </a>
    </li>
  )
}

// A chapter of his career, its numbers in the order they happened
function Chapter({ c }: { c: (typeof STORY)[number] }) {
  return (
    <div className="numbers-chapter">
      <h3>
        <span>{c.when}</span>
        {c.title}
      </h3>
      <ul className="numbers-list">
        {c.numbers.map((n) => (
          <Stat key={n.value} n={n} />
        ))}
      </ul>
    </div>
  )
}

function ProjectCard({ p, className }: { p: (typeof PROJECTS)[number]; className: string }) {
  return (
    <article className={className}>
      <div className="project-head">
        {p.icon && <Image className="project-icon" src={p.icon} width={128} height={128} sizes="56px" alt="" />}
        <div>
          <p className="project-kind">
            {p.kind} &middot; {p.year}
          </p>
          <h3>{p.name}</h3>
        </div>
      </div>
      <p>{p.summary}</p>
      <p className="work-stack">{p.stack.join(' · ')}</p>
      {p.shots && <Screenshots name={p.name} shots={p.shots} />}
      {p.link && (
        <a href={p.link.href} className="page-more" {...external(p.link.href)}>
          {p.link.text} &rarr;
        </a>
      )}
    </article>
  )
}

// The walk's signs over the meadow: about him, the two chapters of his career
// and Esker. Then the page under them: the projects behind the numbers, where
// he's worked, what else he builds on his own time, and how to reach him
export default function Work() {
  return (
    <>
      <Walk labels={['About', 'Platform', 'Product', 'Esker']}>
        <section id="numbers" className="walk-stop" aria-labelledby="numbers-title">
          <div className="walk-sign walk-intro">
            <h2 id="numbers-title" className="page-label">
              About me
            </h2>
            <p className="page-lead">
              {PROFILE.intro} {PROFILE.openTo}
            </p>
          </div>
        </section>
        <div className="walk-stop">
          <div className="walk-sign walk-chapter">
            <Chapter c={STORY[0]} />
          </div>
        </div>
        <div className="walk-stop">
          <div className="walk-sign walk-chapter">
            <Chapter c={STORY[1]} />
          </div>
        </div>
        <div className="walk-stop">
          {PROJECTS.filter((p) => p.shots).map((p) => (
            <ProjectCard key={p.id} p={p} className="project walk-sign" />
          ))}
        </div>
      </Walk>
      <div className="page-edge" aria-hidden="true" />
      <div className="page">
      <section id="work" className="page-section" aria-labelledby="work-title">
        <header className="page-head">
          <h2 id="work-title" className="page-label">
            Selected work
          </h2>
          <p className="page-lead">{PROFILE.practice}</p>
        </header>
        <div className="work-list">
          {WORK.map((w) => (
            <article key={w.id} id={w.id} className="work">
              <div className="work-side">
                <p className="work-when">{w.dates}</p>
                <p className="work-who">
                  {w.role}, {w.org}
                </p>
                <dl className="work-impact">
                  {w.impact.map((n) => (
                    <div key={n.value}>
                      <dt>{n.value}</dt>
                      <dd>{n.label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="work-body">
                <h3>{w.title}</h3>
                <p>{w.summary}</p>
                <p>{w.detail}</p>
                <p className="work-stack">{w.stack.join(' · ')}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="experience" className="page-section" aria-labelledby="experience-title">
        <header className="page-head">
          <h2 id="experience-title" className="page-label">
            Experience
          </h2>
        </header>
        <ol className="cv">
          {ROLES.map((r) => (
            <li key={r.org}>
              <span className="cv-when">{r.dates}</span>
              <div>
                <p className="cv-what">
                  {r.title}, <span>{r.org}</span>
                </p>
                {r.phases?.map((p) => (
                  <p key={p.label} className="cv-phase">
                    {p.label} &middot; {p.dates}
                  </p>
                ))}
              </div>
            </li>
          ))}
          {CERTIFICATIONS.map((c) => (
            <li key={c.name}>
              <span className="cv-when">{c.date}</span>
              <p className="cv-what">
                {c.name}, <span>{c.issuer}</span>
              </p>
            </li>
          ))}
          {EDUCATION.map((e) => (
            <li key={e.school}>
              <span className="cv-when">{e.dates}</span>
              <p className="cv-what">
                {e.degree}, <span>{e.school}</span>
              </p>
            </li>
          ))}
        </ol>
        <div className="page-actions">
          <a href={RESUME_PDF} className="meadow-sign" target="_blank" rel="noopener noreferrer">
            View résumé
          </a>
          <a href={RESUME_PDF} className="meadow-sign" download>
            Download PDF
          </a>
        </div>
      </section>

      <section id="projects" className="page-section" aria-labelledby="projects-title">
        <header className="page-head">
          <h2 id="projects-title" className="page-label">
            On my own time
          </h2>
          <p className="page-lead">Things I&apos;ve built because I love building them.</p>
        </header>
        <div className="projects">
          {PROJECTS.filter((p) => !p.shots).map((p) => (
            <ProjectCard key={p.id} p={p} className="project" />
          ))}
        </div>
      </section>

      <section id="contact" className="page-section contact" aria-labelledby="contact-title">
        <header className="page-head">
          <h2 id="contact-title" className="page-label">
            Get in touch
          </h2>
          <p className="contact-title">
            I&apos;d like to hear from you
          </p>
          <p className="page-lead">{PROFILE.openTo}</p>
          <p className="page-lead">
            Off the keyboard I run marathons and backpack: in August 2025 I walked the Arctic Circle Trail, 167 km across
            Greenland. My long trail at home is the Ice Age Trail, and I&apos;m a dog dad to two{' '}
            <a href="https://puppe.rs" {...external('https://puppe.rs')}>
              puppers
            </a>
            .
          </p>
        </header>
        <ul className="contact-list">
          {CONTACT.map((c) => (
            <li key={c.label}>
              {c.icon}
              <a href={c.href} aria-label={`${c.label}: ${c.text}`} {...external(c.href)}>
                {c.text}
              </a>
            </li>
          ))}
        </ul>
        <div className="page-actions">
          <a href={`mailto:${EMAIL}`} className="meadow-sign">
            Email me
          </a>
          <a href={RESUME_PDF} className="meadow-sign" download>
            Download PDF
          </a>
        </div>
      </section>
      <div className="page-foot" aria-hidden="true" />
      </div>
    </>
  )
}
