// Builds the Backpacking page's trip map: the Arctic Circle Trail across West
// Greenland as Tripp walked it in August 2025, from his watch's track, over
// contour lines and lakes from the Copernicus GLO-30 elevation model, with the
// trail's huts from OpenStreetMap. Writes the masks to public/maps/act-land.svg
// and act-water.svg, and the track, his camps, his days and the huts to the
// generated src/lib/arctic-circle-trail.ts.
//
//   npm run meadow:act -- hike.gpx [--preview]
//
// Only the track's positions and times are read; the heart rate his watch
// recorded stays in the file, and the file stays out of the repo. The
// elevation tiles and the huts download into .cache on the first run.

import { readFile, writeFile } from 'node:fs/promises'
import { fromUrl } from 'geotiff'
import proj4 from 'proj4'
import sharp from 'sharp'
import { CACHE } from './config.mjs'
import { blur, contourLines, lengthOf, pathData, simplify } from './contours.mjs'

const UTM = '+proj=utm +zone=22 +datum=WGS84 +units=m +no_defs'
// Copernicus GLO-30: one-degree cloud-optimized GeoTIFFs in AWS's open data
const DEM = (lat, west) => {
  const name = `Copernicus_DSM_COG_10_N${lat}_00_W${String(west).padStart(3, '0')}_00_DEM`
  return `https://copernicus-dem-30m.s3.amazonaws.com/${name}/${name}.tif`
}
const OVERPASS = 'https://overpass-api.de/api/interpreter'
// The grid is traced at about the model's own spacing; the map is drawn in
// units of 100 m
const RES = 30
const UNIT = 100
const MARGIN = 3000
// Contours every 50 m, every fifth an index line, in map units
const INTERVAL = 50
const LINES = { minor: 0.35, index: 0.7, minorOpacity: 0.7, tolerance: 0.12, shortest: 2 }
// A lake is a patch of the model this big that's dead flat: Copernicus
// levels its lakes, and nothing else comes out that flat
const LAKE = 40
// A pause in the track this long is a night's camp
const NIGHT = 3 * 3600e3
// West Greenland summer time, for the dates of his days on the trail
const LOCAL = -2 * 3600e3
// A climb counts once the watch's height has risen this far, so its
// meter-by-meter wobble doesn't add up
const STEP = 3
// Huts as the trail's maps name them, where OSM's spelling or splitting differs
const NAMES = {
  Kanocenteret: 'Canoe Centre',
  Equalugaarniarfik: 'Eqalugaarniarfik',
  'Innajuattoq I': 'Innajuattoq',
  'Innajuattoq II': 'Innajuattoq',
  'Kangerluarsuk Tulleq Nord': 'Kangerluarsuk Tulleq',
  'Kangerluarsuk Tulleq Syd': 'Kangerluarsuk Tulleq',
}

const cached = (name) => new URL(name, CACHE)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d
const day = (t) => new Date(t + LOCAL).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

// His track: positions, his watch's barometric heights, times, and the
// distance it had measured so far
async function readTrack(file) {
  const xml = await readFile(file, 'utf8')
  const points = []
  const re = /<trkpt lat="([-\d.]+)" lon="([-\d.]+)">\s*<ele>([-\d.]+)<\/ele>\s*<time>([^<]+)<\/time>[\s\S]*?<gpxdata:distance>([\d.]+)</g
  for (let m; (m = re.exec(xml)); ) points.push({ lat: +m[1], lon: +m[2], ele: +m[3], t: Date.parse(m[4]), km: +m[5] / 1000 })
  if (!points.length) throw new Error(`no track points in ${file}`)
  return points
}

// The huts along the trail, from OpenStreetMap through Overpass
async function readHuts(bbox) {
  try {
    return JSON.parse(await readFile(cached('act-huts.json'), 'utf8'))
  } catch {}
  const [s, w, n, e] = bbox
  const query = `[out:json][timeout:60];(nwr["tourism"="wilderness_hut"](${s},${w},${n},${e}););out center tags;`
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'User-Agent': 'horbin.ski map build (https://tripp.horbin.ski)', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }),
    })
    const text = await res.text()
    if (res.ok && text.startsWith('{')) {
      await writeFile(cached('act-huts.json'), text)
      return JSON.parse(text)
    }
    if (attempt === 6) throw new Error(`Overpass: ${res.status} ${text.slice(0, 200)}`)
    // The public servers turn queries away when they're busy
    await sleep(10000 * attempt)
  }
}

