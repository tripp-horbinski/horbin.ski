// Overhead previews of the cached rasters, to check the data before rendering:
// a hillshade of the lidar and a false-color NAIP (infrared as red, so trees glow).
//
//   node scripts/meadow/preview-data.mjs

import sharp from 'sharp'
import { CACHE, readRaster } from './config.mjs'

const dem = await readRaster('dem-fine')
const naip = await readRaster('naip')
const { width: w, height: h, res } = dem

const shade = new Uint8Array(w * h)
const light = [-0.5, 0.5, 0.7] // from the northwest, the cartographic convention
const ln = Math.hypot(...light)
for (let y = 1; y < h - 1; y++) {
  for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const dx = (dem.data[i + 1] - dem.data[i - 1]) / (2 * res)
    const dy = (dem.data[i - w] - dem.data[i + w]) / (2 * res)
    const n = [-dx, -dy, 1]
    const d = (n[0] * light[0] + n[1] * light[1] + n[2] * light[2]) / (Math.hypot(...n) * ln)
    shade[i] = Math.max(0, Math.min(255, 255 * d))
  }
}
await sharp(shade, { raw: { width: w, height: h, channels: 1 } }).resize(1200).png().toFile(new URL('hillshade.png', CACHE).pathname)

const false3 = new Uint8Array(w * h * 3)
for (let i = 0; i < w * h; i++) {
  false3[i * 3] = naip.data[i * 4 + 3]
  false3[i * 3 + 1] = naip.data[i * 4]
  false3[i * 3 + 2] = naip.data[i * 4 + 1]
}
await sharp(false3, { raw: { width: w, height: h, channels: 3 } }).resize(1200).png().toFile(new URL('naip-false.png', CACHE).pathname)
console.log('wrote hillshade.png and naip-false.png')
