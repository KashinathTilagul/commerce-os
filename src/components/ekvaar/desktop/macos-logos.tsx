'use client'

import React from 'react'

/**
 * macOS-authentic app logos rendered as SVG.
 * Each logo mimics the real macOS app icon aesthetic:
 * - Rounded-square squircle background with subtle gradient
 * - Glass highlight overlay on top
 * - Drop shadow
 *
 * Palette is intentionally kept brand-aligned (EKVAAR six-color system)
 * where it makes sense, but the iconography matches macOS apps.
 */

export type MacOSLogoId =
  | 'finder'
  | 'mail'
  | 'slack'
  | 'github'
  | 'terminal'
  | 'notes'
  | 'settings'
  | 'appstore'
  | 'messages'
  | 'calendar'
  | 'photos'
  | 'music'
  | 'safari'
  | 'xcode'
  | 'monitor'
  | 'reminders'
  | 'numbers'
  | 'keynote'
  | 'pages'
  | 'podcasts'
  | 'stocks'
  | 'weather'

interface LogoProps {
  size?: number
  className?: string
}

/** Base squircle container with gradient + glass highlight */
function Squircle({
  size = 56,
  background,
  children,
}: {
  size?: number
  background: string | React.CSSProperties['background']
  children?: React.ReactNode
}) {
  return (
    <div
      className="relative rounded-[22%] overflow-hidden flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background,
        boxShadow:
          '0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.12)',
      }}
    >
      {/* Glass highlight */}
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.05) 40%, transparent 50%)',
        }}
      />
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        {children}
      </div>
    </div>
  )
}

// ============ FINDER ============
// Blue gradient squircle with the smiling Mac face
export function FinderLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #2D9CFF 0%, #1A6DD9 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78}>
          {/* Half-light half-dark face */}
          <defs>
            <linearGradient id="finderL" x1="0" y1="0" x2="1" y2="0">
              <stop offset="50%" stopColor="#F5F1EA" />
              <stop offset="50%" stopColor="#1F2937" />
            </linearGradient>
          </defs>
          <path
            d="M32 8 L52 8 Q56 8 56 12 L56 44 Q56 56 44 56 L32 56 Z"
            fill="#F5F1EA"
          />
          <path
            d="M32 8 L52 8 Q56 8 56 12 L56 44 Q56 56 44 56 L32 56 Z"
            fill="#1F2937"
            opacity="0.92"
            transform="translate(-20,0) scale(-1,1) translate(-44,0)"
          />
          {/* Left eye */}
          <ellipse cx="24" cy="26" rx="2.2" ry="4" fill="#1F2937" />
          {/* Right eye (blue) */}
          <ellipse cx="40" cy="26" rx="2.2" ry="4" fill="#2D9CFF" />
          {/* Smile */}
          <path
            d="M22 40 Q32 50 42 40"
            stroke="#1F2937"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ MAIL ============
// Blue gradient with white envelope
export function MailLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #3EA0FF 0%, #1A6DD9 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.7} height={size * 0.7}>
          <rect x="8" y="16" width="48" height="32" rx="4" fill="#F5F1EA" />
          <path
            d="M8 20 L32 38 L56 20"
            stroke="#1A6DD9"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ SLACK ============
// Multi-color rounded pinwheels
export function SlackLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #FFFFFF 0%, #F0EDE5 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          {/* Red */}
          <rect x="26" y="6" width="12" height="20" rx="6" fill="#E01E5A" />
          {/* Yellow */}
          <rect x="38" y="14" width="20" height="12" rx="6" fill="#ECB22E" transform="rotate(90 48 20)" />
          {/* Green */}
          <rect x="26" y="38" width="12" height="20" rx="6" fill="#2EB67D" />
          {/* Blue */}
          <rect x="6" y="38" width="20" height="12" rx="6" fill="#36C5F0" transform="rotate(90 16 44)" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ GITHUB ============
// Dark with white Octocat silhouette
export function GithubLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #2D2D2D 0%, #0F0F0F 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72} fill="#F5F1EA">
          <path d="M32 8 C18 8 8 18 8 32 C8 43 15 53 25 56 C26 56 27 56 27 55 L27 51 C20 52 18 48 18 48 C17 45 15 44 15 44 C12 42 15 42 15 42 C18 42 20 45 20 45 C23 50 27 48 29 47 C29 45 30 44 31 43 C25 42 19 40 19 30 C19 27 20 25 20 25 C20 25 18 22 20 19 C20 19 22 19 25 21 C27 20 29 20 32 20 C35 20 37 20 39 21 C42 19 44 19 44 19 C46 22 44 25 44 25 C44 25 45 27 45 30 C45 40 39 42 33 43 C34 44 35 45 35 47 L35 55 C35 56 36 56 37 56 C47 53 54 43 54 32 C54 18 44 8 32 8 Z" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ TERMINAL ============
