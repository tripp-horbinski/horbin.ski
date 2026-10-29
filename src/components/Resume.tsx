import { CERTIFICATIONS, EDUCATION, PROFILE, ROLES, SKILLS } from '@/content/career'

// His resume, on paper only: hidden on screen, it's what the homepage prints
// as, and scripts/resume-pdf.mjs prints it to the PDF the page offers
export default function Resume() {
  return (
    <article className="resume">
      <header className="resume-head">
        <h1 className="sheet-title">{PROFILE.name}</h1>
        <p className="sheet-sub">
          {PROFILE.headline} &middot; {PROFILE.location}
        </p>
      </header>
      <ul className="resume-contact">
        {PROFILE.contact.map((c) => (
          <li key={c.label}>{c.text}</li>
        ))}
      </ul>
      <p className="resume-summary">{PROFILE.summary}</p>

      <section>
        <h2 className="sheet-label">Experience</h2>
        {ROLES.map((role) => (
          <div key={role.org} className="resume-entry">
            <h3>
              <span>
                {role.org}, <span className="resume-org">{role.title}</span>
              </span>
              <span className="trail-list-meta">
                {role.dates} &middot; {role.place}
              </span>
            </h3>
            {(role.phases ?? [{ label: '', dates: '', highlights: role.highlights }]).map((phase) => (
              <div key={phase.label || role.org} className="resume-phase">
                {phase.label && (
                  <h4>
                    <span>{phase.label}</span>
                    <span>{phase.dates}</span>
                  </h4>
                )}
                <ul>
                  {phase.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section>
        <h2 className="sheet-label">Certifications</h2>
        {CERTIFICATIONS.map((c) => (
          <div key={c.name} className="resume-entry">
            <h3>
              <span>
                {c.name}, <span className="resume-org">{c.issuer}</span>
              </span>
              <span className="trail-list-meta">{c.date}</span>
            </h3>
            <p>{c.note}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="sheet-label">Technical skills</h2>
        <dl className="resume-skills">
          {SKILLS.map((s) => (
            <div key={s.group}>
              <dt>{s.group}</dt>
              <dd>{s.items.join(', ')}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="sheet-label">Education</h2>
        {EDUCATION.map((e) => (
          <div key={e.school} className="resume-entry">
            <h3>
              <span>
                {e.school}, <span className="resume-org">{e.degree}</span>
              </span>
              <span className="trail-list-meta">
                {e.dates} &middot; {e.place}
              </span>
            </h3>
          </div>
        ))}
      </section>
    </article>
  )
}
