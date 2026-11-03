// What Tripp builds on his own time: Esker, on the walk's last sign.

export type Project = {
  id: string
  name: string
  kind: string
  summary: string
  stack: string[]
  link?: { href: string; text: string }
  icon?: string
  shots?: Shot[]
}

export type Shot = { thumb: string; full: string; alt: string }

// Esker's Google Play screenshots, from `npm run esker:shots`, with the alt
// text its listing uses (docs/play-store.md in its repo)
const ESKER_SHOTS: Shot[] = [
  ['01-home', 'Home screen: 64.3 of 1,111.5 miles hiked, a progress bar, and a map of Wisconsin with hiked segments in blue.'],
  ['02-map', 'Map of Wisconsin with the whole Ice Age Trail in yellow, road walks in gray and hiked segments in blue.'],
  ['03-detail', 'Devil’s Lake Segment: its map, length, climb and descent, and an elevation profile pinned on the West Bluff.'],
  ['04-segments', 'Segment list in trail order, with hiked segments marked in blue and the date each was hiked.'],
  ['05-counties', 'Counties from west to east, with miles hiked in each and Jefferson County complete.'],
  ['06-guide', 'Devil’s Lake Segment guide: an overview of the park’s bluffs and lake, and what to expect on the trail.'],
].map(([file, alt]) => ({ thumb: `/esker/${file}-540.webp`, full: `/esker/${file}.webp`, alt }))

export const PROJECTS: Project[] = [
  {
    id: 'esker',
    name: 'Esker',
    kind: 'IAT Companion App',
    summary:
      'An app for hiking Wisconsin’s 1,200-mile Ice Age Trail: browse it on a map, mark the segments you’ve hiked, and see how far you’ve come.',
    stack: ['Expo', 'React Native', 'TypeScript', 'Google Maps', 'SQLite', 'EAS'],
    link: { href: 'https://play.google.com/store/apps/details?id=com.horbinskistudios.esker', text: 'Get it on Google Play' },
    icon: '/esker/icon.webp',
    shots: ESKER_SHOTS,
  },
]
