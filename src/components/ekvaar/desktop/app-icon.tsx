'use client'

interface AppIconProps {
  variant: string
  size?: number
  className?: string
}

/**
 * macOS Big Sur app icon replicas.
 * Structure: Squircle (flex-center) → BackgroundLayer (absolute) → HighlightLayer (absolute) → Glyph (relative, z-10, centered)
 */
export function AppIcon({ variant, size = 56, className = '' }: AppIconProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <Squircle size={size}>
        <IconVariant variant={variant} size={size} />
      </Squircle>
    </div>
  )
}

function Squircle({ size, children }: { size: number; children: React.ReactNode }) {
  const r = size * 0.2235 // macOS corner radius ratio
  return (
    <div
      className="relative overflow-hidden flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: r,
        boxShadow: `
          0 1px 2px rgba(0,0,0,0.18),
          0 4px 10px rgba(0,0,0,0.28),
          inset 0 1px 0 rgba(255,255,255,0.30),
          inset 0 -1px 0 rgba(0,0,0,0.10)
        `,
      }}
    >
      {children}
    </div>
  )
}

function IconVariant({ variant, size }: { variant: string; size: number }) {
  switch (variant) {
    case 'board-room':    return <SystemSettingsIcon size={size} />
    case 'inbox':         return <MailIcon size={size} />
    case 'agents':        return <ContactsIcon size={size} />
    case 'issues':        return <RemindersIcon size={size} />
    case 'terminal':      return <TerminalIcon size={size} />
    case 'house':         return <BoxesIcon size={size} />
    case 'sales':         return <AppStoreIcon size={size} />
    case 'finance':       return <WalletIcon size={size} />
    case 'inventory':     return <FindMyIcon size={size} />
    case 'community':     return <PhotosIcon size={size} />
    case 'campaigns':     return <NewsIcon size={size} />
    case 'guardian':      return <ShieldIcon size={size} />
    case 'ai':            return <SafariIcon size={size} />
    case 'brand-book':    return <BooksIcon size={size} />
    default:              return <GenericIcon size={size} />
  }
}

// ============ LAYER HELPERS ============

/** Background layer — fills the squircle */
function Bg({ gradient }: { gradient: string }) {
  return <div className="absolute inset-0" style={{ background: gradient }} />
}

