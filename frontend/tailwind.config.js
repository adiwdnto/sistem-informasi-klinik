/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: { 50: '#eff6f2', 100: '#dcebe2', 500: '#28745f', 700: '#174d40', 800: '#123c32', 900: '#0c2d26' },
        mint: '#cde9d7',
      },
      boxShadow: { card: '0 12px 35px rgba(20, 54, 45, 0.07)' },
    },
  },
  plugins: [],
};