// Black with monospace >_ prompt
export function TerminalLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #2A2A2A 0%, #0A0A0A 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78}>
          {/* Window chrome */}
          <rect x="8" y="14" width="48" height="36" rx="4" fill="#1A1A1A" stroke="#3A3A3A" strokeWidth="1" />
          {/* Title bar dots */}
          <circle cx="14" cy="20" r="1.5" fill="#FF5F57" />
          <circle cx="19" cy="20" r="1.5" fill="#FEBC2E" />
          <circle cx="24" cy="20" r="1.5" fill="#28C840" />
          {/* Prompt */}
          <text
            x="12"
            y="38"
            fontFamily="ui-monospace, SF Mono, monospace"
            fontSize="9"
            fontWeight="bold"
            fill="#D4859B"
          >
            {'>'}
          </text>
          <text
            x="20"
            y="38"
            fontFamily="ui-monospace, SF Mono, monospace"
            fontSize="9"
            fontWeight="bold"
            fill="#F5F1EA"
          >
            _
          </text>
        </svg>
      </Squircle>
    </div>
  )
}

// ============ NOTES ============
// Yellow notepad with lines
export function NotesLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #FFF6A8 0%, #F5E042 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          <rect x="12" y="8" width="40" height="48" rx="3" fill="#FFFFFF" />
          {/* Top yellow band */}
          <rect x="12" y="8" width="40" height="12" fill="#F5E042" />
          {/* Lines */}
          <line x1="18" y1="28" x2="46" y2="28" stroke="#D4CFC0" strokeWidth="1.2" />
          <line x1="18" y1="34" x2="46" y2="34" stroke="#D4CFC0" strokeWidth="1.2" />
          <line x1="18" y1="40" x2="46" y2="40" stroke="#D4CFC0" strokeWidth="1.2" />
          <line x1="18" y1="46" x2="38" y2="46" stroke="#D4CFC0" strokeWidth="1.2" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ SETTINGS / SYSTEM PREFERENCES ============
// Gray with gears
export function SettingsLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #8A8A8E 0%, #4A4A50 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          <defs>
            <linearGradient id="gearGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5F1EA" />
              <stop offset="100%" stopColor="#C8C2B5" />
            </linearGradient>
          </defs>
          {/* Large gear */}
          <g transform="translate(32 32)">
            <g fill="url(#gearGrad)">
              {Array.from({ length: 8 }).map((_, i) => (
                <rect
                  key={i}
                  x="-3"
                  y="-22"
                  width="6"
                  height="10"
                  rx="1"
                  transform={`rotate(${i * 45})`}
                />
              ))}
              <circle cx="0" cy="0" r="14" />
            </g>
            <circle cx="0" cy="0" r="6" fill="#4A4A50" />
          </g>
        </svg>
      </Squircle>
    </div>
  )
}

// ============ APP STORE ============
// Blue with pencil + ruler + brush crossed
export function AppStoreLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #3EA0FF 0%, #1A6DD9 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          {/* Pencil */}
          <g transform="rotate(45 32 32)">
            <rect x="10" y="29" width="34" height="6" fill="#F5F1EA" />
            <polygon points="44,29 52,32 44,35" fill="#F5F1EA" />
            <rect x="10" y="29" width="6" height="6" fill="#FEBC2E" />
          </g>
          {/* Brush */}
          <g transform="rotate(-45 32 32)">
            <rect x="20" y="29" width="24" height="6" fill="#F5F1EA" />
            <rect x="44" y="28" width="8" height="8" fill="#C8302A" />
          </g>
        </svg>
      </Squircle>
    </div>
  )
}

// ============ MESSAGES ============
// Green with white speech bubble
export function MessagesLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #5BFA7E 0%, #1DB954 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          <path
            d="M32 12 C18 12 8 21 8 32 C8 38 11 43 16 47 L14 56 L24 51 C27 52 30 52 32 52 C46 52 56 43 56 32 C56 21 46 12 32 12 Z"
            fill="#FFFFFF"
          />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ CALENDAR ============
// White with red header showing day 17
export function CalendarLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #FFFFFF 0%, #F0EDE5 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          <rect x="10" y="10" width="44" height="44" rx="4" fill="#FFFFFF" stroke="#D4CFC0" strokeWidth="1" />
          <rect x="10" y="10" width="44" height="14" rx="4" fill="#FF3B30" />
          <text
            x="32"
            y="44"
            textAnchor="middle"
            fontFamily="-apple-system, SF Pro Display, sans-serif"
            fontSize="22"
            fontWeight="700"
            fill="#1F2937"
          >
            17
          </text>
        </svg>
      </Squircle>
    </div>
  )
}

