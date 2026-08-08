'use client'

export interface VoiceOption {
  id: string
  name: string
  category: string
  gender: 'female' | 'male'
  lang: string
}

export const WORKABLE_VOICES: VoiceOption[] = [
  // Indian English & Hindi
  { id: 'en-IN-NeerjaNeural', name: 'Neerja — Indian English (Female)', category: 'Indian English', gender: 'female', lang: 'en-IN' },
  { id: 'en-IN-PrabhatNeural', name: 'Prabhat — Indian English (Male)', category: 'Indian English', gender: 'male', lang: 'en-IN' },
  { id: 'hi-IN-SwaraNeural', name: 'Swara — Hindi (Female)', category: 'Hindi', gender: 'female', lang: 'hi-IN' },
  { id: 'hi-IN-MadhurNeural', name: 'Madhur — Hindi (Male)', category: 'Hindi', gender: 'male', lang: 'hi-IN' },
  // Global & US English
  { id: 'en-US-EmmaNeural', name: 'Emma — US English (Female)', category: 'US English', gender: 'female', lang: 'en-US' },
  { id: 'en-US-AndrewNeural', name: 'Andrew — US English (Male)', category: 'US English', gender: 'male', lang: 'en-US' },
  { id: 'en-US-AvaNeural', name: 'Ava — Warm English (Female)', category: 'US English', gender: 'female', lang: 'en-US' },
  { id: 'en-US-BrianNeural', name: 'Brian — Deep English (Male)', category: 'US English', gender: 'male', lang: 'en-US' },
  // British & Australian
  { id: 'en-GB-SoniaNeural', name: 'Sonia — British English (Female)', category: 'British / AU', gender: 'female', lang: 'en-GB' },
  { id: 'en-GB-RyanNeural', name: 'Ryan — British English (Male)', category: 'British / AU', gender: 'male', lang: 'en-GB' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha — Australian English (Female)', category: 'British / AU', gender: 'female', lang: 'en-AU' },
  { id: 'en-AU-WilliamNeural', name: 'William — Australian English (Male)', category: 'British / AU', gender: 'male', lang: 'en-AU' },
]

export function getSelectedVoiceId(): string {
  if (typeof window === 'undefined') return 'en-IN-PrabhatNeural'
  try {
    return localStorage.getItem('krishna_voice') || 'en-IN-PrabhatNeural'
  } catch {
    return 'en-IN-PrabhatNeural'
  }
}
}

export function getVoiceProfile(voiceId: string) {
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
  const lang = voiceId.startsWith('hi-IN') ? 'hi-IN'
    : voiceId.startsWith('en-IN') ? 'en-IN'
    : voiceId.startsWith('en-GB') ? 'en-GB'
    : voiceId.startsWith('en-AU') ? 'en-AU' : 'en-US'

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
