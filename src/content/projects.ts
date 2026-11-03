// What Tripp builds on his own time, for the homepage's evening stretch.

import { GITHUB } from '@/lib/site'

export type Project = {
  id: string
  name: string
  kind: string
  year: string
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
    kind: 'Android app',
    year: '2026',
    summary:
      'An app for hiking Wisconsin’s 1,200-mile Ice Age Trail: browse it on a map, mark the segments you’ve hiked, and see how far you’ve come.',
    stack: ['Expo', 'React Native', 'TypeScript', 'Google Maps', 'SQLite', 'EAS'],
    link: { href: 'https://play.google.com/store/apps/details?id=com.horbinskistudios.esker', text: 'Get it on Google Play' },
    icon: '/esker/icon.webp',
    shots: ESKER_SHOTS,
  },
  {
    id: 'site',
    name: 'tripp.horbin.ski',
    kind: 'Website',
    year: '2026',
    summary:
      'The site you’re on. The meadow is generated, not drawn: USGS lidar lit by the sun’s real position for any hour, every tree where aerial imagery shows canopy, and the figures of me screen-printed from my photos.',
    stack: ['Claude Code', 'Next.js', 'TypeScript', 'Canvas', 'Node', 'Swift', 'USGS 3DEP', 'NAIP', 'Terraform', 'GitHub Actions'],
    link: { href: `${GITHUB}/horbin.ski`, text: 'Source on GitHub' },
  },
  {
    id: 'puppers',
    name: 'puppe.rs',
    kind: 'Web and mobile app',
    year: '2026',
    summary:
      'Field guides for whoever’s watching your pets: owners fill in their pets, routine, commands and contacts, then share one link with the sitter. In development.',
    stack: ['Next.js', 'Expo', 'TypeScript', 'Drizzle', 'Turso', 'Bun'],
  },
]
