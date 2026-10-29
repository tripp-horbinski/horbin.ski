// Topographic maps for the pages past the meadow, each of a real place, traced
// from USGS 3DEP lidar as contour lines. The lines go to public/maps/ as SVGs
// the pages use as CSS masks, so every ink takes its color from the theme.
// Everything else the pages draw over them (pins, labels, the Ice Age Trail,
// the footer's elevation profile) goes to the generated src/lib/maps.ts.
//
//   npm run meadow:maps [-- --preview]
//
// Boulder reads the lidar fetch.mjs cached for the meadow, so run that first.
// Wisconsin's lidar, NOAA's Lake Michigan depths, the Ice Age Trail from
// OpenStreetMap (through Waymarked Trails) and the county outlines download
// into .cache on the first run. --preview also writes a PNG of each map there.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fromArrayBuffer } from 'geotiff'
import proj4 from 'proj4'
import sharp from 'sharp'
import { CACHE, FINE, readRaster } from './config.mjs'
import { blur, contourLines, lengthOf, pathData, simplify } from './contours.mjs'

const USGS = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer'
const NOAA = 'https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_mosaics/DEM_global_mosaic/ImageServer'
const IAT_RELATION = 2381423
const IAT_URL = `https://hiking.waymarkedtrails.org/api/v1/details/relation/${IAT_RELATION}`
const COUNTIES_URL = 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json'
const FT = 0.3048
const utm = (zone) => `+proj=utm +zone=${zone} +datum=NAD83 +units=m +no_defs`
const preview = process.argv.includes('--preview')

// Every map frame is this many units wide; mask line widths are in these units
const FRAME = 1000
const LINES = { minor: 0.9, index: 1.8, minorOpacity: 0.7, tolerance: 0.3, shortest: 4 }

