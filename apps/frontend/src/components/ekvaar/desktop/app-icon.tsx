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
  const r = size * 0.27 // macOS squircle — 27% CSS border-radius approximates the superellipse
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
    case 'launchpad':     return <LaunchpadIcon size={size} />
    case 'board-room':    return <BoardRoomIcon size={size} />
    case 'inbox':         return <MailIcon size={size} />
    case 'agents':        return <ContactsIcon size={size} />
    case 'issues':        return <RemindersIcon size={size} />
    case 'terminal':      return <TerminalIcon size={size} />
    case 'settings':      return <SettingsIcon size={size} />
    case 'files':         return <FinderIcon size={size} />
    case 'browser':       return <BrowserIcon size={size} />
    case 'integrations':  return <IntegrationsIcon size={size} />
    case 'calculator':    return <CalculatorIcon size={size} />
    case 'notes':         return <NotesIcon size={size} />
    case 'calendar':      return <CalendarIcon size={size} />
    case 'music':         return <MusicIcon size={size} />
    case 'house':         return <BoxesIcon size={size} />
    case 'sales':         return <SalesIcon size={size} />
    case 'finance':       return <WalletIcon size={size} />
    case 'inventory':     return <InventoryIcon size={size} />
    case 'community':     return <CommunityIcon size={size} />
    case 'campaigns':     return <NewsIcon size={size} />
    case 'guardian':      return <ShieldIcon size={size} />
    case 'ai':            return <CpuIcon size={size} />
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

// ============ NEW OS APP ICONS ============

// Launchpad — gray gradient with grid of colorful squares (macOS Launchpad)
function LaunchpadIcon({ size }: { size: number }) {
  const s = size * 0.62
  const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#007AFF', '#AF52DE', '#FF2D55', '#34C759']
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #8E8E93 0%, #48484A 100%)" />
      <Highlight opacity={0.22} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* 3x3 grid of rounded squares */}
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => {
              const idx = row * 3 + col
              const x = 4 + col * 6
              const y = 4 + row * 6
              return (
                <rect
                  key={`${row}-${col}`}
                  x={x}
                  y={y}
                  width="4"
                  height="4"
                  rx="1"
                  fill={colors[idx]}
                />
              )
            })
          )}
        </svg>
      </Glyph>
    </>
  )
}

// Settings — gear sliders on gray (same as board-room but with sliders)
function SettingsIcon({ size }: { size: number }) {
  const s = size * 0.58
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #8E8E93 0%, #48484A 100%)" />
      <Highlight opacity={0.22} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))' }}>
          {/* Three horizontal sliders with knobs */}
          <line x1="3" y1="7" x2="21" y2="7" stroke="#F5F5F7" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="9" cy="7" r="2.5" fill="#F5F5F7" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="#F5F5F7" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="15" cy="12" r="2.5" fill="#F5F5F7" />
          <line x1="3" y1="17" x2="21" y2="17" stroke="#F5F5F7" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="11" cy="17" r="2.5" fill="#F5F5F7" />
        </svg>
      </Glyph>
    </>
  )
}

// Files / Finder — blue folder with face (macOS Finder style)
function FinderIcon({ size }: { size: number }) {
  const s = size * 0.62
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #4FB0F5 0%, #1573D6 100%)" />
      <Highlight opacity={0.28} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* Folder body */}
          <path d="M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" fill="#FFFFFF" />
          {/* Face — two eyes + smile (Finder style) */}
          <circle cx="9.5" cy="11" r="0.8" fill="#1573D6" />
          <circle cx="14.5" cy="11" r="0.8" fill="#1573D6" />
          <path d="M9 14c1 1.2 2 1.8 3 1.8s2-0.6 3-1.8" stroke="#1573D6" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      </Glyph>
    </>
  )
}

