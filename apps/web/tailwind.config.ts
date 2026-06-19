// Owner: apps/web. Tailwind CSS configuration for the TrackX dashboard.
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f4f5f7",
          border: "#e2e5ea",
        },
        ink: {
          DEFAULT: "#111827",
          muted: "#5b6472",
        },
        accent: {
          DEFAULT: "#2563eb",
          muted: "#dbeafe",
        },
        danger: {
          DEFAULT: "#dc2626",
          muted: "#fee2e2",
        },
        success: {
          DEFAULT: "#059669",
          muted: "#d1fae5",
        },
        warning: {
          DEFAULT: "#d97706",
          muted: "#fef3c7",
        },
      },
    },
  },
  plugins: [],
};

export default config;
