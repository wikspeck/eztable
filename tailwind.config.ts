import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f3f5f7",
        foreground: "#0f172a",
        card: "#ffffff",
        border: "#e2e8f0",
        primary: {
          DEFAULT: "#1769ff",
          foreground: "#ffffff",
        },
        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#dc2626",
        muted: "#64748b",
      },
      borderRadius: {
        xl: "14px",
      },
      boxShadow: {
        panel: "0 18px 40px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
