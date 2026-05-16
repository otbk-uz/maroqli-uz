import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#ffffff",
        card: {
          DEFAULT: "#121214",
          foreground: "#ffffff",
        },
        primary: {
          DEFAULT: "#ff2d55",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#a1a1aa",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#1e1e20",
          foreground: "#71717a",
        },
        accent: {
          DEFAULT: "#ff2d55",
          foreground: "#ffffff",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
