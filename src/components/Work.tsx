import Image from 'next/image'
import { CERTIFICATIONS, CHAPTERS, EDUCATION, PROFILE, ROLES, WORK } from '@/content/career'
import { PROJECTS } from '@/content/projects'
import Journey from '@/components/Journey'
import { CREDLY, EMAIL, GITHUB, LINKEDIN, RESUME_PDF } from '@/lib/site'

// A project's years, short: 2018–21, or 2025
const years = (dates: string) => {
  const [first, last] = [dates.match(/\d{4}/)![0], dates.slice(-4)]
  return first === last ? first : `${first}–${last.slice(2)}`
}

// The two chapters round the Vitruvian Man, each number with where and when
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
const JACKET = CERTIFICATIONS[0]

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

// A chapter of his career, its numbers in the order they happened. (Its
// side's class is written out whole, or Tailwind drops it)
function Chapter({ c, side }: { c: (typeof STORY)[number]; side: 'left' | 'right' }) {
  return (
    <div className={side === 'left' ? 'numbers-chapter numbers-left' : 'numbers-chapter numbers-right'}>
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

// The page under the meadow: his career by the numbers round Leonardo's
// Vitruvian Man in his Golden Jacket, then, folded away until it's asked for,
// the projects behind the numbers and where he's worked; what he builds on
// his own time, and how to reach him
export default function Work() {
  return (
    <div className="page">
      <section id="numbers" className="page-section numbers" aria-labelledby="numbers-title">
        <header className="page-head">
          <h2 id="numbers-title" className="page-label">
            By the numbers
          </h2>
          <p className="page-lead">{PROFILE.intro}</p>
        </header>

        <div className="numbers-plate">
          <Chapter c={STORY[0]} side="left" />
          <figure className="numbers-figure">
            <Image
              src="/vitruvian.webp"
              width={1200}
              height={1206}
              sizes="(min-width: 1024px) 520px, 92vw"
              alt="Leonardo da Vinci’s Vitruvian Man in his circle and square, the man with his arms out level wearing a gold AWS jacket."
            />
            <figcaption>
              <span>
                Leonardo&apos;s Vitruvian Man in my {JACKET.name}: {JACKET.note.split('. ')[0]}.
              </span>{' '}
              <a href={JACKET.href} {...external(JACKET.href)}>
                Verify on Credly &rarr;
              </a>
              <small>After Leonardo da Vinci, c. 1490. Photograph of the drawing by Luc Viatour.</small>
            </figcaption>
          </figure>
          <Chapter c={STORY[1]} side="right" />
        </div>
      </section>

      {/* The career journey: the projects behind the numbers, and where he's
          worked, folded away for whoever wants more */}
      <Journey>
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
      </Journey>

      <section id="projects" className="page-section" aria-labelledby="projects-title">
        <header className="page-head">
          <h2 id="projects-title" className="page-label">
            On my own time
          </h2>
          <p className="page-lead">Things I&apos;ve built because I love building them.</p>
        </header>
        <div className="projects">
          {PROJECTS.map((p) => (
            <article key={p.id} className="project">
              <p className="project-kind">
                {p.kind} &middot; {p.year}
              </p>
              <h3>{p.name}</h3>
              <p>{p.summary}</p>
              <p className="work-stack">{p.stack.join(' · ')}</p>
              {p.link && (
                <a href={p.link.href} className="page-more" {...external(p.link.href)}>
                  {p.link.text} &rarr;
                </a>
              )}
            </article>
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
    </div>
  )
}
