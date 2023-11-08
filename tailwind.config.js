/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    fontSize: {
      'xs': '.65rem',
      'sm': '.775rem',
      'base': '0.65rem',
      'md': '0.65rem',
      'lg': '1rem',
      'xl': '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    }
  },
  plugins: [],
};