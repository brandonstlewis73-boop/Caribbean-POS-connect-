import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    screens: {
      xs: "380px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px"
    },
    extend: {
      spacing: {
        sidebar: "240px",
        header: "72px",
        "bottom-nav": "76px",
        "safe-bottom": "env(safe-area-inset-bottom)"
      },
      colors: {
        caribbean: {
          ink: "#f2fffc",
          muted: "#9fc2bb",
          teal: "#14b8a6",
          sea: "#22d3ee",
          emerald: "#34d399",
          coral: "#fb7185",
          mango: "#facc15",
          amber: "#f59e0b",
          palm: "#22c55e",
          cloud: "#061816",
          night: "#03100f",
          panel: "rgba(8, 24, 22, 0.78)",
          line: "rgba(148, 163, 184, 0.18)"
        },
        coral: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
          800: "#9f1239",
          900: "#881337"
        }
      },
      boxShadow: {
        soft: "0 18px 58px rgba(0, 0, 0, 0.28)",
        medium: "0 22px 72px rgba(0, 0, 0, 0.36)",
        lg: "0 28px 96px rgba(0, 0, 0, 0.42)",
        glow: "0 18px 54px rgba(20, 184, 166, 0.22)",
        "glow-coral": "0 18px 48px rgba(251, 113, 133, 0.18)"
      },
      borderRadius: {
        card: "16px",
        panel: "22px",
        button: "12px"
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        slideIn: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.78", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.015)" }
        },
        shimmer: {
          from: { backgroundPosition: "0% 50%" },
          to: { backgroundPosition: "100% 50%" }
        }
      },
      animation: {
        "fade-in": "fadeIn 220ms ease-out both",
        "slide-in": "slideIn 260ms ease-out both",
        "pulse-soft": "pulseSoft 2.2s ease-in-out infinite",
        shimmer: "shimmer 2.8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
