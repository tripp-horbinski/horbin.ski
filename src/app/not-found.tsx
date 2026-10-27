import Link from 'next/link'
import TrailSign from '@/components/TrailSign'

export default function NotFound() {
  return (
    <div className="text-center">
      <h1 className="sr-only">Page not found</h1>
      <TrailSign title="Off trail" subtitle="This page doesn't exist" />
      <p className="mt-8">
        <Link href="/" className="link">
          Back to the trailhead
        </Link>
      </p>
    </div>
  )
}
