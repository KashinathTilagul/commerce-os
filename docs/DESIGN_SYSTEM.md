# EKVAAR OS — D5 VISUAL LANGUAGE & DESIGN SYSTEM

*(Note: This specification defines the aesthetic principles and design tokens for the OS, ensuring a cohesive feel without prescribing literal mockups).*

## 1. DESIGN PHILOSOPHY

- **The Feeling**: EKVAAR OS must feel like a precision instrument. It should evoke the dense, high-utility focus of *Linear* combined with the minimalist, typography-forward elegance of *Arc Browser*.
- **The Identity**: Premium, Intelligent, Calm, Futuristic, and Professional. 
- **What to Avoid**: It is NOT a blinking, neon sci-fi dashboard. It is NOT a sterile corporate IT portal. It is the sophisticated, stealth-wealth digital headquarters of a modern founder.

---

## 2. VISUAL PRINCIPLES

1. **Absolute Negative Space**: The "Void" is the core design element. Elements breathe; they are never packed tightly unless displaying raw data.
2. **Typography as Interface**: Text is the primary UI. We rely on typographic hierarchy rather than bounding boxes and background colors to separate information.
3. **High-Contrast Clarity**: Readability supersedes aesthetic trendiness.
4. **Ruthless Monochromacy**: Color is expensive cognitive currency. 95% of the OS is monochrome. Color is used strictly to indicate execution status or risk.

---

## 3. SPATIAL SYSTEM

Space is defined by the **Z-Axis Elevation Model**.
- `Z=0` (The Void): Pure black canvas.
- `Z=10` (Applications): Flat against the void. No drop shadows. Bordered by a subtle 1px stroke to separate them from the void.
- `Z=50` (Overlays & KRISHNA): Heavy backdrop blur (glassmorphism) applied to the underlying elements to force focus on the modal.
- `Z=100` (Critical Notifications): Opaque center modals with sharp, high-contrast drop shadows.

---

## 4. MOTION SYSTEM

EKVAAR OS does not animate; it snaps.
- **Philosophy**: Velocity over cinematic flair. Bouncy spring physics and long ease-in-out transitions are banned.
- **Transitions**: Hard cuts or sub-100ms crossfades.
- **Window Opening**: Instant render. 
- **KRISHNA Activation**: The text input cursor blinks immediately upon `CMD+Space`. Zero delay.

---

## 5. COLOR SYSTEM

The OS is natively **Dark Mode**.
- **Base (The Void)**: True Black (`#000000`) or exceptionally deep gray.
- **Surface**: Marginally lighter shades of black for application backgrounds.
- **Typography**: Crisp Off-White for primary text; Muted Gray for metadata.
- **Semantic/Status Colors**: 
  - `[Blocked/Risk]`: Desaturated, matte Red.
  - `[Nominal/Success]`: Desaturated, matte Green.
  - `[KRISHNA/Active]`: A subtle, electric brand-aligned accent color (e.g., a muted cyan or deep violet) used only for the KRISHNA waveform or active cursor.

---

## 6. TYPOGRAPHY SYSTEM

- **Display/Headings**: A geometric, modern Sans-Serif (e.g., Inter, SF Pro, or Roboto) conveying quiet authority. Tight tracking.
- **Body**: The same Sans-Serif, optimized for legibility at small point sizes (12px - 14px) for dense reading in the Knowledge Vault.
- **Data/Command**: A crisp Monospace font (e.g., JetBrains Mono, SF Mono) used universally for Metric integers, Agent JSON outputs, Decision IDs, and Command Palette inputs.

---

## 7. ICONOGRAPHY SYSTEM

- **Philosophy**: Text > Icons. If a word fits, use a word.
- **The Icons**: When necessary, icons must be geometric, strict 1px stroke (unfilled), minimalist vectors (e.g., Phosphor Icons style).
- **Agent Icons**: Agents do not get cute robot faces. They are represented by a monolithic typographic badge (e.g., `[ A-04 ]`).

---

## 8. WINDOW DESIGN LANGUAGE

- **Chrome**: Invisible. No thick title bars, no simulated metallic gradients.
- **Borders**: Windows are defined by a crisp `1px` inner stroke of faint gray (`rgba(255,255,255,0.1)`).
- **Corners**: Subtle. A strict `4px` or `8px` border radius across the entire OS. No perfectly sharp corners, but no pill-shaped bubbly UI either.

---

## 9. DOCK DESIGN LANGUAGE

- **Behavior**: Auto-hidden, floating at the bottom edge.
- **Structure**: A translucent, pill-shaped glass container holding 3 minimalist, 1px-stroke application icons.
- **Focus**: When hovered, an active indicator (a 2px dot or underline) glows gently beneath the active app.

---

## 10. KRISHNA VISUAL LANGUAGE

- **Identity**: KRISHNA does not have an avatar, a 3D orb, or a face. KRISHNA is the Voice in the Void.
- **Interaction**: KRISHNA is represented visually by pure, cleanly rendered typography streaming onto the screen.
- **Ambient State**: In Presence Mode, KRISHNA is visualized as a minimalist, monochromatic audio waveform that pulses with 60fps fluidity when listening to the Founder's voice.

---

## 11. NOTIFICATION DESIGN LANGUAGE

- **Urgency Hierarchy**:
  - *Standard*: A small, floating toast notification (`Z=50`). Monochromatic text with a subtle 1px border.
  - *Critical*: A dead-center modal (`Z=100`). High-contrast. The border pulses with the `[Blocked]` Semantic Red. The background underlying the modal dims by 70%.

---

## 12. WORKSPACE DESIGN LANGUAGE

Because V1 utilizes a flat workspace structure, Workspace switching is indicated by metadata, not massive UI shifts.
- **Visual Context**: Switching to the "Brand Workspace" changes the Workspace indicator in the Menu Bar. 
- **Ambient Shift (V2 Concept)**: The absolute black background of the Void may shift to a 1% tinted hue of the Domain (e.g., a microscopic tint of blue for Finance) to grant subconscious context.

---

## 13. COMPONENT SYSTEM

- **Buttons**: Flat. No gradients. Hover states are indicated by a subtle background fill shift (e.g., transparent to 10% white).
- **Inputs**: Defined by a single underline or a faint 1px bounding box. Focus states are indicated by a 1px stroke of the active KRISHNA accent color.
- **Lists/Tables**: No zebra-striping. Rows are separated by 1px hairline dividers. Extreme padding ensures high scannability.

---

## 14. DESIGN TOKENS (BASE)

- **Grid System**: 4px baseline grid.
- **Spacing Scale**: `4px` (Micro), `8px` (Tight), `16px` (Standard), `24px` (Section), `48px` (Canvas).
- **Border Radius**: Global `4px` standard for inputs/buttons. `8px` for large Modals.
- **Elevation**: Driven by opacity dropshadows (`rgba(0,0,0,0.5)`), not by bright contrasting borders.

---

## 15. V1 DESIGN SYSTEM BLUEPRINT

To ensure engineering can begin immediately without being stalled by complex CSS rendering:

- **Strict Monochrome Theme**: V1 will launch as a pure Dark Mode application. Light mode is deferred.
- **Native Typography**: V1 will utilize system-native sans-serif fonts to ensure zero load-time latency.
- **Zero Animation**: To maximize velocity, V1 will feature zero CSS transition animations. Hover states and modal openings will be instant `0ms` hard-cuts. The OS must feel as fast as a terminal.