/** Glass highlight — top-down white fade */
function Highlight({ opacity = 0.25, stop = 50 }: { opacity?: number; stop?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,${opacity}) 0%, transparent ${stop}%)`,
      }}
    />
  )
}

/** Centered glyph container — relative, z-10, flex-center */
function Glyph({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <div
      className="relative z-10 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  )
}

// ============ ICON VARIANTS ============

// System Settings — gray gradient with gear
function SystemSettingsIcon({ size }: { size: number }) {
  const s = size * 0.52
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #8E8E93 0%, #48484A 100%)" />
      <Highlight opacity={0.22} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))' }}>
          {/* Gear */}
          <path
            d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94 0 .31.04.64.09.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            fill="#F5F5F7"
          />
        </svg>
      </Glyph>
    </>
  )
}

// Mail — blue gradient with white envelope
function MailIcon({ size }: { size: number }) {
  const s = size * 0.62
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #3E9EE8 0%, #1A6FD6 100%)" />
      <Highlight opacity={0.28} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s * 0.7} viewBox="0 0 24 16" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          <rect x="1" y="1" width="22" height="14" rx="2.5" fill="#FFFFFF" />
          <path d="M2 3.5l10 7 10-7" stroke="#1A6FD6" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Glyph>
    </>
  )
}

// Contacts — gray gradient with two silhouettes
function ContactsIcon({ size }: { size: number }) {
  const s = size * 0.62
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #F2F2F4 0%, #C9C9CE 100%)" />
      <Highlight opacity={0.40} stop={40} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.15))' }}>
          {/* Back person */}
          <circle cx="9" cy="8" r="3.2" fill="#6B6B70" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6v1H3v-1z" fill="#6B6B70" />
          {/* Front person */}
          <circle cx="15" cy="9" r="3.6" fill="#3A3A3E" />
          <path d="M9 20c0-3.6 2.9-6.5 6.5-6.5S22 16.4 22 20v1H9v-1z" fill="#3A3A3E" />
        </svg>
      </Glyph>
    </>
  )
}

// Reminders — white with checklist
function RemindersIcon({ size }: { size: number }) {
  const s = size * 0.66
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #FFFFFF 0%, #E8E8EA 100%)" />
      <Highlight opacity={0.50} stop={35} />
      <Glyph size={size}>
        <svg width={s} height={s * 0.85} viewBox="0 0 24 20" fill="none">
          {/* Row 1 */}
          <circle cx="4" cy="4" r="2.4" fill="#FF9500" />
          <path d="M2.9 4l0.8 0.8L5.3 3.2" stroke="#FFFFFF" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9" y="3.2" width="13" height="1.6" rx="0.8" fill="#C9C9CE" />
          {/* Row 2 */}
          <circle cx="4" cy="10" r="2.4" fill="#FF9500" />
          <path d="M2.9 10l0.8 0.8L5.3 9.2" stroke="#FFFFFF" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9" y="9.2" width="13" height="1.6" rx="0.8" fill="#C9C9CE" />
          {/* Row 3 */}
          <circle cx="4" cy="16" r="2.4" fill="#FF9500" />
          <path d="M2.9 16l0.8 0.8L5.3 15.2" stroke="#FFFFFF" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9" y="15.2" width="13" height="1.6" rx="0.8" fill="#C9C9CE" />
        </svg>
      </Glyph>
    </>
  )
}

// Terminal — black with green prompt
function TerminalIcon({ size }: { size: number }) {
  const s = size * 0.62
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #2A2A2A 0%, #0A0A0A 100%)" />
      <Highlight opacity={0.12} stop={30} />
      <Glyph size={size}>
        <svg width={s} height={s * 0.7} viewBox="0 0 24 16" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* Prompt chevron */}
          <path d="M3 4l4 4-4 4" stroke="#34C759" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Cursor */}
          <rect x="10" y="4" width="2" height="8" rx="0.5" fill="#FFFFFF" />
        </svg>
      </Glyph>
    </>
  )
}

// Boxes (House of Originals) — Neel Blue with stacked boxes
function BoxesIcon({ size }: { size: number }) {
  const s = size * 0.62
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #4A6B8F 0%, #1F3A5F 100%)" />
      <Highlight opacity={0.22} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* Top box */}
          <rect x="8" y="3" width="8" height="6" rx="1" fill="#F5F1EA" />
          <rect x="11.5" y="3" width="1" height="6" fill="#1F3A5F" opacity="0.35" />
          {/* Bottom-left box */}
          <rect x="3" y="11" width="8" height="6" rx="1" fill="#F5F1EA" />
          <rect x="6.5" y="11" width="1" height="6" fill="#1F3A5F" opacity="0.35" />
          {/* Bottom-right box */}
          <rect x="13" y="11" width="8" height="6" rx="1" fill="#F5F1EA" opacity="0.92" />
          <rect x="16.5" y="11" width="1" height="6" fill="#1F3A5F" opacity="0.35" />
        </svg>
      </Glyph>
    </>
  )
}

// App Store — blue with white "A" strokes (pencil, ruler, brush)
function AppStoreIcon({ size }: { size: number }) {
  const s = size * 0.62
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #2A9FF5 0%, #1573D6 100%)" />
      <Highlight opacity={0.28} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* Three strokes forming an A */}
          <path d="M12 4L4 20" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 4L20 20" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M7.5 16h9" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </Glyph>
    </>
  )
}

// Wallet — dark with stacked colored cards
function WalletIcon({ size }: { size: number }) {
  const s = size * 0.66
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #3A3A3E 0%, #1C1C1E 100%)" />
      <Highlight opacity={0.18} stop={40} />
      <Glyph size={size}>
        <svg width={s} height={s * 0.72} viewBox="0 0 24 17" fill="none" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.30))' }}>
          {/* Back card (orange, tilted) */}
          <g transform="rotate(-8 12 8.5)">
            <rect x="3" y="3" width="18" height="11" rx="2" fill="#FF9500" />
          </g>
          {/* Middle card (blue, tilted) */}
          <g transform="rotate(-4 12 8.5)">
            <rect x="3" y="3" width="18" height="11" rx="2" fill="#5AC8FA" />
          </g>
          {/* Front card (white) */}
          <rect x="3" y="3" width="18" height="11" rx="2" fill="#FFFFFF" />
          <circle cx="16" cy="8.5" r="1.4" fill="#FF3B30" />
          <rect x="5.5" y="6" width="6" height="0.8" rx="0.4" fill="#C9C9CE" />
          <rect x="5.5" y="7.5" width="4" height="0.8" rx="0.4" fill="#C9C9CE" />
        </svg>
      </Glyph>
    </>
  )
}

// Find My — green with location pulse
function FindMyIcon({ size }: { size: number }) {
  const s = size * 0.62
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #4CD964 0%, #2EB14E 100%)" />
      <Highlight opacity={0.28} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* Person silhouette */}
          <circle cx="12" cy="8" r="3.5" fill="#FFFFFF" />
          <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7v1H5v-1z" fill="#FFFFFF" />
        </svg>
      </Glyph>
    </>
  )
}

// Photos — pinwheel of 8 colors on white
function PhotosIcon({ size }: { size: number }) {
  const s = size * 0.78
  const cx = 12, cy = 12, r = 8.5
  const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#007AFF', '#AF52DE', '#FF2D55']
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #FFFFFF 0%, #E8E8EA 100%)" />
      <Highlight opacity={0.45} stop={35} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.15))' }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const a1 = (i * 45 - 22.5) * Math.PI / 180
            const a2 = (i * 45 + 22.5) * Math.PI / 180
            const x1 = cx + r * Math.cos(a1)
            const y1 = cy + r * Math.sin(a1)
            const x2 = cx + r * Math.cos(a2)
            const y2 = cy + r * Math.sin(a2)
            return (
              <path
                key={i}
                d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`}
                fill={colors[i]}
              />
            )
          })}
          <circle cx="12" cy="12" r="1.8" fill="#FFFFFF" />
        </svg>
      </Glyph>
    </>
  )
}

