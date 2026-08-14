'use client'

import { Smartphone, Laptop, Speaker, Monitor } from 'lucide-react'

export interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string }[]
  }
  uri: string
  duration_ms: number
}

export interface SpotifyDevice {
  id: string
  name: string
  type: string
  is_active: boolean
  volume_percent: number
}

export interface SdkState {
  status: string
  deviceId: string | null
  ready: boolean
  isPlaying: boolean
  track: SpotifyTrack | null
}

export function getDeviceIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'smartphone':
      return <Smartphone className="h-4 w-4" />
    case 'computer':
      return <Laptop className="h-4 w-4" />
    case 'speaker':
      return <Speaker className="h-4 w-4" />
    default:
      return <Monitor className="h-4 w-4" />
  }
}

export function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