// Calculator — dark with orange equals (macOS Calculator)
// Integrations — purple gradient with plug icon
function IntegrationsIcon({ size }: { size: number }) {
  const s = size * 0.55
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #5856D6 0%, #3634A3 100%)" />
      <Highlight opacity={0.25} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          <rect x="7" y="2" width="3" height="6" rx="1.5" fill="#FFFFFF" />
          <rect x="14" y="2" width="3" height="6" rx="1.5" fill="#FFFFFF" />
          <path d="M6 8h12v4a6 6 0 01-12 0V8z" fill="#FFFFFF" />
          <path d="M12 18v3" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Glyph>
    </>
  )
}

function CalculatorIcon({ size }: { size: number }) {
  const s = size * 0.58
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #3A3A3C 0%, #1C1C1E 100%)" />
      <Highlight opacity={0.18} stop={40} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* Display */}
          <rect x="4" y="3" width="16" height="4" rx="1" fill="#1C1C1E" stroke="#48484A" strokeWidth="0.3" />
          {/* Buttons grid */}
          <circle cx="7" cy="11" r="1.6" fill="#48484A" />
          <circle cx="12" cy="11" r="1.6" fill="#48484A" />
          <circle cx="17" cy="11" r="1.6" fill="#48484A" />
          <circle cx="7" cy="15.5" r="1.6" fill="#48484A" />
          <circle cx="12" cy="15.5" r="1.6" fill="#48484A" />
          <circle cx="17" cy="15.5" r="1.6" fill="#48484A" />
          <circle cx="7" cy="20" r="1.6" fill="#48484A" />
          {/* Equals button — orange */}
          <rect x="14.5" y="18.5" width="5" height="3" rx="1.5" fill="#FF9500" />
        </svg>
      </Glyph>
    </>
  )
}

// Notes — yellow top bar with lines (macOS Notes)
function NotesIcon({ size }: { size: number }) {
  const s = size * 0.72
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #FFFFFF 0%, #F0F0F2 100%)" />
      <Highlight opacity={0.40} stop={35} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))' }}>
          {/* Yellow top bar */}
          <rect x="2" y="2" width="20" height="5" fill="#FFCC00" />
          {/* Body */}
          <rect x="2" y="7" width="20" height="15" fill="#FFF9E0" />
          {/* Lines */}
          <rect x="5" y="10" width="14" height="0.8" rx="0.4" fill="#D4B740" />
          <rect x="5" y="12.5" width="14" height="0.8" rx="0.4" fill="#D4B740" />
          <rect x="5" y="15" width="14" height="0.8" rx="0.4" fill="#D4B740" />
          <rect x="5" y="17.5" width="10" height="0.8" rx="0.4" fill="#D4B740" />
        </svg>
      </Glyph>
    </>
  )
}

// Calendar — white with red header + date number (macOS Calendar)
function CalendarIcon({ size }: { size: number }) {
  const s = size * 0.72
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #FFFFFF 0%, #F0F0F2 100%)" />
      <Highlight opacity={0.40} stop={35} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))' }}>
          {/* Red top header */}
          <rect x="2" y="2" width="20" height="5" fill="#FF3B30" />
          <text x="12" y="5.8" textAnchor="middle" fontSize="2.8" fontWeight="700" fill="#FFFFFF" fontFamily="-apple-system, sans-serif">JULY</text>
          {/* Big date number */}
          <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="300" fill="#1C1C1E" fontFamily="-apple-system, sans-serif">18</text>
        </svg>
      </Glyph>
    </>
  )
}

// Music — Spotify themed dark gradient with green Spotify waves
function MusicIcon({ size }: { size: number }) {
  const s = size * 0.58
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #222222 0%, #121212 100%)" />
      <Highlight opacity={0.15} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.50))' }}>
          <path fill="#1DB954" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.894-.982-.336.076-.67-.135-.746-.472-.076-.336.135-.67.472-.746 3.854-.88 7.15-.502 9.82 1.136.295.18.387.565.208.857zm1.22-2.72c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.082-1.182-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.676-1.115 8.243-.57 11.348 1.343.367.226.487.707.26 1.074zm.106-2.834C14.692 8.98 9.3 8.8 6.13 9.762c-.488.148-.996-.13-1.144-.61-.148-.487.13-.996.61-1.144 3.637-1.103 9.58-.893 13.435 1.397.44.262.585.826.324 1.266-.26.44-.825.585-1.265.324z" />
        </svg>
      </Glyph>
    </>
  )
}

