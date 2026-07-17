/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: '#67c9a3',
        coral: '#ff7f6e',
        ink: '#17202a',
      },
      boxShadow: {
        panel: '0 10px 30px rgba(23, 32, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
