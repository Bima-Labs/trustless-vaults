/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background-light)',
        'background-dark': 'var(--background-dark)',
        foreground: 'var(--text-light)',
        'foreground-dark': 'var(--text-dark)',
        primary: 'var(--primary-light)',
        'primary-dark': 'var(--primary-dark)',
        secondary: 'var(--secondary-light)',
        'secondary-dark': 'var(--secondary-dark)',
        accent: 'var(--accent-light)',
        'accent-dark': 'var(--accent-dark)',
      },
    },
  },
  plugins: [],
}
