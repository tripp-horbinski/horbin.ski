// Shared settings for the meadow terrain pipeline. Everything is in UTM zone 13N
// (NAD83) meters so the elevation grid, the imagery, and the camera agree.

import { readFile } from 'node:fs/promises'

export const UTM = '+proj=utm +zone=13 +datum=NAD83 +units=m +no_defs'
export const CACHE = new URL('./.cache/', import.meta.url)

// Green Mountain and the Flatirons at lidar detail, plus a wide coarse grid for
// the far skyline to the south and west
export const FINE = { bbox: [471800, 4423600, 476600, 4428300], res: 1.5 }
export const COARSE = { bbox: [455000, 4410000, 481000, 4436000], res: 13 }

// Output frame: the 1200×800 reference composition the scene is laid out in,
// widened so wide screens and parallax have terrain to show
export const FRAME = { width: 1200, height: 800, x0: -600, x1: 1800 }

// Standing at the north end of Chautauqua Meadow (39.99968, -105.28315), facing
// southwest. Found by calibrate.mjs: the lidar skyline from here matches the
// reference photo's skyline to within the height of the ridgeline pines.
export const CAMERA = { E: 475830.1, N: 4427760.5, eye: 1.7, heading: 218.871, pitch: 9.596, roll: -0.615, f: 1266.7, cx: 600, cy: 400 }

// The day the scene takes place on: late summer, clocks on Mountain Daylight Time
export const DAY = '2025-08-28'
export const UTC_OFFSET = -6

export const gridSize = ({ bbox: [x0, y0, x1, y1], res }) => [Math.round((x1 - x0) / res), Math.round((y1 - y0) / res)]

// Rasters are cached as raw row-major arrays, north row first, with a JSON sidecar
export async function readRaster(name) {
  const meta = JSON.parse(await readFile(new URL(`${name}.json`, CACHE), 'utf8'))
  const buf = await readFile(new URL(`${name}.bin`, CACHE))
  const data = meta.type === 'f32' ? new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4) : new Uint8Array(buf)
  return { ...meta, data }
}
