/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#070b16',
          900: '#0b1020',
          800: '#101a3a',
          700: '#1a2547',
        },
        accent: {
          cyan: '#67e8f9',
          blue: '#60a5fa',
          violet: '#a78bfa',
          amber: '#fbbf24',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', '"Space Grotesk"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '2xl': '1.25rem',
      },
      boxShadow: {
        glow: '0 0 24px rgba(103, 232, 249, 0.18), 0 0 48px rgba(167, 139, 250, 0.10)',
        'glow-sm': '0 0 14px rgba(103, 232, 249, 0.14)',
      },
    },
  },
  plugins: [],
}
