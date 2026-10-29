// Screenshots the homepage, the meadow at its opening hour, as the picture
// link previews show (public/og.jpg, 1200×630). Run it against the dev server
// or any build of the site whenever the scene changes:
//
//   npm run meadow:og [-- http://localhost:3000/]
//
// Needs Google Chrome; set CHROME to its binary if it isn't in /Applications.

import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

const url = process.argv[2] ?? 'http://localhost:3000/'
const out = new URL('../../public/og.jpg', import.meta.url)
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const W = 1200
const H = 630

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = await mkdtemp(join(tmpdir(), 'meadow-og-'))
const chrome = spawn(
  chromePath,
  [
    '--headless=new', '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ],
  { stdio: 'ignore' },
)

try {
  // Chrome writes the port it picked into the profile
  let port = null
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100)
    port = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').then((s) => s.split('\n')[0], () => null)
  }
  if (!port) throw new Error(`Chrome didn't start from ${chromePath}`)
  const target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    pending.get(m.id)?.(m)
    pending.delete(m.id)
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id
      pending.set(i, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)))
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value

  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  // With reduced motion the grass stands still and the camera holds, so every run gets the same frame
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await send('Page.navigate', { url })

  // The dev server may still be compiling; wait for the scene and its lettering
  let ready = false
  for (let i = 0; i < 120 && !ready; i++) {
    await sleep(500)
    ready = await evaluate(`document.fonts.status === 'loaded' && document.querySelector('.meadow-canvas')?.width > 0`)
  }
  if (!ready) throw new Error(`The meadow never drew at ${url}; is the site running?`)
  await sleep(1500)

  // The picture is the scene, his name and his role, without the buttons, the
  // controls or Next's dev badge
  await evaluate(`document.head.insertAdjacentHTML('beforeend', '<style>.meadow-top, .home-actions, .home-cue, nextjs-portal { display: none !important }</style>')`)
  await sleep(200)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  // As a JPEG it stays well under the ~300 KB some apps (WhatsApp) allow a preview picture
  await sharp(Buffer.from(data, 'base64')).jpeg({ quality: 88, mozjpeg: true }).toFile(out.pathname)
  console.log(`Wrote ${out.pathname} from ${url}`)
} finally {
  chrome.kill()
  await rm(profile, { recursive: true, force: true })
}
