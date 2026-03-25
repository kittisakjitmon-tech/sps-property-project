/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Prompt', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand Colors - Editorial Real Estate
        brand: {
          50: '#e6f7f4',
          100: '#b3e6dc',
          200: '#80d5c4',
          300: '#4dc4ac',
          400: '#26b39a',
          500: '#1a9980', // Teal primary
          600: '#005e53', // Main brand
          700: '#004d45',
          800: '#003c36',
          900: '#002b28',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea6d2d', // Main accent (Orange)
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'dropdown': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}