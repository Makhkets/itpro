import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Montserrat"', "system-ui", "sans-serif"],
        display: ['"Montserrat"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        navy: {
          DEFAULT: "#171F33",
          75: "#515767",
          50: "#8B8F99",
          25: "#C5C7CC",
          950: "#0B1020",
        },
        burgundy: {
          DEFAULT: "#962237",
          dark: "#7A1B2D",
          light: "#F4E8EB",
        },
        accent: {
          red: "#B92034",
          "red-light": "#FBEAEC",
        },
        surface: {
          DEFAULT: "#F7F7F7",
          card: "#FFFFFF",
          subtle: "#FAFAFA",
        },
        success: "#16794C",
        warning: "#B7791F",
        info: "#2563EB",
        border: "#E5E7EB",
        muted: "#6B7280",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 31, 51, 0.04), 0 4px 16px rgba(23, 31, 51, 0.04)",
        "card-hover":
          "0 2px 4px rgba(23, 31, 51, 0.06), 0 12px 28px rgba(23, 31, 51, 0.08)",
        glow: "0 0 0 4px rgba(150, 34, 55, 0.12)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(23,31,51,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(23,31,51,0.04) 1px, transparent 1px)",
        "hero-radial":
          "radial-gradient(60% 80% at 20% 0%, rgba(150,34,55,0.18) 0%, transparent 60%), radial-gradient(50% 60% at 100% 100%, rgba(23,31,51,0.65) 0%, transparent 60%)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
