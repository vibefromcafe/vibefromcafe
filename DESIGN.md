# Vibe From Cafe — Design Direction

Adapted from the Sentry analysis on getdesign.md and tuned for Vibe From Cafe.

## Character

Developer-tool clarity meets Indonesian cafe warmth. The page should feel credible enough for working builders, but never corporate: editorial headlines, compact utility labels, playful markers, and visible community energy.

## Color

- Primary / Electric Yellow: `#f5c400`
- Midnight Canvas: `#17131f`
- Deep Surface: `#211b2c`
- Hairline Violet: `#3a3049`
- Warm Paper: `#f6f3e9`
- White: `#ffffff`
- Text on Dark: `#ffffff`
- Muted on Dark: `#b9b3c2`
- Ink on Light: `#17131f`
- Muted on Light: `#65606b`

Yellow replaces Sentry's lime and remains a scarce typographic device and signal. It is not used as a button background or body text. Primary actions follow the source system's polarity: white on dark canvases, midnight on light canvases.

## Typography

- Display: system sans, heavy, tight tracking, 48–88px across breakpoints.
- UI/body: system sans, 15–18px, relaxed leading.
- Utility labels: monospace, 11–13px, uppercase, letter-spaced.
- Keep headlines short, direct, and conversational.

## Components

- Buttons: 8px radius, minimum 44px height. Primary white on dark; midnight on light.
- Cards: 12–18px radius, 1px hairline. Prefer flat contrast over heavy shadows.
- Labels: compact mono tokens such as `/01 · LEARN`.
- Highlight chip: yellow inline block behind one headline phrase.
- Dark feature cards use `#211b2c` over the midnight canvas.

## Layout

- Maximum content width: 1180px.
- 8px spacing base; 88–112px desktop section rhythm.
- Hero is asymmetrical at desktop and single-column on mobile.
- Grids collapse 3 → 2 → 1 columns.
- Navigation collapses below 768px.

## Motion

- Restrained: ticker drift, soft hover lifts, a pulsing status dot.
- Respect `prefers-reduced-motion`.

## Reference synthesis

- VibeDev ID: bold community-first headline, public proof, showcase rhythm.
- Genesis Marketplace: cinematic dark hero, modular category cards, polished density.
- Vibe From Cafe: coffee culture, local chapters, learn/build/share voice.