// Each place: a box in its UTM zone's meters, sized to the header's 8:3 shape,
// the grid resolution to trace at, and the contour interval in feet. A lake
// gets its depths from NOAA as a second ink. Pins and labels are hand placed.
const PLACES = [
  {
    id: 'chautauqua',
    name: 'Chautauqua',
    region: 'Boulder, Colorado',
    zone: 13,
    // The east face of Green Mountain, the meadow at the top right
    bbox: [472800, 4426890, 476580, 4428300],
    res: 3,
    land: { interval: 80, smooth: 2 },
    credit: 'USGS 3DEP lidar',
    pins: [{ lat: 39.99968, lon: -105.28315, label: 'Chautauqua Meadow', sub: 'Back to the view', href: '/' }],
    labels: [],
  },
  {
    id: 'parnell',
    name: 'Parnell segment',
    region: 'Kettle Moraine, Wisconsin',
    zone: 16,
    // The middle of the segment, where the trail runs the moraine's ridges
    bbox: [404850, 4834130, 412350, 4836930],
    res: 3,
    land: { interval: 10, smooth: 4 },
    trail: 19681769,
    credit: 'USGS 3DEP lidar · Trail © OpenStreetMap contributors',
    pins: [],
    labels: [{ lat: 43.67, lon: -88.1282, text: 'Ice Age Trail', kind: 'trail' }],
  },
  {
    id: 'milwaukee',
    name: 'Milwaukee lakefront',
    region: 'Wisconsin',
    zone: 16,
    bbox: [420540, 4762610, 436540, 4768560],
    res: 5,
    land: { interval: 20, smooth: 3 },
    // The lidar flattens the lake at its surface; NOAA's grid is 40 m
    lake: { interval: 10, smooth: 6, surface: 177.2, res: 40 },
    credit: 'USGS 3DEP lidar · NOAA NCEI bathymetry',
    pins: [
      { lat: 43.0405, lon: -87.8955, label: 'Veterans Park' },
      { lat: 43.0266, lon: -87.8973, label: 'Hoan Bridge' },
    ],
    labels: [
      { lat: 43.0419, lon: -87.8498, text: 'Lake Michigan', kind: 'water' },
      { lat: 43.0324, lon: -87.9577, text: 'Menomonee Valley', kind: 'feature' },
      { lat: 43.0602, lon: -87.909, text: 'Milwaukee River', kind: 'feature' },
    ],
  },
  {
    id: 'driftless',
    name: 'Kickapoo Valley',
    region: 'Driftless Area',
    zone: 15,
    // Coulees around Wildcat Mountain, which the glaciers never reached
    bbox: [691400, 4839920, 699400, 4842904],
    res: 4,
    land: { interval: 40, smooth: 3 },
    credit: 'USGS 3DEP lidar',
    pins: [],
    labels: [],
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const cached = (name) => new URL(name, CACHE)

async function json(url, name) {
  try {
    return JSON.parse(await readFile(cached(name), 'utf8'))
  } catch {
    process.stdout.write(`${name}: downloading\n`)
    const text = await (await fetch(url)).text()
    await writeFile(cached(name), text)
    return JSON.parse(text)
  }
}

// An elevation grid from an ArcGIS ImageServer, a tile at a time, cached raw
// with a JSON sidecar like fetch.mjs's
async function grid(service, name, bbox, res, zone) {
  try {
    const meta = JSON.parse(await readFile(cached(`${name}.json`), 'utf8'))
    const buf = await readFile(cached(`${name}.bin`))
    return { ...meta, data: new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4) }
  } catch {}
  const [x0, y0, x1, y1] = bbox
  const width = Math.round((x1 - x0) / res)
  const height = Math.round((y1 - y0) / res)
  const data = new Float32Array(width * height)
  const TILE = 1000
  for (let ty = 0; ty < height; ty += TILE) {
    for (let tx = 0; tx < width; tx += TILE) {
      const tw = Math.min(TILE, width - tx)
      const th = Math.min(TILE, height - ty)
      process.stdout.write(`\r${name}: tile ${tx},${ty} of ${width}×${height}   `)
      const params = new URLSearchParams({
        bbox: [x0 + tx * res, y1 - (ty + th) * res, x0 + (tx + tw) * res, y1 - ty * res].join(','),
        bboxSR: `269${zone}`,
        imageSR: `269${zone}`,
        size: `${tw},${th}`,
        format: 'tiff',
        pixelType: 'F32',
        interpolation: 'RSP_BilinearInterpolation',
        f: 'image',
      })
      let tile
      for (let attempt = 1; !tile; attempt++) {
        const r = await fetch(`${service}/exportImage?${params}`)
        if (r.ok && (r.headers.get('content-type') ?? '').includes('tif')) {
          const image = await (await fromArrayBuffer(await r.arrayBuffer())).getImage()
          tile = await image.readRasters({ interleave: true })
        } else if (attempt === 6) throw new Error(`${name}: ${r.status} ${(await r.text()).slice(0, 200)}`)
        else await sleep(1500 * attempt)
      }
      for (let row = 0; row < th; row++) data.set(tile.subarray(row * tw, (row + 1) * tw), (ty + row) * width + tx)
    }
  }
  process.stdout.write('\n')
  const meta = { width, height, bbox, res, zone }
  await writeFile(cached(`${name}.bin`), Buffer.from(data.buffer))
  await writeFile(cached(`${name}.json`), JSON.stringify(meta))
  return { ...meta, data }
}

// Boulder's box out of the meadow's 1.5 m lidar, averaged down to `res`
async function boulderGrid(bbox, res) {
  const fine = await readRaster('dem-fine')
  const k = Math.round(res / FINE.res)
  const [x0, y0, x1, y1] = bbox
  const width = Math.round((x1 - x0) / res)
  const height = Math.round((y1 - y0) / res)
  const ox = Math.round((x0 - fine.bbox[0]) / FINE.res)
  const oy = Math.round((fine.bbox[3] - y1) / FINE.res)
  const data = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) sum += fine.data[(oy + y * k + j) * fine.width + ox + x * k + i]
      data[y * width + x] = sum / (k * k)
    }
  }
  return { width, height, bbox, res, data }
}

// Every contour of `z` (in feet) at `interval`, split into ordinary and index
// lines (every fifth), as path data in frame units
function trace(z, w, h, interval, scale, inside) {
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < z.length; i++) {
    if (inside && (i % w === w - 1 || i >= w * (h - 1) || !inside(i))) continue
    lo = Math.min(lo, z[i])
    hi = Math.max(hi, z[i])
  }
  const minor = []
  const index = []
  for (let level = Math.ceil(lo / interval) * interval; level <= hi; level += interval) {
    const lines = contourLines(z, w, h, level, inside)
      .filter((l) => lengthOf(l) * scale >= LINES.shortest)
      .map((l) => simplify(l, LINES.tolerance / scale))
    ;(Math.round(level / interval) % 5 === 0 ? index : minor).push(...lines)
  }
  return { minor: pathData(minor, scale), index: pathData(index, scale), lo, hi }
}

