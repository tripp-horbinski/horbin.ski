// Downloads USGS 3DEP lidar elevation and NAIP aerial imagery around Green
// Mountain into scripts/meadow/.cache. Both are public domain US government data.
//
//   node scripts/meadow/fetch.mjs

import { mkdir, writeFile } from 'node:fs/promises'
import { fromArrayBuffer } from 'geotiff'
import { CACHE, COARSE, FINE, gridSize } from './config.mjs'

const ELEVATION = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer'
const NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer'
// The services refuse much more than this in one request, and drop some under load
const TILE = 1000
const ATTEMPTS = 6

async function exportTile(service, bbox, size, extra) {
  const params = new URLSearchParams({
    bbox: bbox.join(','),
    bboxSR: '26913',
    imageSR: '26913',
    size: size.join(','),
    format: 'tiff',
    f: 'image',
    ...extra,
  })
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${service}/exportImage?${params}`)
    const type = res.headers.get('content-type') ?? ''
    if (res.ok && type.includes('tif')) {
      const buf = await res.arrayBuffer()
      const image = await (await fromArrayBuffer(buf)).getImage()
      return image.readRasters({ interleave: true })
    }
    if (attempt === ATTEMPTS) throw new Error(`${res.status} ${type}: ${(await res.text()).slice(0, 200)}`)
    await new Promise((r) => setTimeout(r, 1500 * attempt))
  }
}

// Fetch a grid tile by tile and stitch it into one raw raster
async function fetchGrid(service, grid, extra, name, { type, bands }) {
  const [w, h] = gridSize(grid)
  const [x0, , , y1] = grid.bbox
  const out = type === 'f32' ? new Float32Array(w * h * bands) : new Uint8Array(w * h * bands)
  for (let ty = 0; ty < h; ty += TILE) {
    for (let tx = 0; tx < w; tx += TILE) {
      const tw = Math.min(TILE, w - tx)
      const th = Math.min(TILE, h - ty)
      const bbox = [x0 + tx * grid.res, y1 - (ty + th) * grid.res, x0 + (tx + tw) * grid.res, y1 - ty * grid.res]
      process.stdout.write(`\r${name}: tile ${tx},${ty} of ${w}×${h}   `)
      const tile = await exportTile(service, bbox, [tw, th], extra)
      for (let row = 0; row < th; row++) {
        out.set(tile.subarray(row * tw * bands, (row + 1) * tw * bands), ((ty + row) * w + tx) * bands)
      }
    }
  }
  await writeFile(new URL(`${name}.bin`, CACHE), Buffer.from(out.buffer))
  await writeFile(new URL(`${name}.json`, CACHE), JSON.stringify({ width: w, height: h, bands, type, ...grid }))
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < out.length; i += bands * 31) {
    lo = Math.min(lo, out[i])
    hi = Math.max(hi, out[i])
  }
  console.log(`\r${name}: ${w}×${h}×${bands}, first band ${lo.toFixed(1)} to ${hi.toFixed(1)}`)
}

await mkdir(CACHE, { recursive: true })
const dem = { pixelType: 'F32', interpolation: 'RSP_BilinearInterpolation' }
await fetchGrid(ELEVATION, FINE, dem, 'dem-fine', { type: 'f32', bands: 1 })
await fetchGrid(ELEVATION, COARSE, dem, 'dem-coarse', { type: 'f32', bands: 1 })
await fetchGrid(NAIP, FINE, { pixelType: 'U8', bandIds: '0,1,2,3' }, 'naip', { type: 'u8', bands: 4 })
