import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#132238",
        mist: "#f4efe6",
        coral: "#ff885b",
        mint: "#6ed6b5",
        gold: "#f0c96a",
      },
      boxShadow: {
        card: "0 20px 55px rgba(19, 34, 56, 0.14)",
      },
      animation: {
        pulseGlow: "pulseGlow 1.8s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            boxShadow: "0 0 0 rgba(110, 214, 181, 0.0)",
            transform: "translateY(0px)",
          },
          "50%": {
            boxShadow: "0 0 0 12px rgba(110, 214, 181, 0.12)",
            transform: "translateY(-2px)",
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
