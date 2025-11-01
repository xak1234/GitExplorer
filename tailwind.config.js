/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gray-900': '#010409',
        'gray-800': '#0d1117',
        'gray-700': '#161b22',
        'gray-600': '#21262d',
        'gray-500': '#8b949e',
        'gray-400': '#8b949e',
        'gray-300': '#c9d1d9',
        'gray-200': '#f0f6fc',
        'blue-accent': '#58a6ff',
        'green-accent': '#3fb950',
        'yellow-accent': '#d29922',
        'red-accent': '#f85149',
      },
    },
  },
  plugins: [],
}
