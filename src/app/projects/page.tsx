import MapSheet from '@/components/MapSheet'
import SheetNav from '@/components/SheetNav'
import { PROJECTS } from '@/content/projects'

export const metadata = {
  title: 'Projects',
  description:
    'This site, generated from USGS lidar; Esker, an Ice Age Trail tracker for Android; and puppe.rs, field guides for pet sitters.',
}

export default function ProjectsPage() {
  return (
    <div>
      <SheetNav current="/projects/" />
      <MapSheet place="parnell" />
      <h1 className="sheet-title">Projects</h1>
      <p className="sheet-sub mb-10">What I build on the side</p>

      {PROJECTS.map((p) => (
        <section key={p.id} id={p.id} className="mb-12">
          <p className="trail-eyebrow mb-3">
            {p.kind} &middot; {p.year}
          </p>
          <h2 className="text-xl md:text-2xl mb-4">{p.name}</h2>
          <div className="prose">
            {p.body.map((para) => (
              <p key={para}>{para}</p>
            ))}
          </div>
          <p className="trail-list-meta mt-4">{p.stack.join(' · ')}</p>
          {p.link && (
            <p className="mt-6">
              <a href={p.link.href} target="_blank" rel="noopener noreferrer" className="link">
                {p.link.text}
              </a>
            </p>
          )}
        </section>
      ))}
    </div>
  )
}
