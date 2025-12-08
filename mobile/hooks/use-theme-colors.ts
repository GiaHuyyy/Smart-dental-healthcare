import { useMemo } from "react";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";

/**
 * Hook to get theme colors based on current color scheme
 * Provides dynamic colors for both light and dark modes
 */
export function useThemeColors() {
  const colorScheme = useColorScheme();

  return useMemo(() => {
    const isDark = colorScheme === "dark";

    return {
      isDark,
      // Background colors
      background: isDark ? Colors.dark.background : Colors.light.background,
      surface: isDark ? Colors.dark.surface : Colors.light.surface,
      card: isDark ? Colors.dark.card : Colors.light.card,
      border: isDark ? Colors.dark.border : Colors.light.border,

      // Text colors
      text: {
        primary: isDark ? Colors.dark.text.primary : Colors.light.text.primary,
        secondary: isDark ? Colors.dark.text.secondary : Colors.light.text.secondary,
        tertiary: isDark ? Colors.dark.text.tertiary : Colors.light.text.tertiary,
        inverse: isDark ? Colors.dark.text.inverse : Colors.light.text.inverse,
      },

      // Accent colors
      tint: isDark ? Colors.dark.tint : Colors.light.tint,
      tabIconDefault: isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault,
      tabIconSelected: isDark ? Colors.dark.tabIconSelected : Colors.light.tabIconSelected,

      // Modal overlay
      overlay: isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",

      // Input fields
      inputBackground: isDark ? Colors.gray[800] : Colors.white,
      inputBorder: isDark ? Colors.gray[600] : Colors.gray[200],
      inputText: isDark ? Colors.gray[100] : Colors.gray[900],
      inputPlaceholder: isDark ? Colors.gray[400] : Colors.gray[400],

      // Gradient for pages
      gradientColors: isDark
        ? (["#1f2937", "#111827", "#0a0a0a"] as const)
        : (["#e6f7ff", "#bae7ff", "#ffffff"] as const),
    };
  }, [colorScheme]);
}
