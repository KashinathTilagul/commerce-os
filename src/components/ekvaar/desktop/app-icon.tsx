'use client'

import { motion } from 'framer-motion'

interface AppIconProps {
  variant: string // macOS app icon variant key
  size?: number
  className?: string
}

// macOS Big Sur / Sonoma app icon replicas
// Each variant produces an authentic-looking macOS app icon
export function AppIcon({ variant, size = 56, className = '' }: AppIconProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Squircle size={size}>
        <IconVariant variant={variant} size={size} />
      </Squircle>
    </div>
  )
}

// macOS uses a "squircle" — a superellipse, not a rounded square
function Squircle({ size, children }: { size: number; children: React.ReactNode }) {
  // Use SVG path for true squircle (superellipse approx)
  const r = size * 0.223 // macOS corner radius ratio
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: r,
        boxShadow: `
          0 1px 2px rgba(0,0,0,0.15),
          0 4px 12px rgba(0,0,0,0.30),
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
    // === CORE OS APPS — match real macOS icons ===

    // Board Room → like macOS "System Settings" (gear sliders on gray gradient)
    case 'board-room':
      return <SystemSettingsIcon size={size} />

    // Founder Inbox → like macOS "Mail" (envelope in blue gradient)
    case 'inbox':
      return <MailIcon size={size} />

    // Digital Employees → like macOS "Contacts" (silhouettes on gray)
    case 'agents':
      return <ContactsIcon size={size} />

    // Issues → like macOS "Reminders" (checklist on white)
    case 'issues':
      return <RemindersIcon size={size} />

    // Terminal → authentic macOS Terminal (black with prompt)
    case 'terminal':
      return <TerminalIcon size={size} />

    // === BUSINESS APPS — macOS-style icons with brand colors ===

    // House of Originals → like macOS "Books" (boxes/spines on orange-tan)
    case 'house':
      return <BoxesIcon size={size} variant="house" />

    // Sales & Orders → like macOS "App Store" (shopping bag on blue)
    case 'sales':
      return <AppStoreIcon size={size} />

    // Finance → like macOS "Wallet" (cards stacked on dark)
    case 'finance':
      return <WalletIcon size={size} />

    // Inventory → like macOS "Find My" (box/cube on green)
    case 'inventory':
      return <FindMyIcon size={size} />

    // Originals (Community) → like macOS "Photos" (people/pinwheel on white)
    case 'community':
      return <PhotosIcon size={size} />

    // Campaigns → like macOS "News" (megaphone/headlines on red)
    case 'campaigns':
      return <NewsIcon size={size} />

    // Brand Guardian → like macOS "Find My" shield variant
    case 'guardian':
      return <ShieldIcon size={size} />

    // AI Infrastructure → like macOS "Safari" (compass on blue)
    case 'ai':
      return <SafariIcon size={size} />

    // Brand Book → like macOS "Books" (book on tan-orange)
    case 'brand-book':
      return <BooksIcon size={size} />

    default:
      return <GenericIcon size={size} />
  }
}

// ===== MACOS ICON REPLICAS =====

// System Settings — gear on light-to-dark gray gradient
function SystemSettingsIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #6E6E76 0%, #3A3A3E 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 50%)',
        }}
      />
      <GearGlyph size={size} color="#F5F5F7" />
    </div>
  )
}

// Mail — envelope on blue gradient
function MailIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #3E9EE8 0%, #1573D6 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 45%)',
        }}
      />
      <EnvelopeGlyph size={size} color="#FFFFFF" />
    </div>
  )
}

// Contacts — silhouettes on light gray
function ContactsIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #F2F2F4 0%, #C9C9CE 100%)',
        }}
      />
      <PeopleGlyph size={size} />
    </div>
  )
}

// Reminders — checklist on white
function RemindersIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #E8E8EA 100%)',
        }}
      />
      <ChecklistGlyph size={size} />
    </div>
  )
}

// Terminal — authentic black with prompt
function TerminalIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #2A2A2A 0%, #0A0A0A 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-1/4"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)',
        }}
      />
      <TerminalGlyph size={size} />
    </div>
  )
}

// App Store — shopping bag on blue
function AppStoreIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #2A9FF5 0%, #1573D6 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 45%)',
        }}
      />
      <BagGlyph size={size} color="#FFFFFF" />
    </div>
  )
}

// Wallet — stacked cards on dark
function WalletIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #3A3A3E 0%, #1C1C1E 100%)',
        }}
      />
      <WalletGlyph size={size} />
    </div>
  )
}

// Find My — box/cube on green
function FindMyIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #4CD964 0%, #2EB14E 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 45%)',
        }}
      />
      <CubeGlyph size={size} color="#FFFFFF" />
    </div>
  )
}

// Photos — pinwheel of color on white
function PhotosIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #E8E8EA 100%)',
        }}
      />
      <PinwheelGlyph size={size} />
    </div>
  )
}

// News — red top bar with headlines
function NewsIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F2 100%)',
        }}
      />
      <NewsGlyph size={size} />
    </div>
  )
}

// Shield — like Find My shield variant on tan-brown
function ShieldIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #C9A87C 0%, #8B7355 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, transparent 45%)',
        }}
      />
      <ShieldGlyph size={size} color="#FFFFFF" />
    </div>
  )
}

// Safari — compass on blue
function SafariIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #2A9FF5 0%, #1573D6 100%)',
        }}
      />
      <CompassGlyph size={size} />
    </div>
  )
}

// Books — book on tan-orange
function BooksIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #F5A623 0%, #E07B00 100%)',
        }}
      />
      <BookGlyph size={size} color="#FFFFFF" />
    </div>
  )
}

// Boxes (House of Originals) — custom stacked boxes on dark
function BoxesIcon({ size, variant: _variant }: { size: number; variant?: string }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #4A6B8F 0%, #1F3A5F 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, transparent 45%)',
        }}
      />
      <StackedBoxesGlyph size={size} color="#FFFFFF" />
    </div>
  )
}

function GenericIcon({ size }: { size: number }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #6E6E76 0%, #3A3A3E 100%)' }} />
      <div
        className="absolute"
        style={{
          width: size * 0.5,
          height: size * 0.5,
          background: '#FFFFFF',
          opacity: 0.9,
        }}
      />
    </div>
  )
}

// ===== GLYPHS (centered SVG icons, macOS style) =====

function GearGlyph({ size, color }: { size: number; color: string }) {
  const s = size * 0.52
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    >
      <path
        d="M12 8a4 4 0 100 8 4 4 0 000-8zm0 6a2 2 0 110-4 2 2 0 010 4z"
        fill={color}
      />
      <path
        d="M12 2l1.5 3L17 4l-.5 3.5L20 9l-2.5 2.5L20 14l-3.5 1L17 19l-3.5-1L12 22l-1.5-3L7 19l.5-3.5L4 14l2.5-2.5L4 9l3.5-1L7 4l3.5 1L12 2z"
        fill={color}
        opacity="0.95"
      />
      <circle cx="12" cy="12" r="3" fill={color} />
    </svg>
  )
}

function EnvelopeGlyph({ size, color }: { size: number; color: string }) {
  const s = size * 0.55
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    >
      <rect x="2" y="5" width="20" height="14" rx="2.5" fill={color} />
      <path d="M3 7l9 6 9-6" stroke="#1573D6" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PeopleGlyph({ size }: { size: number }) {
  const s = size * 0.55
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
    >
      {/* Back person */}
      <circle cx="9" cy="8" r="3.2" fill="#5B5B5F" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6v1H3v-1z" fill="#5B5B5F" />
      {/* Front person (lighter) */}
      <circle cx="15" cy="9" r="3.5" fill="#3A3A3E" />
      <path d="M9 20c0-3.6 2.9-6.5 6.5-6.5S22 16.4 22 20v1H9v-1z" fill="#3A3A3E" />
    </svg>
  )
}

function ChecklistGlyph({ size }: { size: number }) {
  const s = size * 0.55
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
    >
      {/* circles with checks */}
      <circle cx="5" cy="6" r="2.5" fill="#FF9500" />
      <path d="M3.8 6l1 1 1.4-1.6" stroke="#FFFFFF" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="5" width="11" height="2" rx="1" fill="#C9C9CE" />

      <circle cx="5" cy="12" r="2.5" fill="#FF9500" />
      <path d="M3.8 12l1 1 1.4-1.6" stroke="#FFFFFF" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="11" width="11" height="2" rx="1" fill="#C9C9CE" />

      <circle cx="5" cy="18" r="2.5" fill="#FF9500" />
      <path d="M3.8 18l1 1 1.4-1.6" stroke="#FFFFFF" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="17" width="11" height="2" rx="1" fill="#C9C9CE" />
    </svg>
  )
}

function TerminalGlyph({ size }: { size: number }) {
  const s = size * 0.65
  return (
    <div
      className="absolute flex flex-col justify-center"
      style={{ width: s, height: s * 0.7, padding: s * 0.08 }}
    >
      <div
        className="font-mono"
        style={{
          color: '#FFFFFF',
          fontSize: s * 0.28,
          lineHeight: 1.3,
          fontWeight: 600,
        }}
      >
        <div style={{ color: '#4CD964' }}>{'>'}_</div>
      </div>
    </div>
  )
}

function BagGlyph({ size, color }: { size: number; color: string }) {
  const s = size * 0.5
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    >
      {/* Bag handle */}
      <path
        d="M8 8V6a4 4 0 018 0v2"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Bag body — macOS uses "A" made of strokes */}
      <path
        d="M5 8h14l-1.5 12.5a1.5 1.5 0 01-1.5 1.3H8a1.5 1.5 0 01-1.5-1.3L5 8z"
        fill={color}
      />
      {/* Stylized A */}
      <path
        d="M9 14l3-4 3 4M10 13h4"
        stroke="#1573D6"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WalletGlyph({ size }: { size: number }) {
  const s = size * 0.6
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
    >
      {/* Back card */}
      <rect x="3" y="6" width="16" height="11" rx="2" fill="#FF9500" transform="rotate(-8 11 11.5)" />
      {/* Middle card */}
      <rect x="4" y="7" width="16" height="11" rx="2" fill="#5AC8FA" transform="rotate(-4 12 12.5)" />
      {/* Front card */}
      <rect x="5" y="8" width="16" height="11" rx="2" fill="#FFFFFF" />
      <circle cx="16" cy="13.5" r="1.5" fill="#FF3B30" />
    </svg>
  )
}

function CubeGlyph({ size, color }: { size: number; color: string }) {
  const s = size * 0.5
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    >
      {/* Isometric cube */}
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill={color} opacity="0.95" />
      <path d="M12 2L3 7l9 5 9-5-9-5z" fill={color} />
      <path d="M12 12v10l9-5V7l-9 5z" fill={color} opacity="0.85" />
      <path d="M3 7l9 5v10l-9-5V7z" fill={color} opacity="0.7" />
    </svg>
  )
}

function PinwheelGlyph({ size }: { size: number }) {
  const s = size * 0.6
  const cx = 12, cy = 12, r = 8
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
    >
      {/* 8 petals */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a1 = (i * 45 - 22.5) * Math.PI / 180
        const a2 = (i * 45 + 22.5) * Math.PI / 180
        const x1 = cx + r * Math.cos(a1)
        const y1 = cy + r * Math.sin(a1)
        const x2 = cx + r * Math.cos(a2)
        const y2 = cy + r * Math.sin(a2)
        const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#007AFF', '#AF52DE', '#FF2D55']
        return (
          <path
            key={i}
            d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`}
            fill={colors[i]}
          />
        )
      })}
      <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
    </svg>
  )
}

