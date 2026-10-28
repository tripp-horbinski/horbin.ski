import Link from 'next/link'
import TrailSign from '@/components/TrailSign'

export const metadata = {
  title: 'Projects',
  description: 'Esker, an Ice Age Trail tracker for Android, and puppe.rs, field guides for pet sitters.',
}

export default function ProjectsPage() {
  return (
    <div>
      <h1 className="sr-only">Projects</h1>
      <TrailSign title="Projects" subtitle="Built from the trailhead" />
      <p className="mt-6 mb-10 text-center" style={{ color: 'var(--text-nav)' }}>
        By{' '}
        <Link href="/" className="no-underline transition-colors" style={{ color: 'var(--text-nav)' }}>
          Tripp Horbinski
        </Link>
      </p>

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
