/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "background-primary-dark": "",
        "background-primary-light": "",
        "background-secondary-dark": "",
        "background-secondary-light": "",
        "forground-primary-dark": "",
        "forground-primary-light": "",
        "forground-secondary-dark": "",
        "forground-secondary-light": ""
      },
    },
  },
  plugins: [],
}