function NewsGlyph({ size }: { size: number }) {
  const s = size * 0.7
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
    >
      {/* Red top header */}
      <rect x="2" y="3" width="20" height="5" fill="#FC2C38" />
      <text x="12" y="7" textAnchor="middle" fontSize="3.5" fontWeight="900" fill="#FFFFFF" fontFamily="Georgia, serif">EKVAAR</text>
      {/* Headlines */}
      <rect x="3" y="10" width="18" height="1.2" fill="#1C1C1E" />
      <rect x="3" y="12.5" width="14" height="1" fill="#86868B" />
      <rect x="3" y="14.5" width="16" height="1" fill="#86868B" />
      <rect x="3" y="16.5" width="12" height="1" fill="#86868B" />
      <rect x="3" y="18.5" width="14" height="1" fill="#86868B" />
    </svg>
  )
}

function ShieldGlyph({ size, color }: { size: number; color: string }) {
  const s = size * 0.55
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    >
      <path
        d="M12 2L4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"
        fill={color}
      />
      <path
        d="M8.5 12.5l2.5 2.5 4.5-5"
        stroke="#8B7355"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CompassGlyph({ size }: { size: number }) {
  const s = size * 0.85
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}
    >
      <circle cx="12" cy="12" r="10" fill="#F5F5F7" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="#C9C9CE" strokeWidth="0.5" />
      {/* Tick marks */}
      {Array.from({ length: 32 }).map((_, i) => {
        const a = (i * 11.25) * Math.PI / 180
        const r1 = i % 4 === 0 ? 8.5 : 9
        const r2 = 9.5
        const x1 = 12 + r1 * Math.cos(a)
        const y1 = 12 + r1 * Math.sin(a)
        const x2 = 12 + r2 * Math.cos(a)
        const y2 = 12 + r2 * Math.sin(a)
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={i % 4 === 0 ? '#3A3A3E' : '#86868B'}
            strokeWidth={i % 4 === 0 ? 0.6 : 0.3}
          />
        )
      })}
      {/* Needle — red/white */}
      <path d="M12 12L18 6L12 12L6 18Z" fill="#FF3B30" />
      <path d="M12 12L6 18L12 12L18 6Z" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="1" fill="#3A3A3E" />
    </svg>
  )
}

