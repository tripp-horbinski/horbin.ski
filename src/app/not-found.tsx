import Link from 'next/link'

// The site is one page; anywhere else gets a way back to it
export default function NotFound() {
  return (
    <div>
      <h1 className="sheet-title">Off the trail</h1>
      <p className="sheet-sub">Page not found</p>
      <p className="mb-6">There&apos;s nothing here. This site is one page.</p>
      <p>
        <Link href="/" className="link">
          Back to the meadow
        </Link>
      </p>
    </div>
  )
}
