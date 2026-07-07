import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-outfit)', 'sans-serif'],
      },
      colors: {
        background: "#030305",
        foreground: "#ffffff",
        card: {
          DEFAULT: "#0b0c10",
          foreground: "#ffffff",
        },
        primary: {
          DEFAULT: "#FF4655", // Valorant-style aggressive red
          foreground: "#ffffff",
          hover: "#E83342",
        },
        secondary: {
          DEFAULT: "#8B929E",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#141519",
          foreground: "#8B929E",
        },
        accent: {
          DEFAULT: "#FF4655",
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