// The elevation model over the box, resampled onto the UTM grid (nearest
// sample, so lakes stay dead flat), cached raw with a JSON sidecar
async function elevation(box, width, height) {
  try {
    const meta = JSON.parse(await readFile(cached('act-dem.json'), 'utf8'))
    if (meta.width === width && meta.height === height && meta.box.join() === box.join()) {
      const buf = await readFile(cached('act-dem.bin'))
      return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
    }
  } catch {}
  const [x0, y0, x1, y1] = box
  const toLonLat = proj4(UTM, 'EPSG:4326')
  // The model's one-degree tiles the box touches
  const corners = [[x0, y0], [x0, y1], [x1, y0], [x1, y1]].map((p) => toLonLat.forward(p))
  const lats = corners.map((c) => c[1])
  const lons = corners.map((c) => c[0])
  const tiles = new Map()
  for (let lat = Math.floor(Math.min(...lats)); lat <= Math.floor(Math.max(...lats)); lat++) {
    for (let west = Math.ceil(-Math.max(...lons)); west <= Math.ceil(-Math.min(...lons)); west++) {
      process.stdout.write(`elevation N${lat} W${west}: downloading\n`)
      const image = await (await fromUrl(DEM(lat, west))).getImage()
      const w = image.getWidth()
      const h = image.getHeight()
      // Only the rows and columns the box needs
      const c0 = Math.max(0, Math.floor((Math.min(...lons) + west) * w) - 2)
      const c1 = Math.min(w, Math.ceil((Math.max(...lons) + west) * w) + 2)
      const r0 = Math.max(0, Math.floor((lat + 1 - Math.max(...lats)) * h) - 2)
      const r1 = Math.min(h, Math.ceil((lat + 1 - Math.min(...lats)) * h) + 2)
      if (c1 <= c0 || r1 <= r0) continue
      const [data] = await image.readRasters({ window: [c0, r0, c1, r1] })
      tiles.set(`${lat},${west}`, { data, w, h, c0, r0, cw: c1 - c0, ch: r1 - r0 })
    }
  }
  const z = new Float32Array(width * height)
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const [lon, lat] = toLonLat.forward([x0 + (col + 0.5) * RES, y1 - (row + 0.5) * RES])
      const t = tiles.get(`${Math.floor(lat)},${Math.ceil(-lon)}`)
      if (!t) continue
      const c = Math.min(t.cw - 1, Math.max(0, Math.floor((lon + Math.ceil(-lon)) * t.w) - t.c0))
      const r = Math.min(t.ch - 1, Math.max(0, Math.floor((Math.floor(lat) + 1 - lat) * t.h) - t.r0))
      z[row * width + col] = t.data[r * t.cw + c]
    }
  }
  await writeFile(cached('act-dem.bin'), Buffer.from(z.buffer))
  await writeFile(cached('act-dem.json'), JSON.stringify({ box, width, height }))
  return z
}

// Water: the sea, at or below zero, and every lake, a patch the model leveled
function waterMask(z, w, h) {
  const flat = new Uint8Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const v = z[i]
      if (v > 0 && v === z[i - 1] && v === z[i + 1] && v === z[i - w] && v === z[i + w]) flat[i] = 1
    }
  }
  const water = new Uint8Array(w * h)
  const seen = new Uint8Array(w * h)
  const stack = []
  for (let i = 0; i < w * h; i++) {
    if (z[i] <= 0) water[i] = 1
    if (!flat[i] || seen[i]) continue
    const blob = []
    stack.push(i)
    seen[i] = 1
    while (stack.length) {
      const j = stack.pop()
      blob.push(j)
      for (const k of [j - 1, j + 1, j - w, j + w]) {
        if (k >= 0 && k < w * h && flat[k] && !seen[k]) {
          seen[k] = 1
          stack.push(k)
        }
      }
    }
    // Grown back out a sample, to the shore the flatness test stops short of
    if (blob.length >= LAKE) for (const j of blob) for (const k of [j, j - 1, j + 1, j - w, j + w]) water[k] = 1
  }
  return water
}

// Contour lines every INTERVAL, the index lines apart
function contours(z, w, h, scale) {
  let lo = Infinity
  let hi = -Infinity
  for (const v of z) {
    lo = Math.min(lo, v)
    hi = Math.max(hi, v)
  }
  const minor = []
  const index = []
  for (let level = Math.max(INTERVAL, Math.ceil(lo / INTERVAL) * INTERVAL); level <= hi; level += INTERVAL) {
    const lines = contourLines(z, w, h, level)
      .filter((l) => lengthOf(l) * scale >= LINES.shortest)
      .map((l) => simplify(l, LINES.tolerance / scale))
    ;(Math.round(level / INTERVAL) % 5 === 0 ? index : minor).push(...lines)
  }
  return { minor: pathData(minor, scale), index: pathData(index, scale), hi }
}

