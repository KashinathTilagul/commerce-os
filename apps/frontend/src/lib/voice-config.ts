'use client'

export interface VoiceOption {
  id: string
  name: string
  category: string
  gender: 'female' | 'male'
  lang: string
}

export const WORKABLE_VOICES: VoiceOption[] = [
  { id: 'openai:onyx', name: 'Krishna — Natural Male (Cloud)', category: 'Cloud neural', gender: 'male', lang: 'en-IN' },
  { id: 'device:male', name: 'Device Male Voice (Fallback)', category: 'Device', gender: 'male', lang: 'en-IN' },
]

export const JARVIS_VOICE_ID = 'openai:onyx'

export function getJarvisProfile() {
  return {
    pitch: 0.76,
    rate: 0.86,
    style: 'assistant' as const,
    styledegree: 1.5,
    lang: 'en-IN',
    isFemale: false,
    gender: 'male' as const,
  }
}
export function getSelectedVoiceId(): string {
  if (typeof window === 'undefined') return JARVIS_VOICE_ID
  try {
    return localStorage.getItem('krishna_voice') || JARVIS_VOICE_ID
  } catch {
    return JARVIS_VOICE_ID
  }
}

export function getVoiceProfile(voiceId: string) {
  if (voiceId === JARVIS_VOICE_ID) {
    return getJarvisProfile()
  }

  const matched = WORKABLE_VOICES.find(v => v.id === voiceId)
  if (matched) {
    const isFemale = matched.gender === 'female'
    const lang = matched.lang
    let pitch = 1.0
    let rate = 0.92

    if (lang.startsWith('hi')) {
      pitch = isFemale ? 1.15 : 0.82
      rate = 0.88
    } else if (lang.startsWith('en-IN')) {
      // Krishna — warm, human Indian male voice (Prabhat)
      pitch = isFemale ? 1.08 : 0.90
      rate = isFemale ? 0.92 : 0.88
    } else if (lang.startsWith('en-GB')) {
      pitch = isFemale ? 1.05 : 0.80
      rate = 0.88
    } else if (lang.startsWith('en-AU')) {
      pitch = isFemale ? 1.08 : 0.84
      rate = 0.92
    } else {
      pitch = isFemale ? 1.08 : 0.82
      rate = 0.90
    }

    return { lang, isFemale, pitch, rate, gender: matched.gender }
  }

  // Fallback heuristic for unknown voice IDs
  const isFemale = /female|woman|neerja|emma|ava|sonia|natasha|swara|eve|anna|alba|estelle|lola/i.test(voiceId)
  const isRyan = /ryan/i.test(voiceId)
  const lang = voiceId.startsWith('hi-IN') ? 'hi-IN'
    : voiceId.startsWith('en-IN') ? 'en-IN'
    : voiceId.startsWith('en-GB') ? 'en-GB'
    : voiceId.startsWith('en-AU') ? 'en-AU' : 'en-US'

  if (isRyan) {
    return {
      lang,
      isFemale: false,
      pitch: 0.76,
      rate: 0.86,
      gender: 'male' as const,
      style: 'assistant',
      styledegree: 1.5,
    }
  }

  return {
    lang,
    isFemale,
    pitch: isFemale ? 1.08 : 0.85,
    rate: 0.90,
    gender: (isFemale ? 'female' : 'male') as 'female' | 'male',
  }
}

export function applyVoiceToUtterance(
  u: SpeechSynthesisUtterance,
  synth: SpeechSynthesis,
  voiceId: string
) {
  const profile = getVoiceProfile(voiceId)
  const allVoices = synth.getVoices()

  if (allVoices.length > 0) {
    const genderHint = profile.isFemale ? 'female' : 'male'

    // 1. Try exact voice match by name (e.g., if browser has "Microsoft Neerja Online")
    let best = allVoices.find(v => {
      const vName = v.name.toLowerCase()
      return (voiceId.includes('Neerja') && vName.includes('neerja')) ||
             (voiceId.includes('Prabhat') && vName.includes('prabhat')) ||
             (voiceId.includes('Swara') && vName.includes('swara')) ||
             (voiceId.includes('Madhur') && vName.includes('madhur')) ||
             (voiceId.includes('Emma') && vName.includes('emma')) ||
             (voiceId.includes('Andrew') && vName.includes('andrew')) ||
             (voiceId.includes('Ava') && vName.includes('ava')) ||
             (voiceId.includes('Brian') && vName.includes('brian')) ||
             (voiceId.includes('Sonia') && vName.includes('sonia')) ||
             (voiceId.includes('Ryan') && vName.includes('ryan')) ||
             (voiceId.includes('Natasha') && vName.includes('natasha')) ||
             (voiceId.includes('William') && vName.includes('william'))
    })

    // 2. Try language + gender match
    if (!best) {
      best = allVoices.find(v => v.lang.startsWith(profile.lang.slice(0, 2)) && v.name.toLowerCase().includes(genderHint))
    }

    // 3. Try language match
    if (!best) {
      best = allVoices.find(v => v.lang.startsWith(profile.lang.slice(0, 2)))
    }

    // 4. Try English fallback
    if (!best) {
      best = allVoices.find(v => v.lang.startsWith('en')) || allVoices[0]
    }

    if (best) {
      u.voice = best
      u.lang = best.lang || profile.lang
    }
  }

  u.pitch = profile.pitch
  u.rate = profile.rate
  u.volume = 1.0
}
