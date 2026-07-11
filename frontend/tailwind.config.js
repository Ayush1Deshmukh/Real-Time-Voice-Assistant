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
          300: '#a5b4fc', // indigo-300
          400: '#818cf8', // indigo-400
          500: '#6366f1', // Primary Indigo-500
          600: '#4f46e5', // indigo-600
        },
        surface: {
          DEFAULT: '#0f1117',
          card: '#161b27',
          border: 'rgba(255, 255, 255, 0.06)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
