import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      colors: {
        brand:  "#4f8ef7",
        surface: "#111318",
        elevated: "#181b22",
      },
      borderRadius: {
        DEFAULT: "10px",
        xl: "16px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
