/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF4ED',
          100: '#FFE6D5',
          200: '#FFCCAA',
          300: '#FFA870',
          400: '#FF7A33',
          500: '#FF5A0E',
          600: '#F14100', // primary
          700: '#C93400',
          800: '#9F2900',
          900: '#7A1F00',
          950: '#451100',
        },
        ink: {
          900: '#0b1220',
          800: '#101a2e',
          700: '#182645',
        },
        easy: '#16a34a',
        moderate: '#d97706',
        difficult: '#dc2626',
      },
      fontFamily: {
        display: ['var(--font-lexend)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 40, 90, 0.06), 0 4px 16px rgba(15, 40, 90, 0.06)',
        nav: '0 -2px 12px rgba(15, 40, 90, 0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
