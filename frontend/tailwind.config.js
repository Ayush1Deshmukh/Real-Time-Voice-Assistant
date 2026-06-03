/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          300: '#8b9dff',
          400: '#758cff',
          500: '#3d57fc', // Primary Neon Blue
          600: '#2c3ef1',
        },
        surface: {
          DEFAULT: '#0f1117',
          card: '#161b27',
          border: 'rgba(255, 255, 255, 0.06)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