// ============ PHOTOS ============
// White with rainbow flower pinwheel
export function PhotosLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #FFFFFF 0%, #F0EDE5 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78}>
          {/* 8 petals */}
          <g transform="translate(32 32)">
            {[
              '#FF3B30',
              '#FF9500',
              '#FFCC00',
              '#34C759',
              '#5AC8FA',
              '#007AFF',
              '#5856D6',
              '#AF52DE',
            ].map((c, i) => (
              <ellipse
                key={i}
                cx="0"
                cy="-14"
                rx="6"
                ry="12"
                fill={c}
                transform={`rotate(${i * 45})`}
                opacity="0.92"
              />
            ))}
          </g>
        </svg>
      </Squircle>
    </div>
  )
}

// ============ MUSIC ============
// Red gradient with white music note
export function MusicLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #FB5C74 0%, #E8364F 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72} fill="#FFFFFF">
          {/* Note stem */}
          <rect x="38" y="14" width="4" height="28" />
          {/* Note heads */}
          <ellipse cx="32" cy="42" rx="8" ry="6" />
          <ellipse cx="42" cy="38" rx="8" ry="6" />
          {/* Connect tops */}
          <rect x="38" y="14" width="14" height="3" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ SAFARI ============
// Blue with red/white compass needle
export function SafariLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #2DA8FF 0%, #007AFF 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78}>
          {/* Outer ring */}
          <circle cx="32" cy="32" r="22" fill="none" stroke="#F5F1EA" strokeWidth="2" />
          {/* Tick marks */}
          {Array.from({ length: 60 }).map((_, i) => (
            <line
              key={i}
              x1="32"
              y1="10"
              x2="32"
              y2={i % 5 === 0 ? 13 : 12}
              stroke="#F5F1EA"
              strokeWidth={i % 5 === 0 ? 1 : 0.5}
              transform={`rotate(${i * 6} 32 32)`}
              opacity="0.7"
            />
          ))}
          {/* Compass needle - red (NW) */}
          <polygon points="32,32 22,22 32,16" fill="#FF3B30" />
          {/* White (SE) */}
          <polygon points="32,32 42,42 32,48" fill="#F5F1EA" />
          <circle cx="32" cy="32" r="2" fill="#1F2937" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ XCODE ============
// Blue with hammer + blueprint
export function XcodeLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #2DA8FF 0%, #1575D5 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72} fill="#FFFFFF">
          {/* Hammer */}
          <g transform="rotate(-45 32 32)">
            <rect x="28" y="12" width="8" height="30" rx="1" fill="#F5F1EA" />
            <rect x="22" y="10" width="20" height="8" rx="2" fill="#F5F1EA" />
            <rect x="28" y="42" width="8" height="8" rx="1" fill="#C8302A" />
          </g>
        </svg>
      </Squircle>
    </div>
  )
}

// ============ ACTIVITY MONITOR ============
// Dark with heart-rate / graph
export function MonitorLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #2A2A2A 0%, #0A0A0A 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78}">
          <polyline
            points="8,38 16,38 20,38 24,20 28,52 32,38 36,38 40,30 44,46 48,38 56,38"
            fill="none"
            stroke="#28C840"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ REMINDERS ============
// White with colored circles + checkmark
export function RemindersLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #FFFFFF 0%, #F0EDE5 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          {/* Circles */}
          <circle cx="18" cy="22" r="4" fill="none" stroke="#FF9500" strokeWidth="2" />
          <circle cx="18" cy="34" r="4" fill="#FF3B30" />
          <circle cx="18" cy="46" r="4" fill="none" stroke="#34C759" strokeWidth="2" />
          {/* Check */}
          <polyline
            points="15,46 17,48 21,44"
            stroke="#34C759"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Lines */}
          <line x1="26" y1="22" x2="52" y2="22" stroke="#D4CFC0" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="34" x2="52" y2="34" stroke="#D4CFC0" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="46" x2="44" y2="46" stroke="#D4CFC0" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ NUMBERS ============
// Green with bar chart
export function NumbersLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #6BFA8E 0%, #1DB954 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          <rect x="14" y="36" width="8" height="16" fill="#FFFFFF" />
          <rect x="28" y="26" width="8" height="26" fill="#FFFFFF" />
          <rect x="42" y="16" width="8" height="36" fill="#FFFFFF" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ KEYNOTE ============
