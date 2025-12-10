import AsyncStorage from "@react-native-async-storage/async-storage";
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { ColorSchemeName } from "react-native";

const THEME_STORAGE_KEY = "smartdental_theme_preference";

type ThemeContextValue = {
  colorScheme: ColorSchemeName;
  setColorScheme: (scheme: ColorSchemeName) => Promise<void>;
  toggleColorScheme: () => Promise<void>;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: "light",
  setColorScheme: async () => {},
  toggleColorScheme: async () => {},
  isLoading: false,
});

export function ThemeProvider({ children }: PropsWithChildren) {
  const [colorScheme, setColorSchemeState] = useState<ColorSchemeName>("light");
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from storage on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        console.log("🎨 Theme: Loading stored preference...");
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        if (stored && isMounted) {
          const theme = stored as ColorSchemeName;
          console.log("🎨 Theme: Loaded preference:", theme);
          setColorSchemeState(theme);
        } else {
          console.log("🎨 Theme: No stored preference, using default (light)");
          // Default to light mode
          setColorSchemeState("light");
        }
      } catch (error) {
        console.warn("⚠️ Theme: Could not load stored preference", error);
        setColorSchemeState("light");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setColorScheme = async (scheme: ColorSchemeName) => {
    try {
      console.log("🎨 Theme: Saving preference:", scheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme || "light");
      setColorSchemeState(scheme);
    } catch (error) {
      console.error("❌ Theme: Could not save preference", error);
    }
  };

  const toggleColorScheme = async () => {
    const newScheme = colorScheme === "dark" ? "light" : "dark";
    await setColorScheme(newScheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        setColorScheme,
        toggleColorScheme,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
