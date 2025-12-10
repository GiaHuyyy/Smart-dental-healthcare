import { useTheme } from "@/contexts/theme-context";

/**
 * Hook to get current color scheme from theme context (web version)
 * Returns 'light' as default if no preference is set
 */
export function useColorScheme() {
  const { colorScheme } = useTheme();
  return colorScheme ?? "light";
}
