import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'
export const alt = 'Tripp Horbinski — Developer & Runner'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: '#141414',
            textAlign: 'center',
            marginBottom: '24px',
            fontFamily: 'Inter',
          }}
        >
          Tripp Horbinski
        </div>
        <div
          style={{
            fontSize: '32px',
            color: '#5e5e5e',
            textAlign: 'center',
            fontFamily: 'Inter',
          }}
        >
          Developer & Runner
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
