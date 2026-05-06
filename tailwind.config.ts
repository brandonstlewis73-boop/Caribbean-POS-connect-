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
          ink: "#13201f",
          teal: "#087e7a",
          sea: "#14b8a6",
          coral: "#f9735b",
          mango: "#f6b53f",
          palm: "#1f9d66",
          cloud: "#f7fbfb",
          line: "#d8e7e5"
        }
      },
      boxShadow: {
        soft: "0 12px 32px rgba(19, 32, 31, 0.08)"
      },
      borderRadius: {
        card: "8px"
      }
    }
  },
  plugins: []
};

export default config;
