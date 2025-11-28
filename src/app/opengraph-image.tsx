import { ImageResponse } from 'next/og'
import { Code2, Zap } from 'lucide-react'

export const dynamic = 'force-static'
export const alt = 'Horbin.ski - Tech & Running Blog'
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
          backgroundColor: '#fafafa',
          backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #fef2f2 100%)',
        }}
      >
        {/* Icons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Code2 size={40} color="white" />
          </div>
          <div
            style={{
              width: '32px',
              height: '4px',
              background: 'linear-gradient(90deg, #0ea5e9 0%, #ef4444 100%)',
              borderRadius: '2px',
            }}
          />
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={40} color="white" />
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: '#171717',
            textAlign: 'center',
            marginBottom: '24px',
            fontFamily: 'Inter',
          }}
        >
          Horbin.ski
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '32px',
            color: '#525252',
            textAlign: 'center',
            fontFamily: 'Inter',
          }}
        >
          Tech meets Running
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
