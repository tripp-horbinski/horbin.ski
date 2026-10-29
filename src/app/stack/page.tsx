import MapSheet from '@/components/MapSheet'
import SheetNav from '@/components/SheetNav'
import { RUNNER_ART } from '@/lib/meadow/runner-art'
import { OUTSIDE_BASE, PACK, type PackCategory, type PackItem } from '@/content/stack'

export const metadata = {
  title: 'Stack',
  description: 'What Tripp Horbinski carries at the desk and on the trail, weighed like a pack list.',
  // Unlisted until the gear list is real (see SheetNav)
  robots: { index: false },
}

// Spelled out so Tailwind keeps the classes
const INK: Record<PackCategory, string> = {
  desk: 'pack-ink-desk',
  software: 'pack-ink-software',
  trail: 'pack-ink-trail',
  dogs: 'pack-ink-dogs',
  worn: 'pack-ink-worn',
  consumables: 'pack-ink-consumables',
}

// Backpackers call a base weight under ten pounds ultralight
const ULTRALIGHT = 4536

const sum = (items: PackItem[]) => items.reduce((total, item) => total + item.grams, 0)
const grams = (n: number) => `${n.toLocaleString('en-US')} g`
const kilos = (n: number) => `${(n / 1000).toFixed(2)} kg`
const pounds = (n: number) => `${(n / 453.592).toFixed(1)} lb`

function Item({ item }: { item: PackItem }) {
  const name = item.href ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className="link">
      {item.name}
    </a>
  ) : (
    item.name
  )
  return (
    <li>
      <span>
        {name}
        {item.count && <small> &times;{item.count}</small>}
        {item.note && <small> {item.note}</small>}
      </span>
      <span className="pack-grams">{grams(item.grams)}</span>
    </li>
  )
}

export default function StackPage() {
  const categories = PACK.map((c) => ({
    ...c,
    grams: sum(c.items),
    base: !OUTSIDE_BASE.includes(c.id),
    ink: `${INK[c.id]}${OUTSIDE_BASE.includes(c.id) ? ' pack-outside' : ''}`,
  }))
  // Software weighs nothing and lists on one line, so it goes last, full width
  const lists = [...categories.filter((c) => c.id !== 'worn' && c.id !== 'software'), ...categories.filter((c) => c.id === 'software')]
  const base = categories.filter((c) => c.base).reduce((total, c) => total + c.grams, 0)
  const total = categories.reduce((t, c) => t + c.grams, 0)
  const worn = PACK.find((c) => c.id === 'worn')!.items.filter((item) => item.at)
  // Numbered down the print, cap to shoes
  const callouts = [...worn].sort((a, b) => a.at![1] - b.at![1])
  const { x0, y0, x1, y1 } = RUNNER_ART

  return (
    <div>
      <SheetNav current="/stack/" />
      <MapSheet place="chautauqua" />
      <h1 className="sheet-title">Stack</h1>
      <p className="sheet-sub">What I carry at the desk and on the trail</p>

      <section className="pack-summary" aria-label="Weights">
        <p className="pack-base">
          <span className="pack-kilos">{kilos(base)}</span>
          <span>
            <span className="trail-eyebrow">Base weight</span>
            <span className="trail-list-meta">
              {pounds(base)} &middot; {kilos(total)} with worn and consumables
            </span>
          </span>
          {base < ULTRALIGHT && <span className="pack-ultralight">Ultralight</span>}
        </p>
        <div className="pack-bar-wrap" aria-hidden="true">
          <div className="pack-bracket" style={{ width: `${(base / total) * 100}%` }}>
            <span>{grams(base)}</span>
          </div>
          <div className="pack-bar">
            {categories
              .filter((c) => c.grams > 0)
              .map((c) => (
                <i key={c.id} className={c.ink} style={{ flexGrow: c.grams }} />
              ))}
          </div>
        </div>
        <ul className="pack-key">
          {categories.map((c) => (
            <li key={c.id}>
              <i className={c.ink} aria-hidden="true" />
              {c.name} {grams(c.grams)}
            </li>
          ))}
        </ul>
      </section>

      <section className="pack-worn" aria-labelledby="worn-heading">
        <div className="pack-print" style={{ aspectRatio: `${x1 - x0} / ${y1 - y0}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; the export doesn't optimize images */}
          <img
            src="/stack/tripp.svg"
            alt="Screen print of Tripp after the Milwaukee Lakefront Marathon in a backwards cap, La Sportiva singlet, watch and tan Hoka shoes"
          />
          {callouts.map((item, i) => (
            <b
              key={item.name}
              style={{ left: `${((item.at![0] - x0) / (x1 - x0)) * 100}%`, top: `${((item.at![1] - y0) / (y1 - y0)) * 100}%` }}
              aria-hidden="true"
            >
              {i + 1}
            </b>
          ))}
        </div>
        <div>
          <h2 id="worn-heading" className="trail-eyebrow">
            Worn
          </h2>
          <ol className="pack-callouts">
            {callouts.map((item) => (
              <Item key={item.name} item={item} />
            ))}
          </ol>
        </div>
      </section>

      <div className="pack-lists">
        {lists.map((c) => (
          <section
            key={c.id}
            className={`pack-list${c.id === 'software' ? ' pack-list-wide' : ''}`}
            aria-labelledby={`pack-${c.id}`}
          >
            <h2 id={`pack-${c.id}`}>
              <span>
                <i className={c.ink} aria-hidden="true" />
                {c.name}
              </span>
              <span className="pack-grams">{grams(c.grams)}</span>
            </h2>
            {c.id === 'software' ? (
              <p>{c.items.map((item) => item.name).join(' · ')}</p>
            ) : (
              <ul>
                {c.items.map((item) => (
                  <Item key={item.name} item={item} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="pack-note">
        Base weight leaves out what&apos;s worn and what gets eaten or drunk, the way backpackers count it. Software
        weighs nothing.
      </p>
    </div>
  )
}
