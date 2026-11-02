// Brings Esker's Google Play graphics from its repo (store/) into public/esker
// for its card under On my own time: each screenshot at the size it's enlarged
// to and at half that for the row, and its icon. Run it whenever they change:
//
//   npm run esker:shots [-- /path/to/esker]

import { mkdir, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const store = join(process.argv[2] ?? join(homedir(), 'git/esker'), 'store')
const out = fileURLToPath(new URL('../public/esker/', import.meta.url))
await mkdir(out, { recursive: true })

const shots = (await readdir(join(store, 'screenshots'))).filter((f) => f.endsWith('.png'))
for (const file of shots) {
  const name = file.replace('.png', '')
  const png = sharp(join(store, 'screenshots', file))
  await png.clone().webp({ quality: 80, smartSubsample: true }).toFile(join(out, `${name}.webp`))
  await png.clone().resize(540).webp({ quality: 80, smartSubsample: true }).toFile(join(out, `${name}-540.webp`))
}
await sharp(join(store, 'icon-512.png')).resize(128).webp({ quality: 85 }).toFile(join(out, 'icon.webp'))
console.log(`${shots.length} screenshots and the icon in public/esker`)
