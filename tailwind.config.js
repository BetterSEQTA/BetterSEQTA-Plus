/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./interface/index.html",
    "./interface/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    fontSize: {
      "xs": ".65rem",
      "sm": ".775rem",
      "base": "0.65rem",
      "md": "0.65rem",
      "lg": "1rem",
      "xl": "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
      "6xl": "4rem",
      "7xl": "5rem",
      "8xl": "6rem",
      "9xl": "8rem",
      "10xl": "10rem",
      "11xl": "12rem",
      "12xl": "14rem",
      "13xl": "16rem",
      "14xl": "18rem",
    },
    extend: {
      fontFamily: {
        "IconFamily": "IconFamily"
      }
    }
  },
  plugins: [],
};