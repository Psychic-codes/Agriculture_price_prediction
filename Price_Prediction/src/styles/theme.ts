import type { Theme } from "../types";

export const theme: Theme = {
  colors: {
    primary: "#2E7D32",
    primaryDark: "#1B5E20",
    primaryLight: "#4CAF50",
    primaryMuted: "#e8f5e9",
    secondary: "#F9A825",
    secondaryLight: "#fff8e1",
    secondaryDark: "#F57F17",
    neutral: "#454745",
    neutralLight: "#f4f7f0",
    neutralBorder: "#e0e8d8",
    white: "#ffffff",
    text: {
      primary: "#1a1a1a",
      secondary: "#666666",
      muted: "#999999",
    },
    status: {
      up: "#16a34a",
      down: "#dc2626",
    },
    chart: {
      bar1: "#c8dfc8",
      bar2: "#a0c4a0",
      bar4: "#2E7D32",
      barPredicted: "#F9A825",
    },
  },
  fonts: {
    heading: "'Manrope', sans-serif",
    body: "'Inter', sans-serif",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "20px",
    full: "9999px",
  },
  shadow: {
    card: "0 2px 12px rgba(0,0,0,0.06)",
    elevated: "0 4px 24px rgba(27,94,32,0.15)",
  },
};