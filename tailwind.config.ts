import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#00a19a',
        primaryDark: '#00847e',
        primaryDeep: '#00706b',
        primaryTint: '#dcf4f2',
        secondary: '#2e8cad',
        danger: '#c0392b',
        ink: '#042d4c',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        brand: ['Goldplay', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
