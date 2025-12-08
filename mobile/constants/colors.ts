/**
 * Design System - Colors
 * Centralized color palette for the mobile app
 */

export const Colors = {
  // Primary Brand Colors - Main color: #00a6f4
  primary: {
    50: "#e6f7ff",
    100: "#bae7ff",
    200: "#91d5ff",
    300: "#69c0ff",
    400: "#40a9ff",
    500: "#00a6f4", // Main brand color
    600: "#0095e0",
    700: "#0080cc",
    800: "#006bb3",
    900: "#005299",
  },

  // Neutral Colors
  gray: {
    50: "#f9fafb", // Background
    100: "#f3f4f6", // Card background light
    200: "#e5e7eb", // Border
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280", // Secondary text
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827", // Primary text
  },

  // Semantic Colors
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
  },

  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
  },

  error: {
    50: "#fef2f2",
    100: "#fee2e2",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
  },

  info: {
    50: "#eff6ff",
    100: "#dbeafe",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
  },

  // Special Colors
  white: "#ffffff",
  black: "#000000",

  // Light Theme
  light: {
    background: "#f9fafb", // gray-50
    surface: "#ffffff", // white
    card: "#ffffff", // white
    border: "#e5e7eb", // gray-200
    text: {
      primary: "#111827", // gray-900
      secondary: "#6b7280", // gray-500
      tertiary: "#9ca3af", // gray-400
      inverse: "#ffffff", // white
    },
    tint: "#00a6f4", // primary-500
    tabIconDefault: "#9ca3af", // gray-400
    tabIconSelected: "#00a6f4", // primary-500
  },

  // Dark Theme
  dark: {
    background: "#111827", // gray-900
    surface: "#1f2937", // gray-800
    card: "#374151", // gray-700
    border: "#4b5563", // gray-600
    text: {
      primary: "#f9fafb", // gray-50
      secondary: "#d1d5db", // gray-300
      tertiary: "#9ca3af", // gray-400
      inverse: "#111827", // gray-900
    },
    tint: "#40a9ff", // primary-400
    tabIconDefault: "#9ca3af", // gray-400
    tabIconSelected: "#40a9ff", // primary-400
  },
};

// Gradient presets
export const Gradients = {
  primary: ["#00a6f4", "#0095e0"],
  primaryLight: ["#e6f7ff", "#bae7ff"],
  success: ["#10b981", "#059669"],
  warning: ["#f59e0b", "#d97706"],
  error: ["#ef4444", "#dc2626"],
  hero: ["#1e40af", "#2563eb", "#3b82f6"],
  sunset: ["#f59e0b", "#ef4444"],
  ocean: ["#06b6d4", "#3b82f6"],
};

export default Colors;
