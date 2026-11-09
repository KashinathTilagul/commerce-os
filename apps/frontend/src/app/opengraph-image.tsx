import { ImageResponse } from 'next/og'

export const alt = 'Commerce OS — the operating system for a commerce company'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#07080c',
          color: '#F3EDE4',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: 6 }}>COMMERCE OS</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 68, lineHeight: 1.02, letterSpacing: -2, maxWidth: 900 }}>
            The operating system for a commerce company.
          </div>
          <div style={{ marginTop: 24, fontSize: 28, color: '#D5CFC6' }}>
            One organisation. Approval before the consequential step.
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
