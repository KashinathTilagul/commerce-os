// Brand Guardian — single enforcement point for EKVAAR brand rules.
// Source of truth: Branding/Ekvaar Brand Book.md + Branding/6 Colors.txt.
import { promises as fs, readFileSync } from 'fs'
import path from 'path'
import { db } from './db'

export const BRAND_COLORS = {
  'Noor Black': '#000000',
  'Rui White': '#FFFFFF',
  'Agni Red': '#C0342C',
  'Neel Blue': '#0047AB',
  'Arav Green': '#2E7D32',
  'Gulabi Pink': '#E91E63',
} as const

const ALLOWED_HEXES = new Set(Object.values(BRAND_COLORS).map((hex) => hex.toLowerCase()))

export const BRAND_PROMPT_SECTION = `
BRAND GUARDIAN (violation = rejection):
- House: EKVAAR — India's First All-Time Fashion House. Tone: restrained, architectural, cinematic, minimal, culturally intelligent.
- Palette is LIMITED to the six signature colors: Noor Black #000000, Rui White #FFFFFF, Agni Red #C0342C, Neel Blue #0047AB, Arav Green #2E7D32, Gulabi Pink #E91E63. No other hues.
- Forbidden: chaotic graphics, cheap patterns, excessive gradients, meme aesthetics, copycat luxury, loud influencer styling, hype language.
- Typography quiet, readable, structured. Photography: directional light, real texture, negative space, controlled emotion.
- If a logo is referenced, use the provided EKVAAR logo asset exactly; never redraw, restyle, or alter it.`

// Single source of truth for the visual style line appended to every image
// prompt (Brand Book §§08–09). Kept here so image/video/PDF generators all
// speak with one voice instead of each carrying their own ad-hoc copy.
export const BRAND_IMAGE_STYLE_LINE = 'Ekvaar brand style: minimal premium Indian editorial look, architectural and cinematic, soft directional light, real texture, generous negative space, restrained palette limited to Noor Black #000000, Rui White #FFFFFF, Agni Red #C0342C, Neel Blue #0047AB, Arav Green #2E7D32, Gulabi Pink #E91E63. No chaotic graphics, no excessive gradients, no meme or influencer aesthetics.'

// Brand Book §09: typography is quiet, readable, structured. The house
// wordmark is serif; body copy is system-native sans (DESIGN_SYSTEM).
export const BRAND_FONT_DISPLAY = 'Georgia, "Times New Roman", serif'
export const BRAND_FONT_BODY = '"Helvetica Neue", Helvetica, Arial, sans-serif'
// SVG-in-sharp variant: single quotes, or the stack's own quotes terminate
// the font-family attribute and corrupt the XML.
export const BRAND_FONT_DISPLAY_SVG = "Georgia, 'Times New Roman', serif"

const BRANDING_DIR = path.join(process.cwd(), 'public', 'branding')

/** Absolute path to a shipped house logo file (white variant for dark video cards). */
export function brandLogoPath(variant: 'logo-black' | 'logo-white' | 'monogram' = 'logo-white'): string {
  return path.join(BRANDING_DIR, `${variant}.png`)
}

/** Base64 data URI of the house logo for embedding in HTML/PDF templates. */
export function brandLogoDataUri(variant: 'logo-black' | 'logo-white' | 'monogram' = 'logo-black'): string | null {
  try {
    const buffer = readFileSync(brandLogoPath(variant))
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

/** Logo PNG buffer for compositing into video frames via sharp. */
export async function brandLogoBuffer(variant: 'logo-black' | 'logo-white' | 'monogram' = 'logo-white'): Promise<Buffer | null> {
  try {
    return await fs.readFile(brandLogoPath(variant))
  } catch {
    return null
  }
}

/**
 * Look up the house logo artifact for reference-based generation.
 * ponytail: title-substring match on Artifact is the smallest correct lookup;
 * ceiling: a mis-titled upload won't be found. Upgrade path: knowledge-base tags.
 */
export async function brandLogoReference(organizationId: string): Promise<string | undefined> {
  const logo = await db.artifact.findFirst({
    where: { organizationId, status: 'READY', title: { contains: 'logo', mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return logo ? `/api/artifacts/${logo.id}` : undefined
}

/** Template guard for video/PDF pipelines: every color must be one of the six. */
export function assertTemplateColors(hexes: string[]): void {
  const offenders = hexes.filter((hex) => !ALLOWED_HEXES.has(String(hex).toLowerCase()))
  if (offenders.length > 0) {
    throw new Error(`Off-palette colors rejected: ${offenders.join(', ')}. EKVAAR media may only use the six signature colors.`)
  }
}
