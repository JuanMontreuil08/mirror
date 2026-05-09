# Design System — Mirror

## Product Context
- **What this is:** Chat-first investment portfolio tracker — users ask questions in Spanish or English about their US stock portfolio and get educational, plain-language answers from an AI agent.
- **Who it's for:** LATAM beginner investors who may have bought their first stock because a friend recommended it. They find most fintech tools intimidating.
- **Space/industry:** Personal finance / investment tracking / fintech education
- **Project type:** Web app (chat-first) + data dashboard
- **The memorable thing:** "This is beautiful and simple." The screenshot is the pitch.

---

## Aesthetic Direction
- **Direction:** Crystalline Editorial
- **Decoration level:** Minimal — glass effects are the only decoration; typography does everything else
- **Mood:** Like morning light through frosted crystal. Premium and calm, not aggressive or gamified. Not a trading terminal. Not a bank. A quiet, well-lit room where you can understand your money.
- **The mirror concept:** Every surface is reflective and honest. Frosted glass panels float on a warm white base — they reveal what's behind them (data, world context) without distortion. The interface doesn't obscure or alarm; it clarifies.
- **Competitor gap:** Robinhood = dark/neon/gamified (triggers anxiety). Public.com = cold editorial (intimidating). Mirror = calm clarity for someone who belongs here.

---

## Typography

Three fonts, three registers. Never mix roles.

| Role | Font | Why |
|------|------|-----|
| Display / Hero numbers | **Fraunces** (variable, opsz axis) | Optically-tuned serif. Large portfolio totals, welcome states. Zero fintech competitors use display serif — it says "this is a considered, human product." |
| Agent voice / Prose | **Instrument Serif** (incl. italic) | AI responses read like a letter from a knowledgeable friend, not a push notification. Italic for emphasis and asides. |
| UI / Labels / Nav / Buttons | **DM Sans** | Clean, legible, supports tabular-nums. Excellent in both Spanish and English. |
| All financial data | **DM Mono** | Prices, percentages, ticker symbols, P&L values. Precision without coldness. All price/% figures use `font-variant-numeric: tabular-nums`. |

**Loading (Google Fonts CDN):**
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
```

**Type scale:**
| Token | Size | Font | Use |
|-------|------|------|-----|
| `display-xl` | 72–96px | Fraunces 300 | Portfolio total on dashboard |
| `display-lg` | 48px | Fraunces 300 | Section hero numbers |
| `display-md` | 36px | Fraunces 300 | Card totals |
| `prose-lg` | 17px | Instrument Serif | AI response body |
| `prose-md` | 15px | Instrument Serif | Inline prose |
| `ui-md` | 14px | DM Sans 400 | Body text, inputs |
| `ui-sm` | 13px | DM Sans 400 | Secondary labels |
| `ui-xs` | 12px | DM Sans 400 | Captions |
| `mono-lg` | 18px | DM Mono 400 | Prominent figures |
| `mono-md` | 14px | DM Mono 400 | Position P&L |
| `mono-sm` | 11–12px | DM Mono 300 | Labels, timestamps |
| `label` | 10px | DM Mono 500, uppercase, +0.1em tracking | Section eyebrows |

---

## Color System

**Approach:** Restrained — the chrome is warm white and near-black with no decorative color. Color appears ONLY in financial data (gains, losses, warnings). Every green number earns its meaning.

```css
:root {
  /* Surfaces */
  --color-bg:          #F7F6F4;  /* Warm Mist — background, barely-warm white */
  --color-surface:     rgba(255, 255, 255, 0.62); /* Glass card (+ backdrop-blur) */
  --color-surface-solid: #FFFFFF; /* Non-glass cards, modals */
  --color-border:      rgba(255, 255, 255, 0.85); /* Glass border */
  --color-border-sub:  #E8E5DF;  /* Warm Platinum — separators, input borders */

  /* Text */
  --color-text:        #1A1A18;  /* Near-black, warm undertone */
  --color-text-muted:  #6B6B65;  /* Stone Gray — secondary text */
  --color-text-faint:  #A8A89E;  /* Labels, timestamps, placeholders */

  /* Interactive */
  --color-cta:         #1C1C2E;  /* Dark Navy — primary buttons ONLY */
  --color-cta-hover:   #2D2D42;

  /* Financial data — these are the ONLY colored elements in the UI */
  --color-gain:        #1A6B3A;  /* Deep Forest Green — calm, not euphoric */
  --color-gain-bg:     rgba(26, 107, 58, 0.08);
  --color-loss:        #9B3A3A;  /* Muted Garnet — honest, not alarm-red */
  --color-loss-bg:     rgba(155, 58, 58, 0.08);
  --color-warn:        #C97B20;  /* Amber — concentration warnings */
  --color-warn-bg:     rgba(201, 123, 32, 0.09);
}
```

**Dark mode** (triggered by `prefers-color-scheme: dark` or user toggle):
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:            #0F0F12;
    --color-surface:       rgba(255, 255, 255, 0.06);
    --color-surface-solid: #1A1A20;
    --color-border:        rgba(255, 255, 255, 0.10);
    --color-border-sub:    #2A2A32;
    --color-text:          #F0EFED;
    --color-text-muted:    #8A8A96;
    --color-text-faint:    #52525C;
    --color-cta:           #EDEDF5;
    /* Gain/loss/warn tokens unchanged — semantic colors stay consistent */
  }
}
```