const maskSvg = (width, height, minor, index) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
  `<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">` +
  `<path stroke-width="${LINES.minor}" stroke-opacity="${LINES.minorOpacity}" d="${minor}"/>` +
  `<path stroke-width="${LINES.index}" d="${index}"/></g></svg>\n`

// The Ice Age Trail's ways from Waymarked Trails' copy of the OSM relation, in
// Web Mercator, as [lon, lat] lines: the whole route, or one segment of it
function trailLines(details, segment) {
  const toLonLat = ([x, y]) => [(x / 6378137) * (180 / Math.PI), (2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * (180 / Math.PI)]
  const lines = []
  const collect = (node) => {
    if (Array.isArray(node)) return node.forEach(collect)
    if (!node || typeof node !== 'object') return
    if (node.geometry?.type === 'LineString') lines.push(node.geometry.coordinates.map(toLonLat))
    for (const [k, v] of Object.entries(node)) if (k !== 'geometry') collect(v)
  }
  const find = (node) => {
    if (Array.isArray(node)) return node.map(find).find(Boolean)
    if (!node || typeof node !== 'object') return null
    if (node.id === segment && node.route_type === 'route') return node
    return Object.values(node).map(find).find(Boolean)
  }
  collect(segment ? find(details.route.main) : details.route.main)
  return lines
}

const fmtCoords = (lat, lon) => `${Math.abs(lat).toFixed(4)}° ${lat < 0 ? 'S' : 'N'} ${Math.abs(lon).toFixed(4)}° ${lon < 0 ? 'W' : 'E'}`
const pct = (n) => +(n * 100).toFixed(1)
const feet = (n) => Math.round(n).toLocaleString('en-US')

await mkdir(CACHE, { recursive: true })
await mkdir(new URL('../../public/maps/', import.meta.url), { recursive: true })
const details = await json(IAT_URL, 'iat-osm.json')

const maps = {}
for (const place of PLACES) {
  const { id, bbox, res, zone } = place
  const [x0, y0, x1, y1] = bbox
  const land = id === 'chautauqua' ? await boulderGrid(bbox, res) : await grid(USGS, `map-${id}`, bbox, res, zone)
  const { width: w, height: h } = land
  const scale = FRAME / w
  const height = Math.round(h * scale)
  const project = (lat, lon) => {
    const [e, n] = proj4('EPSG:4326', utm(zone), [lon, lat])
    return [(e - x0) / res, (y1 - n) / res]
  }
  const where = ({ lat, lon }) => {
    const [x, y] = project(lat, lon)
    return { x: pct(x / w), y: pct(y / h) }
  }

  const inks = []
  const surface = place.lake?.surface
  const landFt = blur(land, place.land.smooth).map((v) => v / FT)
  // On a lake map the land lines stop at the water, and the shoreline is drawn
  // as an index line of its own
  const dry = surface ? (i) => land.data[i] > surface && land.data[i + 1] > surface && land.data[i + w] > surface && land.data[i + w + 1] > surface : undefined
  const landLines = trace(landFt, w, h, place.land.interval, scale, dry)
  if (surface) {
    const shore = contourLines(landFt, w, h, (surface + 0.6) / FT)
      .filter((l) => lengthOf(l) * scale >= LINES.shortest)
      .map((l) => simplify(l, LINES.tolerance / scale))
    landLines.index += pathData(shore, scale)
  }
  await writeFile(new URL(`../../public/maps/${id}-land.svg`, import.meta.url), maskSvg(FRAME, height, landLines.minor, landLines.index))
  inks.push({ ink: 'land', src: `/maps/${id}-land.svg` })

  let lakeLines
  if (place.lake) {
    // NOAA's depths, bilinear onto the lidar grid, kept to cells that are all water
    const noaa = await grid(NOAA, `map-${id}-lake`, bbox, place.lake.res, zone)
    const k = place.lake.res / res
    const depth = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const fx = Math.min(noaa.width - 1.001, Math.max(0, (x + 0.5) / k - 0.5))
        const fy = Math.min(noaa.height - 1.001, Math.max(0, (y + 0.5) / k - 0.5))
        const ix = Math.floor(fx)
        const iy = Math.floor(fy)
        const ax = fx - ix
        const ay = fy - iy
        const at = (i, j) => noaa.data[(iy + j) * noaa.width + ix + i]
        depth[y * w + x] = (at(0, 0) * (1 - ax) + at(1, 0) * ax) * (1 - ay) + (at(0, 1) * (1 - ax) + at(1, 1) * ax) * ay
      }
    }
    const depthFt = blur({ data: depth, width: w, height: h }, place.lake.smooth).map((v) => v / FT)
    const wet = (i) => !dry(i) && land.data[i] < surface && depthFt[i] < -5
    lakeLines = trace(depthFt, w, h, place.lake.interval, scale, wet)
    await writeFile(new URL(`../../public/maps/${id}-lake.svg`, import.meta.url), maskSvg(FRAME, height, lakeLines.minor, lakeLines.index))
    inks.push({ ink: 'lake', src: `/maps/${id}-lake.svg` })
  }

  let trail
  if (place.trail) {
    const lines = trailLines(details, place.trail).map((l) => l.map(([lon, lat]) => project(lat, lon)))
    trail = pathData(lines.map((l) => simplify(l, LINES.tolerance / scale)), scale)
  }

  const [clon, clat] = proj4(utm(zone), 'EPSG:4326', [(x0 + x1) / 2, (y0 + y1) / 2])
  maps[id] = {
    name: place.name,
    region: place.region,
    coords: fmtCoords(clat, clon),
    intervals: place.lake
      ? `Land ${place.land.interval} ft · Depth ${place.lake.interval} ft`
      : `Contour interval ${place.land.interval} ft`,
    range: `${feet(landLines.lo)}–${feet(landLines.hi)} ft`,
    credit: place.credit,
    width: FRAME,
    height,
    inks,
    ...(trail && { trail }),
    pins: place.pins.map((p) => ({ ...where(p), label: p.label, ...(p.sub && { sub: p.sub }), ...(p.href && { href: p.href }) })),
    labels: place.labels.map((l) => ({ ...where(l), text: l.text, kind: l.kind })),
  }
  console.log(`${id}: ${w}×${h} grid, ${maps[id].range}, ${inks.map((i) => i.ink).join(' + ')}`)

  if (preview) {
    const ink = (file, color) => readFile(new URL(`../../public/maps/${file}`, import.meta.url), 'utf8').then((s) => s.replace(/stroke="#000"/, `stroke="${color}"`).replace(/<\/?svg[^>]*>/g, ''))
    const layers = [await ink(`${id}-land.svg`, '#3B3A33'), place.lake ? await ink(`${id}-lake.svg`, '#46708A') : '']
    const overlay = trail ? `<path d="${trail}" fill="none" stroke="#8F5F4A" stroke-width="2.5"/>` : ''
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME} ${height}" width="${FRAME * 2}" height="${height * 2}"><rect width="100%" height="100%" fill="#EDE7D8"/>${layers.join('')}${overlay}</svg>`
    await sharp(Buffer.from(svg)).png().toFile(new URL(`map-${id}.png`, CACHE).pathname)
  }
}

