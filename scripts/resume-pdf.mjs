// Prints the homepage to public/tripp-horbinski-resume.pdf, the PDF it offers:
// on paper the page is just its print-only resume (src/components/Resume.tsx),
// so the two always say the same thing. Run it against the dev server or any
// build of the site whenever src/content/career.ts changes:
//
//   npm run resume:pdf [-- http://localhost:3000/]
//
// Needs Google Chrome; set CHROME to its binary if it isn't in /Applications.

import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = process.argv[2] ?? 'http://localhost:3000/'
const out = new URL('../public/tripp-horbinski-resume.pdf', import.meta.url)
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = await mkdtemp(join(tmpdir(), 'resume-pdf-'))
const chrome = spawn(
  chromePath,
  ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
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

  // Printed in the light theme, whatever the machine prefers
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await send('Page.navigate', { url })

  // The dev server may still be compiling; wait for the page and its fonts
  let ready = false
  for (let i = 0; i < 120 && !ready; i++) {
    await sleep(500)
    ready = await evaluate(`document.fonts.status === 'loaded' && !!document.querySelector('.resume')`)
  }
  if (!ready) throw new Error(`The resume never loaded at ${url}; is the site running?`)

  const { data } = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: false })
  await writeFile(out, Buffer.from(data, 'base64'))
  console.log(`Wrote ${out.pathname} from ${url}`)
} finally {
  chrome.kill()
  await rm(profile, { recursive: true, force: true }).catch(() => {})
}
