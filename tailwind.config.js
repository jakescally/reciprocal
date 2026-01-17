/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4E0381',
          50: '#F5E6FF',
          100: '#E6C2FF',
          200: '#D19EFF',
          300: '#BC7AFF',
          400: '#A756FF',
          500: '#4E0381',
          600: '#3E0267',
          700: '#2E014D',
          800: '#1E0133',
          900: '#0E0019',
        },
      },
      fontFamily: {
        kadwa: ['Kadwa', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
