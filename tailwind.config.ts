import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        caribbean: {
          ink: "#eafffb",
          teal: "#14b8a6",
          sea: "#22d3ee",
          coral: "#f9735b",
          mango: "#facc15",
          palm: "#22c55e",
          cloud: "#081311",
          line: "#1f3f3a"
        }
      },
      boxShadow: {
        soft: "0 18px 56px rgba(0, 0, 0, 0.32)"
      },
      borderRadius: {
        card: "18px"
      }
    }
  },
  plugins: []
};

export default config;
