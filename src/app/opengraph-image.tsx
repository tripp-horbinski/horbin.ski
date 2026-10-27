import { ImageResponse } from 'next/og'
import { DAY, flatironsSvg } from '@/lib/flatirons'

export const dynamic = 'force-static'
export const alt = 'Tripp Horbinski — the Boulder Flatirons'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Google Fonts serves TTF to clients without a browser user agent, which Satori can read
async function loadDisplayFont() {
  try {
    const css = await (
      await fetch('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@600')
    ).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    return url ? await (await fetch(url)).arrayBuffer() : null
  } catch {
    return null
  }
}

export default async function Image() {
  const font = await loadDisplayFont()
  // 600×235 crop of the scene fills the 1200×470 picture above the caption band
  const scene = flatironsSvg(DAY, '0 58 600 235', 'day')
  const src = `data:image/svg+xml;base64,${Buffer.from(scene).toString('base64')}`

  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#EDE7D8' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={1200} height={470} alt="" />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 64px',
            color: '#3B3A33',
            fontFamily: font ? 'Josefin Sans' : undefined,
            textTransform: 'uppercase',
          }}
        >
          <div style={{ fontSize: 60, letterSpacing: '0.14em', lineHeight: 1 }}>Tripp Horbinski</div>
          <div style={{ fontSize: 22, letterSpacing: '0.2em', color: '#6E6A5C' }}>Boulder, Colorado</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: 'Josefin Sans', data: font, weight: 600, style: 'normal' }] : undefined,
    }
  )
}