// Cpu (for AI Infrastructure) — dark with chip
function CpuIcon({ size }: { size: number }) {
  const s = size * 0.58
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #4A6B8F 0%, #1F3A5F 100%)" />
      <Highlight opacity={0.22} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* Chip body */}
          <rect x="6" y="6" width="12" height="12" rx="2" fill="#F5F1EA" />
          {/* Inner square */}
          <rect x="9" y="9" width="6" height="6" rx="0.5" fill="#1F3A5F" />
          {/* Pins — top */}
          <rect x="9" y="3" width="1" height="3" fill="#F5F1EA" />
          <rect x="12" y="3" width="1" height="3" fill="#F5F1EA" />
          <rect x="15" y="3" width="1" height="3" fill="#F5F1EA" />
          {/* Pins — bottom */}
          <rect x="9" y="18" width="1" height="3" fill="#F5F1EA" />
          <rect x="12" y="18" width="1" height="3" fill="#F5F1EA" />
          <rect x="15" y="18" width="1" height="3" fill="#F5F1EA" />
          {/* Pins — left */}
          <rect x="3" y="9" width="3" height="1" fill="#F5F1EA" />
          <rect x="3" y="12" width="3" height="1" fill="#F5F1EA" />
          <rect x="3" y="15" width="3" height="1" fill="#F5F1EA" />
          {/* Pins — right */}
          <rect x="18" y="9" width="3" height="1" fill="#F5F1EA" />
          <rect x="18" y="12" width="3" height="1" fill="#F5F1EA" />
          <rect x="18" y="15" width="3" height="1" fill="#F5F1EA" />
        </svg>
      </Glyph>
    </>
  )
}

// Browser — blue globe with latitude/longitude lines
function BrowserIcon({ size }: { size: number }) {
  const s = size * 0.86
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #3AABF5 0%, #1260D6 100%)" />
      <Highlight opacity={0.22} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}>
          {/* Globe circle */}
          <circle cx="12" cy="12" r="9.5" fill="#E8F4FF" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
          {/* Latitude lines */}
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="#1260D6" strokeWidth="0.55" opacity="0.35" />
          <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="#1260D6" strokeWidth="0.55" opacity="0.35" />
          <line x1="4" y1="7.5" x2="20" y2="7.5" stroke="#1260D6" strokeWidth="0.45" opacity="0.28" />
          <line x1="4" y1="16.5" x2="20" y2="16.5" stroke="#1260D6" strokeWidth="0.45" opacity="0.28" />
          {/* Longitude lines */}
          <ellipse cx="12" cy="12" rx="4.2" ry="9.5" fill="none" stroke="#1260D6" strokeWidth="0.55" opacity="0.35" />
          <line x1="12" y1="2.5" x2="12" y2="21.5" stroke="#1260D6" strokeWidth="0.55" opacity="0.35" />
          {/* Outer ring */}
          <circle cx="12" cy="12" r="9.5" fill="none" stroke="#1260D6" strokeWidth="0.6" opacity="0.5" />
        </svg>
      </Glyph>
    </>
  )
}

