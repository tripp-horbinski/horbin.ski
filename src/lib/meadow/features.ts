// Things you can point at in the meadow, with field notes for each.
// Anchors are in photo pixels; `layer` says which depth they move with.

export type FeatureId =
  | 'first' | 'second' | 'third' | 'fourth' | 'fifth'
  | 'green' | 'pines' | 'meadow' | 'trail' | 'post'

export interface Feature {
  id: FeatureId
  name: string
  meta: string
  note: string
  anchor: [number, number]
  layer: 'mountain' | 'forest' | 'ground' | 'figures'
  href?: string
}

export const FEATURES: Feature[] = [
  {
    id: 'first',
    name: 'First Flatiron',
    meta: 'Northernmost of the five',
    note: 'The big one. Its Direct East Face, rated 5.6, runs more than 1,000 feet up the tilted slab.',
    anchor: [692, 194],
    layer: 'mountain',
  },
  {
    id: 'second',
    name: 'Second Flatiron',
    meta: 'Fountain Formation',
    note: 'Like the rest of the row, it is sandstone and conglomerate laid down 290 to 296 million years ago, washed off the Ancestral Rockies.',
    anchor: [597, 238],
    layer: 'mountain',
  },
  {
    id: 'third',
    name: 'Third Flatiron',
    meta: '“The best 5.4 in the solar system”',
    note: 'In 1949 two students climbed it to paint a 50-foot “C”; a “U” followed in the fifties. The city painted over the letters in 1980, but they are still faintly visible.',
    anchor: [456, 250],
    layer: 'mountain',
  },
  {
    id: 'fourth',
    name: 'Fourth Flatiron',
    meta: 'Numbered north to south',
    note: 'The Flatirons are counted from north to south, so from Chautauqua they run right to left: the First is the big slab on the right.',
    anchor: [346, 278],
    layer: 'mountain',
  },
  {
    id: 'fifth',
    name: 'Fifth Flatiron',
    meta: 'Laramide orogeny',
    note: 'These beds were laid down flat. Between 80 and 35 million years ago the rising Front Range tipped them up steeply, and erosion has been carving the slabs out ever since.',
    anchor: [292, 284],
    layer: 'mountain',
  },
  {
    id: 'green',
    name: 'Green Mountain',
    meta: '8,148 ft',
    note: 'A peak on the eastern edge of the Front Range, right above Boulder. The Flatirons lean against its eastern flank.',
    anchor: [515, 230],
    layer: 'mountain',
  },
  {
    id: 'pines',
    name: 'Ponderosa pine',
    meta: 'Pinus ponderosa',
    note: 'The open forest at the foot of the Flatirons. On a warm afternoon, put your nose to a crack in the orange bark: it smells like vanilla.',
    anchor: [60, 344],
    layer: 'forest',
  },
  {
    id: 'meadow',
    name: 'Chautauqua Meadow',
    meta: 'Late summer',
    note: 'By late summer the grass has gone to seed and turned gold. Walk through it and the grasshoppers go off like popcorn. Tap the grass.',
    anchor: [600, 520],
    layer: 'ground',
  },
  {
    id: 'trail',
    name: 'Follow the trail',
    meta: 'To the writing',
    note: 'Notes on software, running, and the trails around Boulder.',
    anchor: [966, 552],
    layer: 'ground',
    href: '/writing/',
  },
  {
    id: 'post',
    name: 'Trailhead',
    meta: 'Back to horbin.ski',
    note: 'Return to the start.',
    anchor: [103, 514],
    layer: 'figures',
    href: '/',
  },
]

export const featureById = (id: FeatureId) => FEATURES.find((f) => f.id === id)!
