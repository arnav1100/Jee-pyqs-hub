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
          50: '#eef5ff',
          100: '#d9e9ff',
          200: '#b7d6ff',
          300: '#85baff',
          400: '#4c95ff',
          500: '#2570fb',
          600: '#1652f0', // primary
          700: '#123fd6',
          800: '#1535ac',
          900: '#173189',
          950: '#111d54',
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