// Board Room — dark command-center dashboard with KPI tiles
function BoardRoomIcon({ size }: { size: number }) {
  const s = size * 0.72
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #1A2A1A 0%, #0A0A0A 50%, #2C1A1A 100%)" />
      <Highlight opacity={0.12} stop={35} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
          {/* Top KPI row */}
          <rect x="2" y="3" width="9" height="5" rx="1" fill="#2F4F3A" />
          <rect x="13" y="3" width="9" height="5" rx="1" fill="#C8302A" opacity="0.85" />
          {/* Trend line chart */}
          <rect x="2" y="10" width="20" height="7" rx="1" fill="#1F3A5F" opacity="0.9" />
          <polyline points="4,15 7,12 10,13.5 13,11 16,13 19,10.5" stroke="#F5F1EA" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Bottom bar */}
          <rect x="2" y="19" width="5" height="2.5" rx="0.5" fill="#2F4F3A" />
          <rect x="9" y="19" width="5" height="2.5" rx="0.5" fill="#C8302A" opacity="0.7" />
          <rect x="16" y="19" width="6" height="2.5" rx="0.5" fill="#1F3A5F" opacity="0.8" />
        </svg>
      </Glyph>
    </>
  )
}

// Sales & Orders — red gradient with shopping bag
function SalesIcon({ size }: { size: number }) {
  const s = size * 0.6
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #E84040 0%, #8B1E1A 100%)" />
      <Highlight opacity={0.25} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}>
          {/* Bag body */}
          <path d="M5 8h14l-1.5 12H6.5L5 8z" fill="#FFFFFF" />
          {/* Bag handle */}
          <path d="M9 8V6a3 3 0 016 0v2" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Price tag line */}
          <line x1="9" y1="14" x2="15" y2="14" stroke="#C8302A" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </Glyph>
    </>
  )
}

// Inventory & Ops — blue-green gradient with stacked package
function InventoryIcon({ size }: { size: number }) {
  const s = size * 0.64
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #2A5F6A 0%, #1F3A5F 100%)" />
      <Highlight opacity={0.22} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}>
          {/* Top package */}
          <rect x="6" y="3" width="12" height="7" rx="1.2" fill="#F5F1EA" />
          <line x1="12" y1="3" x2="12" y2="10" stroke="#1F3A5F" strokeWidth="1" opacity="0.4" />
          <rect x="9.5" y="5.5" width="5" height="1.2" rx="0.6" fill="#1F3A5F" opacity="0.25" />
          {/* Bottom-left package */}
          <rect x="2" y="13" width="9" height="8" rx="1.2" fill="#F5F1EA" opacity="0.88" />
          <line x1="6.5" y1="13" x2="6.5" y2="21" stroke="#1F3A5F" strokeWidth="1" opacity="0.35" />
          {/* Bottom-right package */}
          <rect x="13" y="13" width="9" height="8" rx="1.2" fill="#F5F1EA" opacity="0.75" />
          <line x1="17.5" y1="13" x2="17.5" y2="21" stroke="#1F3A5F" strokeWidth="1" opacity="0.3" />
        </svg>
      </Glyph>
    </>
  )
}

// Community / Originals — rose gradient with member silhouettes
function CommunityIcon({ size }: { size: number }) {
  const s = size * 0.66
  return (
    <>
      <Bg gradient="linear-gradient(180deg, #D4859B 0%, #8B5468 100%)" />
      <Highlight opacity={0.25} stop={45} />
      <Glyph size={size}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.30))' }}>
          {/* Left person */}
          <circle cx="6.5" cy="8" r="2.6" fill="#F5F1EA" opacity="0.82" />
          <path d="M1 21c0-3 2.5-5.5 5.5-5.5S12 18 12 21H1z" fill="#F5F1EA" opacity="0.82" />
          {/* Right person */}
          <circle cx="17.5" cy="8" r="2.6" fill="#F5F1EA" opacity="0.82" />
          <path d="M12 21c0-3 2.5-5.5 5.5-5.5S23 18 23 21H12z" fill="#F5F1EA" opacity="0.82" />
          {/* Center person (front) */}
          <circle cx="12" cy="7" r="3" fill="#FFFFFF" />
          <path d="M5.5 21c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5H5.5z" fill="#FFFFFF" />
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