function BookGlyph({ size, color }: { size: number; color: string }) {
  const s = size * 0.55
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    >
      {/* Book cover */}
      <path
        d="M4 4h13a2 2 0 012 2v14a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
        fill={color}
      />
      {/* Spine */}
      <rect x="4" y="4" width="2" height="16" fill="#E07B00" />
      {/* Pages */}
      <rect x="6" y="6" width="11" height="12" fill="#F5F1EA" />
      {/* Lines */}
      <rect x="8" y="9" width="7" height="0.8" fill="#C9C9CE" />
      <rect x="8" y="11" width="7" height="0.8" fill="#C9C9CE" />
      <rect x="8" y="13" width="5" height="0.8" fill="#C9C9CE" />
    </svg>
  )
}

function StackedBoxesGlyph({ size, color }: { size: number; color: string }) {
  const s = size * 0.55
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="absolute"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    >
      {/* Top box */}
      <rect x="8" y="3" width="8" height="6" rx="1" fill={color} opacity="0.9" />
      <rect x="11.5" y="3" width="1" height="6" fill="#1F3A5F" opacity="0.4" />
      {/* Bottom-left box */}
      <rect x="3" y="11" width="8" height="6" rx="1" fill={color} />
      <rect x="6.5" y="11" width="1" height="6" fill="#1F3A5F" opacity="0.4" />
      {/* Bottom-right box */}
      <rect x="13" y="11" width="8" height="6" rx="1" fill={color} opacity="0.95" />
      <rect x="16.5" y="11" width="1" height="6" fill="#1F3A5F" opacity="0.4" />
    </svg>
  )
}