// Blue with presentation slide + chart
export function KeynoteLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #3EA0FF 0%, #1A6DD9 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          {/* Stand */}
          <line x1="32" y1="48" x2="32" y2="54" stroke="#F5F1EA" strokeWidth="2" strokeLinecap="round" />
          <line x1="22" y1="54" x2="42" y2="54" stroke="#F5F1EA" strokeWidth="2" strokeLinecap="round" />
          {/* Slide */}
          <rect x="12" y="12" width="40" height="32" rx="2" fill="#FFFFFF" />
          {/* Pie chart */}
          <circle cx="32" cy="28" r="9" fill="#1A6DD9" />
          <path d="M32 28 L32 19 A9 9 0 0 1 41 28 Z" fill="#FF9500" />
          <path d="M32 28 L41 28 A9 9 0 0 1 32 37 Z" fill="#FF3B30" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ PAGES ============
// Orange with pen + page
export function PagesLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #FF9D2E 0%, #FF7B00 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72}>
          {/* Page */}
          <rect x="14" y="12" width="28" height="40" rx="2" fill="#FFFFFF" />
          <line x1="20" y1="22" x2="36" y2="22" stroke="#D4CFC0" strokeWidth="1.5" />
          <line x1="20" y1="28" x2="36" y2="28" stroke="#D4CFC0" strokeWidth="1.5" />
          <line x1="20" y1="34" x2="32" y2="34" stroke="#D4CFC0" strokeWidth="1.5" />
          {/* Pen */}
          <g transform="rotate(45 44 38)">
            <rect x="40" y="18" width="6" height="28" fill="#FF7B00" />
            <polygon points="40,46 43,52 46,46" fill="#1F2937" />
            <rect x="40" y="18" width="6" height="4" fill="#1F2937" />
          </g>
        </svg>
      </Squircle>
    </div>
  )
}

// ============ PODCASTS ============
// Purple with microphone
export function PodcastsLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #C285F5 0%, #9B4DCA 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72} fill="#FFFFFF">
          {/* Mic body */}
          <rect x="26" y="14" width="12" height="22" rx="6" />
          {/* Stand */}
          <rect x="30" y="36" width="4" height="8" />
          <line x1="22" y1="44" x2="42" y2="44" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          {/* Arc */}
          <path d="M18 28 Q18 18 32 18" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M46 28 Q46 18 32 18" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ STOCKS ============
// Dark with chart line
export function StocksLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #2A2A2A 0%, #0A0A0A 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78}>
          <polyline
            points="8,44 18,32 26,38 34,22 44,28 56,12"
            fill="none"
            stroke="#28C840"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Fill area */}
          <polygon
            points="8,44 18,32 26,38 34,22 44,28 56,12 56,56 8,56"
            fill="#28C840"
            opacity="0.15"
          />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ WEATHER ============
// Blue with sun + cloud
export function WeatherLogo({ size = 56, className = '' }: LogoProps) {
  return (
    <div className={className}>
      <Squircle
        size={size}
        background="linear-gradient(180deg, #3EA0FF 0%, #1A6DD9 100%)"
      >
        <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78}>
          {/* Sun */}
          <circle cx="40" cy="22" r="8" fill="#FFCC00" />
          {/* Sun rays */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1="40"
              y1="8"
              x2="40"
              y2="11"
              stroke="#FFCC00"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${i * 45} 40 22)`}
            />
          ))}
          {/* Cloud */}
          <ellipse cx="26" cy="40" rx="12" ry="8" fill="#F5F1EA" />
          <ellipse cx="34" cy="38" rx="10" ry="8" fill="#F5F1EA" />
          <ellipse cx="40" cy="42" rx="9" ry="6" fill="#F5F1EA" />
          <rect x="14" y="40" width="32" height="6" rx="3" fill="#F5F1EA" />
        </svg>
      </Squircle>
    </div>
  )
}

// ============ DISPATCHER ============
const LOGOS: Record<MacOSLogoId, React.FC<LogoProps>> = {
  finder: FinderLogo,
  mail: MailLogo,
  slack: SlackLogo,
  github: GithubLogo,
  terminal: TerminalLogo,
  notes: NotesLogo,
  settings: SettingsLogo,
  appstore: AppStoreLogo,
  messages: MessagesLogo,
  calendar: CalendarLogo,
  photos: PhotosLogo,
  music: MusicLogo,
  safari: SafariLogo,
  xcode: XcodeLogo,
  monitor: MonitorLogo,
  reminders: RemindersLogo,
  numbers: NumbersLogo,
  keynote: KeynoteLogo,
  pages: PagesLogo,
  podcasts: PodcastsLogo,
  stocks: StocksLogo,
  weather: WeatherLogo,
}

export function MacOSLogo({
  id,
  size = 56,
  className = '',
}: {
  id: MacOSLogoId
  size?: number
  className?: string
}) {
  const Component = LOGOS[id] || FinderLogo
  return <Component size={size} className={className} />
}