// The water's outline as closed rings, the grid padded so the sea's closes
// along the map's edge, smoothed a little off the samples' staircase
function shores(water, w, h, scale) {
  const pw = w + 2
  const ph = h + 2
  const grid = new Float32Array(pw * ph)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) grid[(y + 1) * pw + x + 1] = water[y * w + x]
  const smooth = blur({ data: grid, width: pw, height: ph }, 1)
  const rings = contourLines(smooth, pw, ph, 0.5)
    .map((l) => simplify(l.map(([x, y]) => [x - 1, y - 1]), 0.6))
    .filter((l) => l.length > 3)
  return pathData(rings, scale)
}

async function main() {
  const file = process.argv[2]
  if (!file || file.startsWith('--')) throw new Error('usage: npm run meadow:act -- hike.gpx')
  const toUtm = proj4('EPSG:4326', UTM)
  const raw = (await readTrack(file)).map((p) => ({ ...p, xy: toUtm.forward([p.lon, p.lat]) }))

  // His camps: wherever the track stops for the night. Distances are his
  // watch's, which smooths out the GPS's wander
  const nights = raw.filter((p, i) => i + 1 < raw.length && raw[i + 1].t - p.t > NIGHT)
  const total = raw[raw.length - 1].km

  // The map's box: the track with a margin, on the grid. (Too many points to
  // spread into Math.min.)
  const [ex0, ey0, ex1, ey1] = raw.reduce(
    ([a, b, c, d], { xy: [x, y] }) => [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)],
    [Infinity, Infinity, -Infinity, -Infinity],
  )
  const x0 = Math.floor((ex0 - MARGIN) / RES) * RES
  const y0 = Math.floor((ey0 - MARGIN) / RES) * RES
  const x1 = Math.ceil((ex1 + MARGIN) / RES) * RES
  const y1 = Math.ceil((ey1 + MARGIN) / RES) * RES
  const w = (x1 - x0) / RES
  const h = (y1 - y0) / RES
  const at = ([x, y]) => [round((x - x0) / UNIT, 2), round((y1 - y) / UNIT, 2)]
  console.log(`track ${raw.length} points, ${total.toFixed(1)} km, ${nights.length} nights; map ${w}×${h} at ${RES} m`)

  const z = await elevation([x0, y0, x1, y1], w, h)
  const water = waterMask(z, w, h)

  // Contours at twice the grid's spacing, averaged and smoothed
  const cw = Math.floor(w / 2)
  const ch = Math.floor(h / 2)
  const coarse = new Float32Array(cw * ch)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = 2 * y * w + 2 * x
      coarse[y * cw + x] = Math.max(0, (z[i] + z[i + 1] + z[i + w] + z[i + w + 1]) / 4)
    }
  }
  const land = contours(blur({ data: coarse, width: cw, height: ch }, 1), cw, ch, (2 * RES) / UNIT)
  const sea = shores(water, w, h, RES / UNIT)
  const width = round((x1 - x0) / UNIT)
  const height = round((y1 - y0) / UNIT)
  await writeFile(
    new URL('../../public/maps/act-land.svg', import.meta.url),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
      `<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">` +
      `<path stroke-width="${LINES.minor}" stroke-opacity="${LINES.minorOpacity}" d="${land.minor}"/>` +
      `<path stroke-width="${LINES.index}" d="${land.index}"/></g></svg>\n`,
  )
  await writeFile(
    new URL('../../public/maps/act-water.svg', import.meta.url),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="#000" fill-rule="evenodd" d="${sea}"/></svg>\n`,
  )

  // The track as drawn: simplified to within 20 m, each point with how far
  // along it is, so the page can put him anywhere on it, and the ground's
  // height there in meters, for the profile under the map
  const line = simplify(raw.map((p) => at(p.xy)), 0.2)
  const groundAt = ([x, y]) => {
    const col = Math.min(w - 1, Math.max(0, Math.floor((x * UNIT) / RES)))
    const row = Math.min(h - 1, Math.max(0, Math.floor((y * UNIT) / RES)))
    return Math.max(0, Math.round(z[row * w + col]))
  }
  let along = 0
  const track = line.map((p, i) => {
    if (i) along += Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1])
    return [p[0], p[1], round(along, 2), groundAt(p)]
  })
  const alongAt = (xy) => {
    const [px, py] = at(xy)
    let best = track[0]
    for (const t of track) if (Math.hypot(t[0] - px, t[1] - py) < Math.hypot(best[0] - px, best[1] - py)) best = t
    return best[2]
  }

  // The huts within reach of the track, one per name
  const [lon0, lat0] = proj4(UTM, 'EPSG:4326').forward([x0, y0])
  const [lon1, lat1] = proj4(UTM, 'EPSG:4326').forward([x1, y1])
  const osm = await readHuts([round(lat0 - 0.05, 3), round(lon0 - 0.1, 3), round(lat1 + 0.05, 3), round(lon1 + 0.1, 3)])
  const near = (xy) => track.reduce((d, [x, y]) => Math.min(d, Math.hypot(x * UNIT + x0 - xy[0], y1 - y * UNIT - xy[1])), Infinity)
  const huts = new Map()
  for (const e of osm.elements) {
    const osmName = e.tags?.name || e.tags?.['name:en']
    const name = NAMES[osmName] ?? osmName
    if (!name || /approximate/i.test(name)) continue
    const c = e.center ?? e
    const xy = toUtm.forward([c.lon, c.lat])
    const d = near(xy)
    if (d > 1500 || (huts.has(name) && huts.get(name).d <= d)) continue
    huts.set(name, { name, xy, d })
  }
  const hutNear = (xy) => [...huts.values()].find((hut) => Math.hypot(hut.xy[0] - xy[0], hut.xy[1] - xy[1]) < 600)?.name

  const camps = nights.map((p, i) => ({
    night: i + 1,
    place: hutNear(p.xy) ?? 'Camp',
    date: day(p.t),
    km: Math.round(p.km),
    x: at(p.xy)[0],
    y: at(p.xy)[1],
    along: alongAt(p.xy),
  }))
  // Each day on the trail, between one night's camp and the next: how far his
  // watch measured, how much he climbed, and how long from setting out to
  // stopping, breaks and all
  const breaks = [0, ...nights.map((p) => raw.indexOf(p) + 1), raw.length]
  const days = breaks.slice(1).map((b, d) => {
    const from = raw[breaks[d]]
    const to = raw[b - 1]
    let gain = 0
    let base = from.ele
    for (let i = breaks[d]; i < b; i++) {
      const e = raw[i].ele
      if (e - base >= STEP) {
        gain += e - base
        base = e
      } else if (e < base) base = e
    }
    return { day: d + 1, date: day(from.t), km: round(to.km - from.km), gain: Math.round(gain), hours: round((to.t - from.t) / 3600e3) }
  })
  console.log(`days: ${days.map((d) => `${d.day} ${d.km} km +${d.gain} m ${d.hours} h`).join(' · ')}`)

  const first = raw[0]
  const last = raw[raw.length - 1]
  const data = {
    width,
    height,
    unit: UNIT,
    inks: [
      { ink: 'land', src: '/maps/act-land.svg' },
      { ink: 'water', src: '/maps/act-water.svg' },
    ],
    track,
    length: round(along, 2),
    km: Math.round(total),
    start: { place: 'Kangerlussuaq', date: day(first.t), x: at(first.xy)[0], y: at(first.xy)[1] },
    end: { place: 'Sisimiut', date: day(last.t), km: Math.round(total), x: at(last.xy)[0], y: at(last.xy)[1] },
    camps,
    days,
    gain: days.reduce((sum, d) => sum + d.gain, 0),
    huts: [...huts.values()].map((hut) => ({ name: hut.name, x: at(hut.xy)[0], y: at(hut.xy)[1] })),
    year: new Date(first.t).getUTCFullYear(),
    highest: Math.round(land.hi),
  }
  const ts =
    `// Generated by scripts/meadow/career-map.mjs from Tripp's watch track of the Arctic Circle Trail,\n` +
    `// the Copernicus GLO-30 elevation model and OpenStreetMap's huts. Do not edit by hand.\n` +
    `// Positions are in map units of ${UNIT} m from the map's top left corner. Each track point is\n` +
    `// x, y, how far along the track it is in the same units, and the ground's height in meters.\n\n` +
    `export const ARCTIC_CIRCLE_TRAIL = ${JSON.stringify(data)} as const\n`
  await writeFile(new URL('../../src/lib/arctic-circle-trail.ts', import.meta.url), ts)
  console.log(`camps: ${camps.map((c) => `${c.night} ${c.place} km ${c.km}`).join(' · ')}`)
  console.log(`huts: ${[...huts.keys()].join(', ')}`)

  if (process.argv.includes('--preview')) {
    const masks = await Promise.all(['act-land.svg', 'act-water.svg'].map((f) => readFile(new URL(`../../public/maps/${f}`, import.meta.url), 'utf8')))
    const inner = (svg) => svg.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '')
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 2}" height="${height * 2}">` +
      `<rect width="100%" height="100%" fill="#EDE7D8"/><g fill="#9CB7C2" stroke="#9CB7C2" color="#9CB7C2">${inner(masks[1])}</g>` +
      `<g stroke="#8A7F6A">${inner(masks[0]).replace(/stroke="#000"/, '')}</g>` +
      `<path d="${pathData([track.map(([x, y]) => [x, y])], 1)}" fill="none" stroke="#B5523B" stroke-width="1.2"/>` +
      camps.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="2.5" fill="#2F4A3A"/>`).join('') +
      `</svg>`
    await sharp(Buffer.from(svg)).png().toFile(cached('act-preview.png').pathname)
    console.log('wrote act-preview.png')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
