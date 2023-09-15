/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  important: true,
  darkMode: "class",
  theme: {
    fontSize: {
      'xs': '.65rem',
      'sm': '.775rem',
      'base': '0.65rem', // 16px
      'md': '0.65rem', // 16px
      'lg': '1rem', // 18px
      'xl': '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
    }
  },
  plugins: [],
}

