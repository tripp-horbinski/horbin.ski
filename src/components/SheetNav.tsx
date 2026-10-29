import Link from 'next/link'

// About, Career and Projects; Backpacking is linked from About. Stack stays
// out until its gear list is real: it's unlisted, and left out of the sitemap
// and search. Writing is off the site for now (src/app/_writing)
const PAGES = [
  { href: '/about/', label: 'About' },
  { href: '/career/', label: 'Career' },
  { href: '/projects/', label: 'Projects' },
]

// The line across the top of every page past the meadow, like the title
// strip on a map series: the way home, and the other sheets
export default function SheetNav({ current }: { current?: string }) {
  return (
    <nav className="sheet-nav" aria-label="Site">
      <Link href="/" className="sheet-nav-home">
        Tripp Horbinski
      </Link>
      <ul>
        {PAGES.map((page) => (
          <li key={page.href}>
            <Link href={page.href} aria-current={page.href === current ? 'page' : undefined}>
              {page.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
