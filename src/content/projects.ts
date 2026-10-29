// What Tripp builds on his own time: the one source for the Projects page and
// the homepage's evening stretch. `summary` is the short version the homepage
// has room for; `body` is the Projects page's paragraphs.

import { GITHUB } from '@/lib/site'

export type Project = {
  // Its anchor on the Projects page
  id: string
  name: string
  kind: string
  year: string
  summary: string
  body: string[]
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
    body: [
      'The site you’re on. Its homepage is a canvas scene of the Flatirons over Chautauqua Meadow that’s generated, not drawn: the mountain is USGS lidar, lit for any hour by the sun’s real position, and every tree stands where aerial imagery shows canopy. Every other page opens on contour lines of a real place, traced from lidar with my own marching-squares tracer.',
      'The figures of me are screen prints of my photos: cut out with Apple’s Vision framework, repaired, separated into flat inks and traced to vectors. Build-time scripts turn all that data into code, so the site is a static export with no backend.',
    ],
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
    body: [
      'Tracks your progress along Wisconsin’s 1,200-mile Ice Age National Scenic Trail. Browse the trail on a map, mark the segments you’ve hiked, and see how far you’ve come. The trail data comes from OpenStreetMap and ships inside the app, and your progress stays on your phone, so there’s no backend.',
      'Built in a week. Now in internal testing on Google Play.',
    ],
    stack: ['Expo', 'React Native', 'TypeScript', 'Google Maps', 'SQLite', 'EAS'],
  },
  {
    id: 'puppers',
    name: 'puppe.rs',
    kind: 'Web and mobile app',
    year: '2026',
    summary:
      'Field guides for whoever’s watching your pets: owners fill in their pets, routine, commands and contacts, then share one link with the sitter.',
    body: [
      'Field guides for whoever’s watching your pets. Owners fill in their pets, daily routine, commands and contacts, then share one link with the sitter. The website and the owner app share the same schemas and guide rules.',
    ],
    stack: ['Next.js', 'Expo', 'TypeScript', 'Drizzle', 'Turso', 'Bun'],
    link: { href: 'https://puppe.rs', text: 'Visit puppe.rs' },
  },
]
