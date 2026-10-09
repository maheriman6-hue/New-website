import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        paper: '#f2eee6',
        red: '#e8261a',
        line: 'rgba(242,238,230,0.14)',
        muted: 'rgba(242,238,230,0.55)',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,0.18)',
      },
      letterSpacing: {
        elite: '0.12em',
      },
    },
  },
  plugins: [],
};

export default config;
