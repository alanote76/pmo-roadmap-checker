/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1D3A',
        slate: '#1E2D4A',
        steel: '#2A3F5F',
        accent: '#00B4D8',
        'accent-light': '#90E0EF',
        success: '#06D6A0',
        warning: '#FFD166',
        danger: '#EF476F',
        muted: '#8899AA',
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
