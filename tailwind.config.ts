import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: 'media',
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
  safelist: [
    'dark:bg-gray-800',
    'dark:text-gray-100',
    'dark:hover:bg-gray-700',
    'dark:hover:bg-gray-800',
    'dark:bg-gray-900',
    'dark:bg-blue-900',
    'dark:bg-gray-700',
    'dark:hover:bg-gray-600'
  ]
};
export default config;