// News — white with red header and headline lines
function NewsIcon({ size }: { size: number }) {
  const s = size * 0.78
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #FFFFFF 0%, #F0F0F2 100%)" />
      <Highlight opacity={0.40} stop={35} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))' }}>
          {/* Red top header */}
          <rect x="2" y="3" width="20" height="5" fill="#FC2C38" />
          <text x="12" y="7" textAnchor="middle" fontSize="3.2" fontWeight="900" fill="#FFFFFF" fontFamily="Georgia, serif" letterSpacing="0.2">EKVAAR</text>
          {/* Headlines */}
          <rect x="3" y="10" width="18" height="1.3" rx="0.4" fill="#1C1C1E" />
          <rect x="3" y="12.5" width="14" height="1" rx="0.4" fill="#86868B" />
          <rect x="3" y="14.5" width="16" height="1" rx="0.4" fill="#86868B" />
          <rect x="3" y="16.5" width="12" height="1" rx="0.4" fill="#86868B" />
          <rect x="3" y="18.5" width="14" height="1" rx="0.4" fill="#86868B" />
        </svg>
      </Glyph>
    </>
  )
}

// Shield (Brand Guardian) — tan with white shield + checkmark
function ShieldIcon({ size }: { size: number }) {
  const s = size * 0.62
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #C9A87C 0%, #8B7355 100%)" />
      <Highlight opacity={0.22} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          <path d="M12 2L4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" fill="#FFFFFF" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="#8B7355" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Glyph>
    </>
  )
}

// Safari — blue with compass
function SafariIcon({ size }: { size: number }) {
  const s = size * 0.86
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #2A9FF5 0%, #1573D6 100%)" />
      <Highlight opacity={0.18} stop={40} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}>
          <circle cx="12" cy="12" r="10" fill="#F5F5F7" />
          <circle cx="12" cy="12" r="9.2" fill="none" stroke="#C9C9CE" strokeWidth="0.4" />
          {/* Tick marks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i * 6) * Math.PI / 180
            const isMajor = i % 5 === 0
            const r1 = isMajor ? 8.6 : 9.1
            const r2 = 9.6
            const x1 = 12 + r1 * Math.cos(a)
            const y1 = 12 + r1 * Math.sin(a)
            const x2 = 12 + r2 * Math.cos(a)
            const y2 = 12 + r2 * Math.sin(a)
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isMajor ? '#3A3A3E' : '#86868B'}
                strokeWidth={isMajor ? 0.5 : 0.25}
              />
            )
          })}
          {/* Needle — red/white */}
          <path d="M12 12L17 7L12 12Z" fill="#FF3B30" />
          <path d="M12 12L7 17L12 12Z" fill="#FFFFFF" stroke="#86868B" strokeWidth="0.2" />
          <circle cx="12" cy="12" r="0.9" fill="#3A3A3E" />
        </svg>
      </Glyph>
    </>
  )
}

// Books — orange with open book
function BooksIcon({ size }: { size: number }) {
  const s = size * 0.62
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #F5A623 0%, #E07B00 100%)" />
      <Highlight opacity={0.25} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* Book cover */}
          <path d="M4 4h13a2 2 0 012 2v14a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" fill="#FFFFFF" />
          {/* Spine */}
          <rect x="4" y="4" width="2" height="16" fill="#E07B00" />
          {/* Pages */}
          <rect x="6" y="6" width="11" height="12" fill="#F5F1EA" />
          {/* Text lines */}
          <rect x="8" y="9" width="7" height="0.8" rx="0.4" fill="#C9C9CE" />
          <rect x="8" y="11" width="7" height="0.8" rx="0.4" fill="#C9C9CE" />
          <rect x="8" y="13" width="5" height="0.8" rx="0.4" fill="#C9C9CE" />
        </svg>
      </Glyph>
    </>
  )
}

function GenericIcon({ size }: { size: number }) {
  const s = size * 0.5
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #8E8E93 0%, #48484A 100%)" />
      <Highlight opacity={0.22} stop={45} />
      <Glyph size={size}>
        <div style={{ width: s, height: s, background: '#FFFFFF', borderRadius: s * 0.2, opacity: 0.9 }} />
      </Glyph>
    </>
  )
}
