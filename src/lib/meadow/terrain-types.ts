// Shape of the generated terrain module (src/lib/meadow/terrain.ts). Coordinates
// are in the 1200×800 reference frame the rest of the scene is laid out in.

import type { FeatureId } from './features'

export interface Facet {
  // land, open and rock are the mountain; hill and wood the ground in front of it
  kind: 'land' | 'open' | 'rock' | 'hill' | 'wood'
  // SVG path data
  d: string
  // Which way this area faces (east, north, up), so it can be lit for any hour;
  // traced photos give a fixed tone instead
  n?: number[]
  tone?: number
  // How much sky haze to mix in, for distant ridges
  haze: number
}

export interface TerrainData {
  source: string
  // Skyline height at x = x0 + i * step
  x0: number
  step: number
  skyline: number[]
  facets: Facet[]
  slabs: { id: FeatureId; d: string; top: number[] }[]
  // Which way each group of forest faces; trees are lit with their group
  groups: number[][]
  // Packed x, y, height, and the group the tree stands in
  trees: number[]
  // Where the grass at your feet begins, and how far up the open meadow runs
  // above it before the woods, both sampled like the skyline
  ground?: number[]
  meadow?: number[]
  // Lines 55 m and 32 m out, where the near meadow changes tone
  bands?: number[][]
  // Trees in front of the mountain, farthest first: x, y, height, 1 if
  // broadleaf, slant range in meters, and how much is hidden behind a rise
  woods?: number[]
  camera: { lat: number; lon: number; heading: number; pitch: number; roll: number; f: number; cx: number; cy: number } | null
  // The day the scene is set on, and the hours the sun is actually on the meadow
  // (clearing the plains in the morning, until the ridge cuts it off)
  day?: string
  sunlit?: number[]
}
