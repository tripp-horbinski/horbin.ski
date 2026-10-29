// The /stack/ page, laid out as a backpacker's pack list: every item weighed
// and grouped, with what's worn and what's eaten or drunk counted apart from
// the base weight. `grams` is the line's whole weight, counting `count`. Worn
// items with `at` get a numbered dot on Tripp's finish-line print, at that
// point in the art's own pixels (src/lib/meadow/runner-art.ts).

export type PackCategory = 'desk' | 'software' | 'trail' | 'dogs' | 'worn' | 'consumables'

export type PackItem = {
  name: string
  note?: string
  grams: number
  count?: number
  href?: string
  at?: [number, number]
}

export const PACK: { id: PackCategory; name: string; items: PackItem[] }[] = [
  {
    id: 'desk',
    name: 'Desk',
    // TODO(tripp): the real desk, weighed
    items: [
      { name: 'Laptop', grams: 1550 },
      { name: 'Headphones', grams: 250 },
      { name: 'Phone', grams: 200 },
    ],
  },
  {
    id: 'software',
    name: 'Software',
    items: [
      'Claude Code', 'TypeScript', 'Next.js', 'React', 'Expo', 'React Native', 'AWS', 'Bun', 'Drizzle', 'Turso', 'SQLite',
      'Tailwind CSS',
    ].map((name) => ({ name, grams: 0 })),
  },
  {
    id: 'trail',
    name: 'Trail',
    // TODO(tripp): the real trail kit, weighed
    items: [
      { name: 'Running vest', grams: 300 },
      { name: 'Wind shell', grams: 200 },
      { name: 'Headlamp', grams: 90 },
      { name: 'Soft flasks', count: 2, grams: 70 },
    ],
  },
  {
    id: 'dogs',
    name: 'Dogs',
    items: [
      { name: 'Leashes', count: 2, grams: 300 },
      { name: 'Bags', grams: 20 },
      { name: 'Two puppers', note: 'Carry themselves', grams: 0, href: 'https://puppe.rs' },
    ],
  },
  {
    id: 'worn',
    name: 'Worn',
    // TODO(tripp): weigh these; the items are from the photo
    items: [
      { name: 'Cap', note: 'Backwards', grams: 70, at: [421, 208] },
      { name: 'La Sportiva singlet', note: 'From Milwaukee', grams: 90, at: [435, 365] },
      { name: 'Watch', grams: 50, at: [551, 570] },
      { name: 'Moose tattoo', note: 'Permanent', grams: 0, at: [381, 721] },
      { name: 'Hoka Clifton 11', note: 'Tan', grams: 550, at: [393, 940] },
    ],
  },
  {
    id: 'consumables',
    name: 'Consumables',
    items: [
      { name: 'Water', note: 'The bottle in the photo', grams: 500 },
      // TODO(tripp): real fuel
      { name: 'Gels', count: 4, grams: 130 },
    ],
  },
]

// Backpackers' base weight leaves out what's worn and what's consumed
export const OUTSIDE_BASE: PackCategory[] = ['worn', 'consumables']
