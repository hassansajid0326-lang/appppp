---
name: Kinetic High-Performance Light
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444933'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#747a60'
  outline-variant: '#c4c9ac'
  surface-tint: '#506600'
  primary: '#506600'
  on-primary: '#ffffff'
  primary-container: '#ccff00'
  on-primary-container: '#5b7300'
  inverse-primary: '#abd600'
  secondary: '#515f72'
  on-secondary: '#ffffff'
  secondary-container: '#d2e1f7'
  on-secondary-container: '#556477'
  tertiary: '#505f76'
  on-tertiary: '#ffffff'
  tertiary-container: '#e3edff'
  on-tertiary-container: '#5c6c82'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#d5e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0e1c2d'
  on-secondary-fixed-variant: '#3a485a'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  electric-lime: '#CCFF00'
  deep-navy: '#051424'
  slate-gray: '#64748B'
  surface-border: '#E2E8F0'
typography:
  display-lg:
    fontFamily: Oswald
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Oswald
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Oswald
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0px
  data-label:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  button-text:
    fontFamily: Oswald
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 20px
  gutter: 16px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 40px
---

## Brand & Style

The design system is engineered for high-intensity performance, targeting athletes and fitness enthusiasts who demand precision, clarity, and motivation. By transitioning to a light aesthetic, the "Kinetic High-Performance" feel shifts from a dark "cockpit" vibe to a "premium laboratory" or "modern training facility" atmosphere—bright, airy, and hyper-focused.

The UI evokes a sense of relentless momentum. It is professional, disciplined, and vibrating with the intensity of an **Electric Lime** accent. This style utilizes **Modern Minimalism** with **High-Contrast** elements. We rely on pure white surfaces and generous whitespace to make high-performance metrics and progress indicators the primary focal points, while sharp navy typography ensures peak readability.

## Colors

The light palette maximizes clarity and energy, ensuring data is legible even in high-glare outdoor environments.

*   **Primary (Electric Lime):** The "kinetic" engine of the UI. Used for active states, success indicators, and primary calls to action. It represents energy and "go" signals.
*   **Secondary (Deep Navy):** Used for primary text and high-impact structural headers. It provides a grounded, authoritative contrast against the white background.
*   **Tertiary (Slate Gray):** Reserved for secondary text, metadata, and inactive icons to maintain a clear hierarchy.
*   **Neutral (Off-White/Pure White):** The foundation of the UI. Backgrounds use pure white (#FFFFFF) while surface containers use #F8FAFC to create subtle depth.

## Typography

The typography strategy prioritizes urgency and technical precision. 

**Oswald** is used for all major headings and buttons to provide an athletic, editorial feel; these should favor an uppercase transformation for maximum brand impact. **Inter** handles descriptions and instructions due to its exceptional clarity on light backgrounds. **JetBrains Mono** is used for numerical data and metrics (e.g., heart rate, reps, timers) to emphasize the precision-driven nature of performance tracking.

## Layout & Spacing

The design system employs a **Fluid Grid** with a tight 8px baseline rhythm to maintain a sense of "engineered" order.

*   **Mobile:** 4-column fluid grid with 20px side margins.
*   **Desktop:** 12-column grid centered at a max-width of 1200px.
*   **Vertical Rhythm:** Use the `stack` variables to maintain consistent breathing room between sections. Data visualizations should be contained within high-contrast cards or full-bleed to maximize visibility. Content reflows should prioritize top-to-bottom hierarchy on mobile.

## Elevation & Depth

In the light theme, hierarchy is conveyed through **Tonal Layers** and **Ambient Shadows** rather than transparency.

1.  **Level 0 (Base):** Pure White (#FFFFFF).
2.  **Level 1 (Cards):** Light Grey surface (#F8FAFC) with a 1px border (#E2E8F0).
3.  **Level 2 (Overlays/Popovers):** Pure White surface with a soft, diffused ambient shadow (Color: Deep Navy, Opacity: 8%, Blur: 12px) to suggest physical lift.

Avoid heavy, dark shadows. Use thin, low-contrast borders to define boundaries between similar surface colors.

## Shapes

The shape language is **Soft**. This provides a professional, "machined" look that feels engineered rather than playful. 

*   **Interactive Elements:** Use `rounded-lg` (0.5rem) for primary buttons and input fields to provide enough "target" feel while staying sharp.
*   **Data Containers:** Use `rounded-xl` (0.75rem) for large cards and data containers.
*   **Status Indicators:** Use `rounded-sm` (0.25rem) for exercise chips and progress bar caps to maintain a technical aesthetic.

## Components

*   **Primary Buttons:** Solid Electric Lime (#CCFF00) background with Deep Navy (#051424) text. No shadows. The high contrast between the lime and navy is the primary driver of the "kinetic" feel.
*   **Surface Cards:** White or Off-white background with a 1px Slate-gray border (#E2E8F0). Labels use Inter; metrics use JetBrains Mono in Deep Navy.
*   **Progress Rings:** Bold stroke weights. Use Electric Lime for the progress fill and a light #F1F5F9 for the track.
*   **Input Fields:** Clean white backgrounds with 1px Slate borders. On focus, the border transitions to a 2px Electric Lime stroke.
*   **Chips:** Small, `rounded-sm` containers with a light grey fill and Deep Navy text for exercise categories.
*   **Data Viz:** Line charts use a crisp Electric Lime stroke. On light backgrounds, the area fill should be a very faint Lime gradient (5% opacity) to keep the layout feeling clean and airy.