// The whole trail across Wisconsin: every way of the OSM relation's main
// route over the state's outline, the county edges no two counties share
const counties = (await json(COUNTIES_URL, 'us-counties.json')).features.filter((f) => f.properties.STATE === '55')
const W_LON = -93.0
const N_LAT = 47.15
const COS = Math.cos((44.8 * Math.PI) / 180)
const K = 600 / ((-86.7 - W_LON) * COS)
const flat = ([lon, lat]) => [(lon - W_LON) * COS * K, (N_LAT - lat) * K]
const edgeCount = new Map()
const edges = new Map()
for (const f of counties) {
  const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  for (const ring of polygons.flat()) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i].join()
      const b = ring[i + 1].join()
      const key = a < b ? `${a}|${b}` : `${b}|${a}`
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1)
      edges.set(key, [ring[i], ring[i + 1]])
    }
  }
}
// The outer edges, joined end to end into lines
const outer = [...edgeCount].filter(([, n]) => n === 1).map(([key]) => edges.get(key))
const byStart = new Map()
for (const [a, b] of outer) {
  for (const [p, q] of [[a, b], [b, a]]) {
    const list = byStart.get(p.join()) ?? []
    list.push([p, q])
    byStart.set(p.join(), list)
  }
}
const seen = new Set()
const outline = []
for (const [a, b] of outer) {
  const key = (p, q) => `${p.join()}>${q.join()}`
  if (seen.has(key(a, b))) continue
  const line = [a, b]
  seen.add(key(a, b)).add(key(b, a))
  for (;;) {
    const end = line[line.length - 1]
    const next = (byStart.get(end.join()) ?? []).find(([p, q]) => !seen.has(key(p, q)))
    if (!next) break
    seen.add(key(next[0], next[1])).add(key(next[1], next[0]))
    line.push(next[1])
  }
  outline.push(line.map(flat))
}
const route = trailLines(details).map((l) => l.map(flat))
const parnell = trailLines(details, PLACES.find((p) => p.id === 'parnell').trail).map((l) => l.map(flat))
const ends = route.flat().reduce(([w, e], p) => [p[0] < w[0] ? p : w, p[0] > e[0] ? p : e], [[Infinity, 0], [-Infinity, 0]])
const trailMap = {
  width: 600,
  height: Math.ceil((N_LAT - 42.45) * K),
  outline: pathData(outline.map((l) => simplify(l, 0.4)), 1),
  route: pathData(route.map((l) => simplify(l, 0.5)), 1),
  segment: pathData(parnell.map((l) => simplify(l, 0.4)), 1),
  // St. Croix Falls in the west, Sturgeon Bay in the east
  ends: ends.map((p) => p.map((n) => +n.toFixed(1))),
}
console.log(`trail map: ${route.length} ways, outline ${outline.length} lines`)

