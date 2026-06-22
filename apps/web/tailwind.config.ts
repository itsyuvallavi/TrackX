// Owner: apps/web. Tailwind CSS configuration for the TrackX dashboard.
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f1f3f1",
          rail: "#e4e8e3",
          inverse: "#104f23",
          border: "#d9dfd6",
        },
        ink: {
          DEFAULT: "#111813",
          muted: "#687069",
          soft: "#8b938c",
        },
        accent: {
          DEFAULT: "#a9ef63",
          muted: "#ebffd8",
          dark: "#104f23",
        },
        danger: {
          DEFAULT: "#c64040",
          muted: "#f9e3df",
        },
        success: {
          DEFAULT: "#12662e",
          muted: "#e6f8df",
        },
        warning: {
          DEFAULT: "#b86d14",
          muted: "#fff1cf",
        },
      },
      boxShadow: {
        panel:
          "0 1px 2px rgba(17, 24, 19, 0.06), 0 20px 44px rgba(16, 79, 35, 0.08)",
      },
      transitionTimingFunction: {
        "trackx-out": "cubic-bezier(0.23, 1, 0.32, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
