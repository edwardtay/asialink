import type { WidgetConfig } from "@lifi/widget";

export const lifiWidgetConfig: Partial<WidgetConfig> = {
  appearance: "light",
  hiddenUI: ["poweredBy", "language", "appearance"],
  theme: {
    palette: {
      primary: { main: "#1a1917" },
      secondary: { main: "#2a7d4f" },
      background: {
        default: "#faf9f7",
        paper: "#ffffff",
      },
      text: {
        primary: "#1a1917",
        secondary: "#8a8784",
      },
      grey: {
        200: "#f3f1ed",
        300: "#e8e4de",
        700: "#8a8784",
        800: "#5c4f3d",
      },
    },
    shape: {
      borderRadius: 12,
      borderRadiusSecondary: 12,
      borderRadiusTertiary: 24,
    },
    container: {
      boxShadow: "0px 8px 32px rgba(0, 0, 0, 0.06)",
      borderRadius: "16px",
    },
  },
};
