# Unified Design System: MemeMint
_Combines Clay’s warm light canvas with The Verge’s editorial accent system._

## 1. Visual Theme
- **Canvas**: `#fffaf0` (Clay cream) — warm, light base for all pages.
- **Dark surfaces**: `#0a0a0a` (Clay primary) and `#131313` (Verge canvas black) reserved for hero bands, footer, and high-contrast editorial accents.
- **Accent hazard system** (from Verge, adapted for light canvas):
  - `#3cffd0` — Jelly Mint (CTAs, active states, borders)
  - `#5200ff` — Ultraviolet (promotional tiles, secondary accents)
  - `#ff4d8b` — Clay Pink (feature cards)
  - `#1a3a3a` — Clay Teal (feature cards, dark feature tiles)
  - `#b8a4ed` — Lavender (feature cards)
  - `#ffb084` — Peach (feature cards)
  - `#e8b94a` — Ochre (feature cards)
- **No gradients.** Flat color blocks only. Depth via 1px hairline borders (`#e5e5e5` on light, `#ffffff` or hazard colors on dark).

## 2. Typography
- **Display / Hero**: Inter weight 500–600, negative letter-spacing (-0.05em to -0.025em), large scale (48–72px equivalent).
- **Body**: Inter 400, 16px, line-height 1.55.
- **Uppercase labels**: Inter 600, 11–12px, letter-spacing 1.5px, ALL CAPS. (Verge mono-uppercase influence, using Inter instead of PolySans Mono.)
- **Kicker / eyebrow**: Inter 500, 12–13px, letter-spacing 1.5px, ALL CAPS, muted color.
- **Fallback**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

## 3. Spacing
- Base unit: 4px (Clay).
- Tokens: 4, 8, 12, 16, 24, 32, 48, 64, 96px.
- Section vertical rhythm: 64–96px between major bands.
- Card padding: 24–32px.
- Inline spacing: kickers 8–12px above headlines; headlines 12–16px above body.

## 4. Border Radius
- `xs`: 6px — small badges
- `sm`: 8px — compact pills
- `md`: 12px — buttons, inputs
- `lg`: 16px — content cards
- `xl`: 24px — feature cards, primary CTAs
- `pill`: 9999px — category tabs, badge pills
- **No square corners.** Every interactive and content container is rounded.

## 5. Components
- **Primary CTA**: `#0a0a0a` near-black fill, white text, Inter 14px / 600, rounded 12px, padding 12px 20px, height 44px.
- **Primary Mint CTA (hero)**: `#3cffd0` jelly mint fill, black text, rounded 24px, padding 10px 24px. Hover: translucent white bg.
- **Secondary**: Cream canvas fill, ink text, 1px hairline border, rounded 12px.
- **Feature cards**: Saturated single-color blocks (pink, teal, lavender, peach, ochre, cream) at 24px radius, 32px padding. Text flips to white on dark cards.
- **Inputs**: Cream canvas fill, 1px hairline border, rounded 12px, 44px height.
- **Tabs / pills**: Rounded 9999px, inactive = transparent + muted text; active = cream-card bg + ink text.
- **Cards (generic)**: `#fffaf0` or white fill, 1px `#e5e5e5` border, rounded 16px, no shadow.
- **Dark bands**: `#0a0a0a` or `#131313` fill, white text, 1px white hairline where needed.
- **Footer**: `#faf5e8` surface-soft, NOT dark.
- **Social icons**: Monochrome or hazard-mint on hover, 20–24px.

## 6. Depth & Elevation
- **No decorative gradients, no glows, no blurs.**
- Flat color blocks carry hierarchy.
- Depth via:
  - 1px hairline borders (`#e5e5e5` light, `#ffffff` dark, hazard colors on accents)
  - Saturated accent fills (mint/ultraviolet/pink/teal/etc.)
  - Subtle `rgba(0,0,0,0.05)` ring only on stacked cards if absolutely necessary

## 7. Content & SEO Rules
- Remove all emojis from UI components (homepage, cards, buttons, navigation).
- Use ALL CAPS mono-style uppercase for section labels, kickers, timestamps, category tags.
- Every page needs:
  - Unique `<title>` and `<meta name="description">`
  - OpenGraph tags
  - Canonical URL
  - Structured data (JSON-LD) where applicable (Organization, WebSite, BreadcrumbList, Article)
- Homepage must include:
  - Clear value proposition h1
  - 3–4 feature tiles (no emoji, icon = SVG or CSS shape)
  - How-it-works steps
  - FAQ preview or link
  - Social proof / stats (if factual)
  - Primary CTA above fold
  - Secondary CTA in footer band
- New pages to add:
  - `/blog` — SEO articles with factual data, internal links to /create and /faq
  - `/blog/[slug]` — individual post pages
  - `/contact` — contact form + info
  - `/terms` — Terms and Conditions
  - `/privacy` — Privacy Policy
  - `/api-docs` (optional) — API reference if features added

## 8. Accessibility
- Color contrast minimum 4.5:1 for body text.
- Focus rings: `#3cffd0` mint ring on dark, `#0a0a0a` on light.
- Touch targets minimum 44px height.
- Lazy load images below the fold.

## 9. Agent Guardrails
- Do not introduce new accent colors outside the declared palette.
- Do not use square corners.
- Do not use gradients or box-shadows for elevation.
- Do not use emojis in components.
- Do not use Manuka/Plain Black if not available — substitute Inter 500–600 with negative letter-spacing.
- Keep spacings consistent with the 4px base system.
