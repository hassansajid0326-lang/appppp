---
name: Kinetic High-Performance
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#4a4949'
  on-secondary-container: '#bab8b7'
  tertiary: '#ffffff'
  on-tertiary: '#233144'
  tertiary-container: '#d5e3fd'
  on-tertiary-container: '#57657b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
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
The design system is engineered for high-intensity performance, targeting athletes and fitness enthusiasts who demand precision and motivation. The aesthetic is a fusion of **Dark Mode Minimalism** and **Glassmorphism**, creating a high-tech "cockpit" feel for personal health data.

The UI should evoke a sense of controlled energy—professional and disciplined, yet vibrating with the intensity of an Electric Lime accent. By using deep backgrounds and translucent layers, we create a sense of focus, ensuring that performance metrics and progress indicators are the primary focal points.

## Colors
This design system utilizes a high-contrast dark palette to reduce eye strain during workouts and highlight critical data.

*   **Primary (Electric Lime):** Used exclusively for calls to action, active states, and success indicators. It represents energy and "go" signals.
*   **Secondary (Deep Charcoal):** The foundation of the UI. All large surfaces use this color to provide a grounded, premium feel.
*   **Tertiary (Slate):** Used for structural elements like dividers, secondary button backgrounds, and card strokes.
*   **Neutral (Cool Gray):** Reserved for secondary text, metadata, and inactive icons to maintain a clear visual hierarchy.

## Typography
The typography strategy prioritizes urgency and readability. **Oswald** is used for all major headings and buttons to provide an athletic, editorial feel. **Inter** handles the heavy lifting for descriptions and instructions due to its exceptional clarity. **JetBrains Mono** is introduced for numerical data and metrics (e.g., heart rate, reps, timers) to emphasize the technical, precision-driven nature of the app. 

All headings should favor an uppercase transformation when used in short fragments to enhance the "athletic brand" impact.

## Layout & Spacing
The design system employs a **Fluid Grid** with a tight 8px baseline rhythm. 

*   **Mobile:** 4-column grid with 20px side margins.
*   **Desktop:** 12-column grid centered at a max-width of 1200px.
*   **Vertical Rhythm:** Use the `stack` variables to maintain consistent breathing room between sections. Data visualizations should always be full-bleed or contained within high-contrast cards to maximize visibility.

## Elevation & Depth
Depth is achieved through **Glassmorphism** and tonal layering rather than traditional shadows.

1.  **Level 0 (Base):** Deep Charcoal (#121212).
2.  **Level 1 (Cards):** Semi-transparent Slate (#1E293B at 60% opacity) with a 1px border (#334155) and a 16px backdrop-blur.
3.  **Level 2 (Overlays/Modals):** Darker semi-transparent layer with a subtle inner glow on the top edge to simulate overhead lighting.

Avoid heavy drop shadows; use thin, high-contrast borders in Slate to define boundaries.

## Shapes
The shape language is **Soft (0.25rem - 0.75rem)**. This provides a professional, engineered look that avoids the "playfulness" of highly rounded corners while remaining more modern and approachable than sharp edges.

*   **Interactive Elements:** Use `rounded-lg` (0.5rem) for primary buttons and input fields.
*   **Data Containers:** Use `rounded-xl` (0.75rem) for Glassmorphism cards.
*   **Status Indicators:** Small dots or square-caps for progress bars.

## Components

*   **Primary Buttons:** Solid Electric Lime (#CCFF00) background with black (#000000) text. Uppercase Oswald font. No shadows, just high-contrast impact.
*   **Glass Cards:** Back-drop blur (16px) with a 1px Slate border. Content inside uses Inter for labels and JetBrains Mono for metrics.
*   **Progress Rings:** Heavy stroke weights. Use Electric Lime for the progress fill and a low-opacity Slate for the track.
*   **Input Fields:** Ghost-style inputs with 1px Slate borders that transition to Electric Lime on focus.
*   **Chips:** Small, rounded-sm containers with Slate borders for exercise tags or muscle groups.
*   **Data Viz:** Line charts should use a glowing Electric Lime stroke with a subtle gradient fill underneath to create a "heart rate monitor" effect.