import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f4f9",
          100: "#d9e2ee",
          200: "#b4c7dc",
          300: "#85a5c6",
          400: "#5880ad",
          500: "#3d6493",
          600: "#2f4f78",
          700: "#254062",
          800: "#1a2f50",
          850: "#14243e",
          900: "#183153", // Primary Dark Navy
          950: "#0e1e33",
        },
        gold: {
          50: "#fffdf5",
          100: "#fef9e7",
          200: "#fdf0be",
          300: "#fae28b",
          400: "#f6d054",
          500: "#d4af37", // Competition Gold
          600: "#b58f22",
          700: "#8e6d18",
          800: "#735619",
          900: "#604719",
          950: "#382709",
        },
        brand: {
          blue: "#183153",
          green: "#168B46",
          red: "#D62828",
        },
        editorial: {
          navy: "#183153",
          deep: "#20252B",
          muted: "#737B85",
          light: "#F7F8FA",
          border: "#E6E9EE",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        heading: ["var(--font-heading)", "Manrope", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-heading)", "Manrope", "Georgia", "serif"],
        display: ["var(--font-heading)", "Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "subtle": "0 1px 2px 0 rgba(24, 49, 83, 0.04)",
        "card": "0 1px 3px 0 rgba(24, 49, 83, 0.05), 0 1px 2px -1px rgba(24, 49, 83, 0.05)",
        "card-hover": "0 4px 12px -2px rgba(24, 49, 83, 0.08)",
        "elevated": "0 10px 25px -5px rgba(24, 49, 83, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
