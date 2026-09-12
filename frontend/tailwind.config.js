/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        flood: {
          safe: '#10b981',
          watch: '#f59e0b',
          moderate: '#f97316',
          high: '#ef4444',
          critical: '#991b1b',
        }
      }
    },
  },
  plugins: [],
}
