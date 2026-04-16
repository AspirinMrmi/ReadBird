import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./manager.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bird: {
          bg: '#000000',
          panel: '#16181c',
          panelAlt: '#1d1f23',
          border: '#2f3336',
          text: '#e7e9ea',
          textMuted: '#71767b',
          accent: '#1d9bf0',
          accentSoft: 'rgba(29,155,240,0.16)',
          success: '#00ba7c',
          warning: '#ffd400',
        },
      },
      boxShadow: {
        bird: '0 16px 40px rgba(0,0,0,0.35)',
      },
      borderRadius: {
        bird: '20px',
      },
    },
  },
  plugins: [],
};

export default config;
