/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kof: {
          red: '#E61D2B',
          'red-dark': '#C01525',
          'red-light': '#FF3340',
          bg: '#F9F6F6',
          'bg-dark': '#EDE8E8',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
