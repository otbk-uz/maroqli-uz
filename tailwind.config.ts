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
        background: "#050507",
        foreground: "#ffffff",
        card: {
          DEFAULT: "#0c0d12",
          foreground: "#ffffff",
          hover: "#12131a",
        },
        primary: {
          DEFAULT: "#FF3355",
          foreground: "#ffffff",
          hover: "#E82746",
        },
        // Ikkilamchi urg'u rangi — neon binafsha (gaming his uchun)
        violet: {
          DEFAULT: "#8B5CF6",
          foreground: "#ffffff",
        },
        cyan: {
          DEFAULT: "#22D3EE",
          foreground: "#04121a",
        },
        secondary: {
          DEFAULT: "#9AA0AC",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#14161d",
          foreground: "#8B929E",
        },
        accent: {
          DEFAULT: "#FF3355",
          foreground: "#ffffff",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        border: "rgba(255,255,255,0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(255,51,85,0.45)",
        "glow-violet": "0 0 40px -10px rgba(139,92,246,0.45)",
        card: "0 8px 30px rgba(0,0,0,0.35)",
        "card-hover": "0 20px 50px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "brand-gradient": "linear-gradient(135deg, #FF3355 0%, #8B5CF6 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(255,51,85,0.15) 0%, rgba(139,92,246,0.15) 100%)",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "gradient-move": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        shake: "shake 0.4s ease-in-out",
        "fade-up": "fade-up 0.5s ease-out both",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "gradient-move": "gradient-move 8s ease infinite",
      },
    },
  },
  plugins: [],
};
export default config;