// The footer: Chautauqua Meadow up to Green Mountain's summit, as the crow flies
const fine = await readRaster('dem-fine')
let top = 0
for (let i = 1; i < fine.data.length; i++) if (fine.data[i] > fine.data[top]) top = i
const summit = [fine.bbox[0] + (top % fine.width) * FINE.res, fine.bbox[3] - Math.floor(top / fine.width) * FINE.res]
const [meadowE, meadowN] = proj4('EPSG:4326', utm(13), [-105.28315, 39.99968])
const at = (e, n) => fine.data[Math.round((fine.bbox[3] - n) / FINE.res) * fine.width + Math.round((e - fine.bbox[0]) / FINE.res)]
const STEPS = 60
const points = Array.from({ length: STEPS + 1 }, (_, i) => Math.round(at(meadowE + ((summit[0] - meadowE) * i) / STEPS, meadowN + ((summit[1] - meadowN) * i) / STEPS) / FT))
const profile = {
  from: 'Chautauqua Meadow',
  to: 'Green Mountain',
  miles: +(Math.hypot(summit[0] - meadowE, summit[1] - meadowN) / 1609.344).toFixed(1),
  points,
}
console.log(`profile: ${points[0]} ft to ${points[STEPS]} ft over ${profile.miles} mi`)

const ts = `// Generated by scripts/meadow/maps.mjs from USGS 3DEP lidar, NOAA NCEI Great Lakes bathymetry (both public domain),
// OpenStreetMap (© OpenStreetMap contributors, ODbL, through Waymarked Trails) and US Census county outlines. Do not edit by hand.

export type MapInk = 'land' | 'lake'
export type MapPin = { x: number; y: number; label: string; sub?: string; href?: string }
export type MapLabel = { x: number; y: number; text: string; kind: 'trail' | 'water' | 'feature' }
export type PlaceMap = {
  name: string
  region: string
  coords: string
  intervals: string
  range: string
  credit: string
  width: number
  height: number
  inks: { ink: MapInk; src: string }[]
  trail?: string
  pins: MapPin[]
  labels: MapLabel[]
}
export type PlaceId = ${PLACES.map((p) => `'${p.id}'`).join(' | ')}

export const MAPS: Record<PlaceId, PlaceMap> = ${JSON.stringify(maps, null, 2)}

export const TRAIL_MAP: {
  width: number
  height: number
  outline: string
  route: string
  segment: string
  ends: number[][]
} = ${JSON.stringify(trailMap)}

export const PROFILE = ${JSON.stringify(profile)}
`
await writeFile(new URL('../../src/lib/maps.ts', import.meta.url), ts)
console.log('Wrote src/lib/maps.ts and public/maps/')
