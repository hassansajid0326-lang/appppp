/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Kinetic High-Performance Custom Color Palettes (Responsive to Dark Mode Class)
        surface: {
          DEFAULT: '#051424', // Dark default
          dim: '#051424',
          bright: '#2c3a4c',
          container: {
            lowest: '#010f1f',
            low: '#0d1c2d',
            DEFAULT: '#122131',
            high: '#1c2b3c',
            highest: '#273647',
          },
          variant: '#273647',
          border: '#E2E8F0',
        },
        primary: {
          DEFAULT: '#ffffff', // Dark default
          container: '#c3f400',
          fixed: '#c3f400',
          'fixed-dim': '#abd600',
        },
        secondary: {
          DEFAULT: '#c8c6c5',
          container: '#4a4949',
        },
        tertiary: {
          DEFAULT: '#ffffff',
          container: '#d5e3fd',
        },
        // Explicit theme variables for quick inline access
        'electric-lime': '#CCFF00',
        'deep-navy': '#051424',
        'slate-gray': '#64748B',
      },
      spacing: {
        base: '8px',
        'container-padding': '20px',
        gutter: '16px',
        'stack-sm': '12px',
        'stack-md': '24px',
        'stack-lg': '40px',
      },
      fontFamily: {
        oswald: ['Oswald'],
        inter: ['Inter'],
        mono: ['JetBrains Mono'],
      },
      borderRadius: {
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      }
    },
  },
  plugins: [],
}
