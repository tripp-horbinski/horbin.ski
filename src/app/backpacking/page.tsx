import Link from 'next/link'
import SheetNav from '@/components/SheetNav'
import TripMap from '@/components/TripMap'
import { ARCTIC_CIRCLE_TRAIL } from '@/lib/arctic-circle-trail'
import { HIKER_FRAME } from '@/lib/meadow/hiker-print'

export const metadata = {
  title: 'Backpacking',
  description:
    'Tripp Horbinski on the trail: the Arctic Circle Trail across Greenland as he walked it, day by day, and the Ice Age Trail at home.',
}

const { km, days, year } = ARCTIC_CIRCLE_TRAIL

export default function BackpackingPage() {
  return (
    <div>
      <SheetNav />
      <div className="intro">
        <figure className="portrait-plate" style={{ aspectRatio: `${HIKER_FRAME.width} / ${HIKER_FRAME.height}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; the export doesn't optimize images */}
          <img
            src="/backpacking/tripp.svg"
            alt="Screen print of Tripp on a trail in Iceland with his backpack on, in a cap, black T-shirt, hiking pants and trail shoes, one hand in his pocket"
          />
        </figure>
        <div className="intro-head">
          <h1 className="sheet-title">Backpacking</h1>
          <p className="sheet-sub">Greenland &middot; Iceland &middot; Wisconsin</p>
        </div>
        <ul className="map-key intro-body">
          <li>
            {/* A tent */}
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 3L18 17H2Z" />
            </svg>
            <p>
              In August {year} I walked the Arctic Circle Trail across Greenland: {km} km in {days.length} days, below
              as my watch recorded it.
            </p>
          </li>
          <li>
            {/* A trail blaze, as the Ice Age Trail is marked */}
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <rect x="7" y="3" width="6" height="14" rx="1" />
            </svg>
            <p>
              My long trail at home is the Ice Age Trail, and{' '}
              <Link href="/projects/#esker" className="link">
                Esker
              </Link>{' '}
              is the app I built to track it.
            </p>
          </li>
        </ul>
      </div>

      <section className="trip-section" aria-labelledby="act">
        <h2 id="act" className="sheet-label">
          Arctic Circle Trail &middot; {year}
        </h2>
        <TripMap />
      </section>
    </div>
  )
}
