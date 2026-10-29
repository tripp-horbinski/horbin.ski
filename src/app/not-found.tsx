import Link from 'next/link'
import MapSheet from '@/components/MapSheet'
import SheetNav from '@/components/SheetNav'

export default function NotFound() {
  return (
    <div>
      <SheetNav />
      <MapSheet place="driftless" />
      <h1 className="sheet-title">Off the map</h1>
      <p className="sheet-sub">Page not found</p>
      <p className="mb-6">
        There&apos;s no page here. You&apos;re in the Driftless Area, the corner of Wisconsin the glaciers missed
        too.
      </p>
      <p>
        <Link href="/" className="link">
          Back to the meadow
        </Link>
      </p>
    </div>
  )
}
