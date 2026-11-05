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
          50: '#eafaf5',
          100: '#cff4e8',
          200: '#a4e8d7',
          300: '#6fd8c1',
          400: '#36c2a7',
          500: '#18a98f',
          600: '#108b77',
          700: '#0f7163',
          800: '#11594f',
          900: '#124a43',
          950: '#082e2a',
        },
        ink: {
          900: '#18332f',
          800: '#294640',
          700: '#3d5a54',
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
        card: '0 1px 2px rgba(15, 80, 68, 0.06), 0 4px 16px rgba(15, 80, 68, 0.06)',
        nav: '0 -2px 12px rgba(15, 80, 68, 0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
