'use client'

import { useMusicStore } from '@/lib/music-store'
import { useEffect, useRef } from 'react'

export function GlobalMusicPlayer() {
  const { tracks, currentIdx, playing, volume } = useMusicStore()
  const current = tracks[currentIdx]
  const playerRef = useRef<HTMLIFrameElement>(null)
  const lastVideoId = useRef<string | null>(null)

  useEffect(() => {
    if (!current || !playerRef.current) return
    
    if (lastVideoId.current !== current.videoId) {
      playerRef.current.src = `https://www.youtube.com/embed/${current.videoId}?autoplay=${playing ? 1 : 0}&controls=0&modestbranding=1`
      lastVideoId.current = current.videoId
    }
  }, [current?.videoId])

  useEffect(() => {
    if (!playerRef.current || !lastVideoId.current) return
    playerRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: playing ? 'playVideo' : 'pauseVideo' }),
      '*'
    )
  }, [playing])

  if (!current) return null

  return (
    <iframe
      ref={playerRef}
      src={`https://www.youtube.com/embed/${current.videoId}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1`}
      className="hidden"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    />
  )
}