**RULES:**
- Never use `--color-gain` or `--color-loss` for decorative purposes (icons, borders, backgrounds unless they are `--color-gain-bg`)
- `--color-cta` used ONLY for primary action buttons (`Sign in`, `Confirm`, `Upload`). Never for nav, tags, or decorative elements.
- `--color-warn` used ONLY for the ⚠ HIGH CONCENTRATION flag in portfolio analysis.

---

## The Glass Recipe

Every card/panel surface in Mirror uses this recipe. Apply consistently.

```css
.glass {
  background: var(--color-surface);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--color-border);
  box-shadow:
    0 8px 32px rgba(31, 38, 135, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.90);
}
```

**When to use glass vs. solid surface:**
| Context | Use |
|---------|-----|
| Chat input area, nav bar (sticky) | Glass (backdrop-blur on scrolled content below) |
| Portfolio panel header | Glass |
| Position cards | Solid (`--color-surface-solid`) with subtle border |
| Login card | Solid with `box-shadow: 0 24px 64px rgba(0,0,0,0.08)` |
| Modals | Glass |
| Sentiment metric cards | Solid |

---

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable (not compact, not spacious — data needs room to breathe without feeling sparse)

```
2xs:  4px   (icon gaps, tight inline spacing)
xs:   8px   (between related elements)
sm:   12px  (inner card padding vertical)
md:   16px  (standard gap, padding)
lg:   24px  (card padding, section within a card)
xl:   32px  (between major sections within a page)
2xl:  48px  (page-level section separation)
3xl:  64px  (hero / above-fold spacing)
4xl:  80px  (full-page hero padding)
```

---

## Layout

- **Approach:** Grid-disciplined — strict column alignment, predictable hierarchy
- **Max content width:** 1280px (centered, `padding: 0 48px` on desktop, `0 24px` on mobile)
- **Dashboard grid:** 2-column (chat | portfolio panel) on ≥1024px, single column on mobile
- **Chat messages max-width:** 680px (prevents line lengths that are hard to read in prose)

**Border radius — hierarchical:**
```
--radius-sm:  6px   (badges, small tags)
--radius-md:  12px  (inputs, buttons, position cards)
--radius-lg:  20px  (component cards, large panels)
--radius-xl:  28px  (page-level containers, modals, the chat mockup)
--radius-full: 9999px (pills, avatars)
```

---

## Motion

**Approach:** Intentional — every animation serves comprehension or signals state. None exist for entertainment.

**Easing functions:**
```css
--ease-out:    cubic-bezier(0.0, 0.0, 0.2, 1);   /* Elements entering */
--ease-in:     cubic-bezier(0.4, 0.0, 1, 1);      /* Elements leaving */
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);   /* Moving elements */
```

**Duration scale:**
```
micro:   100ms   (hover states, badge appearance)
short:   200ms   (button state changes, input focus)
medium:  300ms   (panel slide-in, card entrance)
long:    500ms   (page transitions, count-up numbers)
```

**Specific animations:**

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Glass panels on page load | `opacity: 0→1` + `translateY(8px→0)` | 250ms | ease-out |
| Portfolio total (first load) | Count-up from 0 to value | 600ms | ease-out |
| Chat AI response (streaming) | Fade in as chunks arrive | 150ms per chunk | ease-out |
| Portfolio panel (slide-in toggle) | `translateX(100%→0)` | 280ms | ease-out |
| Sentiment bar fill | `width: 0→value%` | 500ms | ease-out |
| Hover on position card | `box-shadow` deepens | 150ms | ease-in-out |
| Voucher drop zone (drag over) | `opacity` pulse (0.6→1) | 400ms | ease-in-out |
| New chat message | `opacity: 0→1` + `translateY(6px→0)` | 200ms | ease-out |

