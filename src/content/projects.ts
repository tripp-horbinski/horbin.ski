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
}

export const PROJECTS: Project[] = [
  {
    id: 'site',
    name: 'tripp.horbin.ski',
    kind: 'Website',
    year: '2026',
    summary:
      'The site you’re on. The meadow is generated, not drawn: USGS lidar lit by the sun’s real position for any hour, every tree where aerial imagery shows canopy, and the figures of me screen-printed from my photos.',
    stack: ['Next.js', 'TypeScript', 'Canvas', 'Node', 'Swift', 'USGS 3DEP', 'OpenStreetMap'],
    link: { href: `${GITHUB}/horbin.ski`, text: 'Source on GitHub' },
  },
  {
    id: 'esker',
    name: 'Esker',
    kind: 'Android app',
    year: '2026',
    summary:
      'Tracks your progress along Wisconsin’s 1,200-mile Ice Age Trail: browse it on a map, mark the segments you’ve hiked, see how far you’ve come. Built in a week; in internal testing on Google Play.',
    stack: ['Expo', 'React Native', 'TypeScript', 'Google Maps', 'SQLite', 'EAS'],
  },
  {
    id: 'puppers',
    name: 'puppe.rs',
    kind: 'Web and mobile app',
    year: '2026',
    summary:
      'Field guides for whoever’s watching your pets: owners fill in their pets, routine, commands and contacts, then share one link with the sitter.',
    stack: ['Next.js', 'Expo', 'TypeScript', 'Drizzle', 'Turso', 'Bun'],
    link: { href: 'https://puppe.rs', text: 'Visit puppe.rs' },
  },
]
