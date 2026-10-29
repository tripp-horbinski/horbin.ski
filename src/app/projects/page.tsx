import Link from 'next/link'
import MapSheet from '@/components/MapSheet'
import SheetNav from '@/components/SheetNav'
import { GITHUB } from '@/lib/site'

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

      <section id="site" className="mb-12">
        <p className="trail-eyebrow mb-3">Website &middot; 2026</p>
        <h2 className="text-xl md:text-2xl mb-4">tripp.horbin.ski</h2>
        <div className="prose">
          <p>
            The site you&apos;re on. Its{' '}
            <Link href="/">homepage</Link> is a canvas scene of the Flatirons over Chautauqua Meadow that&apos;s
            generated, not drawn: the mountain is USGS lidar, lit for any hour by the sun&apos;s real position,
            and every tree stands where aerial imagery shows canopy. Every other page opens on contour lines of a
            real place, traced from lidar with my own marching-squares tracer.
          </p>
          <p>
            The figures of me are screen prints of my photos: cut out with Apple&apos;s Vision framework, repaired,
            separated into flat inks and traced to vectors. Build-time scripts turn all that data into code, so
            the site is a static export with no backend.
          </p>
        </div>
        <p className="trail-list-meta mt-4">
          Next.js &middot; TypeScript &middot; Canvas &middot; Node &middot; Swift &middot; USGS 3DEP &middot; OpenStreetMap
        </p>
        <p className="mt-6">
          <a href={`${GITHUB}/horbin.ski`} target="_blank" rel="noopener noreferrer" className="link">
            Source on GitHub
          </a>
        </p>
      </section>

      <section id="esker" className="mb-12">
        <p className="trail-eyebrow mb-3">Android app &middot; 2026</p>
        <h2 className="text-xl md:text-2xl mb-4">Esker</h2>
        <div className="prose">
          <p>
            Tracks your progress along Wisconsin&apos;s 1,200-mile Ice Age National Scenic Trail. Browse the
            trail on a map, mark the segments you&apos;ve hiked, and see how far you&apos;ve come. The trail data
            comes from OpenStreetMap and ships inside the app, and your progress stays on your phone, so there&apos;s
            no backend.
          </p>
          <p>Built in a week. Now in internal testing on Google Play.</p>
        </div>
        <p className="trail-list-meta mt-4">Expo &middot; React Native &middot; TypeScript &middot; Google Maps &middot; SQLite &middot; EAS</p>
      </section>

      <section id="puppers" className="mb-12">
        <p className="trail-eyebrow mb-3">Web and mobile app &middot; 2026</p>
        <h2 className="text-xl md:text-2xl mb-4">puppe.rs</h2>
        <div className="prose">
          <p>
            Field guides for whoever&apos;s watching your pets. Owners fill in their pets, daily routine, commands and
            contacts, then share one link with the sitter. The website and the owner app share the same schemas
            and guide rules.
          </p>
        </div>
        <p className="trail-list-meta mt-4">Next.js &middot; Expo &middot; TypeScript &middot; Drizzle &middot; Turso &middot; Bun</p>
        <p className="mt-6">
          <a href="https://puppe.rs" target="_blank" rel="noopener noreferrer" className="link">
            Visit puppe.rs
          </a>
        </p>
      </section>
    </div>
  )
}