**Explicit NO-animations:**
- No flashing/pulsing price updates (Mirror is not a trader terminal)
- No confetti or celebration animations
- No spring physics or bounce (glass doesn't bounce)
- No skeleton loaders that pulse — use simple opacity fade
- No loading spinners — prefer progress text ("Thinking..." in the chat)

**Reduced motion:** Wrap all non-essential animations in `@media (prefers-reduced-motion: no-preference) {}`. When reduced motion is active, use `opacity` transitions only (no translate, no count-up).

---

## Surface-by-Surface Guide

### Login / Register
- Centered card on `--color-bg`, `--radius-xl`, solid white with large box-shadow
- Product name "Mirror." in Fraunces 300, 28px — no logo mark
- Tagline in Instrument Serif italic, muted
- Inputs: `--color-bg` fill, `--color-border-sub` border, focus border `--color-cta` at 30% opacity
- Submit button: full-width, `--color-cta` background

### Chat Interface (Main)
- Chat input sits at the **TOP** of the screen — user initiates inquiry, not waits
- Input: rounded pill shape (`--radius-xl`), light background, very subtle border
- Suggested question pills: ghost style, appear below the input, stagger-fade on load
- AI responses: Instrument Serif 17px, `--color-surface-solid` bubble, left-aligned, max-width 680px
- User messages: DM Sans 14px, `--color-cta` background, white text, right-aligned
- Timestamps: DM Mono 10px, `--color-text-faint`

### Portfolio Panel (Slide-in)
- Slides in from right, `border-left: 1px solid --color-border-sub`
- Header: Fraunces 36px for total value, DM Mono for P&L change
- Position list: solid cards on `--color-bg`, DM Mono for all values
- Weight bar: colored segments (gain tones), DM Mono 10px labels below
- **P&L color reveal on hover (not on load):** Position P&L values render in `--color-text-muted` (neutral) by default. On hover, they transition to `--color-gain` or `--color-loss`. Duration: 150ms ease-in-out. This is a deliberate counter to Robinhood's constant green/red assault — the user chooses when to face the numbers emotionally.
  ```css
  .pos-pnl { color: var(--color-text-muted); transition: color 150ms ease-in-out; }
  .position-card:hover .pos-pnl { color: var(--color-gain); /* or --color-loss */ }
  ```
- Exception: the **portfolio total P&L** in the panel header is always colored (it's the summary, not per-position anxiety)

### Voucher Upload
- Drop zone: dashed border `--color-border-sub`, `--radius-lg`
- Active drag: border becomes solid `--color-cta` at 30% opacity, subtle glow
- Extracted data review: solid cards, DM Mono for all financial values
- Confirm button: `--color-cta`, full-width

### Sentiment Analysis
- Metric cards: solid white, Fraunces for large numbers
- Sentiment score: Fraunces `--color-gain` or `--color-loss` depending on value
- Bar chart: fill animates on load
- AI narrative: Instrument Serif italic in a glass card

---

## Anti-patterns (never do these)

- **Never use Inter, Roboto, Montserrat, Poppins, or Space Grotesk** — they signal "I used an AI design tool"
- **Never use purple/violet gradients** as accent or background
- **Never add color to navigation, breadcrumbs, or section labels** — keep chrome colorless
- **Never use rounded-everything uniform border-radius** — use the hierarchical scale above
- **Never animate prices on update** (no flash, no pulse)
- **Never add confetti or celebration effects** — this is not a game
- **Never use `system-ui` or `-apple-system` as primary fonts** — we have a type stack, use it

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-09 | Initial design system created | /design-consultation — Crystalline Editorial direction, light base, glass surfaces |
| 2026-05-09 | Fraunces for display numerics | Both primary and independent design voices independently chose serif for hero numbers — zero fintech competitors do this |
| 2026-05-09 | DM Mono for all financial data | Both voices independently chose this — precision without coldness |
| 2026-05-09 | Chat input at top of screen | Inverts messenger convention — user initiates inquiry, not waits for reply; reframes Mirror's posture |
| 2026-05-09 | No color in chrome/nav | All green/red reserved exclusively for financial data — every colored number earns its meaning |
| 2026-05-09 | #F7F6F4 not #FFFFFF for background | Prevents clinical white feel; the warmth makes glass panels pop without contrast |
| 2026-05-09 | Muted garnet (#9B3A3A) not alarm red | Loss should feel honest, not alarming — LATAM beginners shouldn't feel anxiety looking at P&L |
| 2026-05-09 | P&L color reveals on hover, not on load | User chooses when to face the numbers emotionally. Default state is neutral ink. Direct counter to Robinhood's dopamine/cortisol green/red loop. Exception: portfolio total header always colored. |
