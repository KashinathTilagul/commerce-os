'use client'

import { useMusicStore } from '@/lib/music-store'
import { useEffect, useRef, useState } from 'react'

export function GlobalMusicPlayer() {
  const { tracks, currentIdx, playing, volume } = useMusicStore()
  const current = tracks[currentIdx]
  const playerRef = useRef<HTMLDivElement>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const ytPlayer = useRef<any>(null)

  useEffect(() => {
    if (!current || !playerRef.current) return

    playerRef.current.innerHTML = `<div id="yt-player"></div>`

    const loadYT = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        ytPlayer.current = new (window as any).YT.Player('yt-player', {
          videoId: current.videoId,
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: playing ? 1 : 0,
            controls: 1,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              setPlayerReady(true)
              if (playing) ytPlayer.current.playVideo()
            },
            onStateChange: (e: any) => {
              if (e.data === (window as any).YT.PlayerState.PLAYING) {
                useMusicStore.setState({ playing: true })
              } else if (e.data === (window as any).YT.PlayerState.PAUSED) {
                useMusicStore.setState({ playing: false })
              }
            }
          }
        })
      } else {
        setTimeout(loadYT, 100)
      }
    }

    if (!(window as any).YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
      ;(window as any).onYouTubeIframeAPIReady = loadYT
    } else {
      loadYT()
    }

    return () => {
      if (ytPlayer.current && ytPlayer.current.destroy) {
        ytPlayer.current.destroy()
      }
    }
  }, [current?.videoId])

  useEffect(() => {
    if (!ytPlayer.current || !playerReady) return
    if (playing) {
      ytPlayer.current.playVideo()
    } else {
      ytPlayer.current.pauseVideo()
    }
  }, [playing])

  useEffect(() => {
    if (!ytPlayer.current || !playerReady) return
    ytPlayer.current.setVolume(volume)
  }, [volume])

  if (!current) return null

  return (
    <div ref={playerRef} className="fixed bottom-20 right-4 w-80 h-48 z-[9999] rounded-lg overflow-hidden shadow-2xl border border-border bg-black">
      <div id="yt-player" />
    </div>
  )
}
