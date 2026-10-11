/** @type {import('tailwindcss').Config} */
// "Darkroom" palette: warm near-black, paper-toned text, one safelight accent.
// slate/violet/cyan are remapped (rather than renamed) so every existing
// utility class in the app picks up the new identity.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#12100e',
        panel: '#1a1714',
        raised: '#221e1a',
        paper: '#ece5d8',
        safelight: '#ff5a2c',
        slate: {
          50: '#f6f1e7', 100: '#ece5d8', 200: '#ddd5c6', 300: '#c4bbab',
          400: '#a39a8c', 500: '#867d71', 600: '#6b645a', 700: '#4a453e',
          800: '#2e2924', 900: '#1a1714', 950: '#12100e',
        },
        violet: {
          300: '#ffb199', 400: '#ff8a66', 500: '#ff6f45', 600: '#ff5a2c',
          700: '#d9441b', 800: '#a63416', 900: '#6e2410',
        },
        cyan: {
          300: '#ddd5c6', 400: '#c4bbab', 500: '#a39a8c', 600: '#867d71',
          900: '#2e2924',
        },
        emerald: { 400: '#9fc183', 500: '#8fb573', 600: '#6f9a55' },
        red: { 400: '#e8806d', 500: '#d9604c', 600: '#b94a38' },
        yellow: { 400: '#e2b25a', 500: '#d9a441' },
        orange: { 400: '#e89a5c', 500: '#d9803f' },
        amber: { 300: '#ecc98a', 400: '#e2b25a', 500: '#d9a441' },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px', sm: '2px', md: '4px', lg: '6px', xl: '6px', '2xl': '8px',
      },
    },
  },
  plugins: [],
}
