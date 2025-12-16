/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'status-good': '#3CB371',
        'status-warn': '#F59E0B',
        'status-bad': '#F87171',
        'panel-bg': '#0F172A',
      },
    },
  },
  plugins: [],
};
