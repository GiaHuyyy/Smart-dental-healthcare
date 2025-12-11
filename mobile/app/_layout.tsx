import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { LogBox } from "react-native";
import "react-native-reanimated";

import IncomingCallModal from "@/components/call/IncomingCallModal";
import { Colors } from "@/constants/colors";
import { AuthProvider } from "@/contexts/auth-context";
import { CallProvider } from "@/contexts/CallContext";
import { ChatProvider } from "@/contexts/chat-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import "../global.css";

function LayoutContent() {
  const colorScheme = useColorScheme();
  const bg = colorScheme === "dark" ? Colors.dark.background : Colors.light.background;

  useEffect(() => {
    // Suppress warnings from third-party dependencies that we can't control
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated", // react-native-webrtc uses deprecated SafeAreaView
      "Attempted to import the module", // event-target-shim package.json exports issue
      'which is not listed in the "exports"', // Metro resolver fallback warning
      "Logs will appear in the browser console", // Web platform log redirection
      "props.pointerEvents is deprecated", // react-native-web internal deprecation warning
    ]);

    // Align system background with app background to avoid black screens
    SystemUI.setBackgroundColorAsync(bg).catch(() => {});
  }, [bg]);

  return (
    <NavThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {/* Ensure iOS/Android system background matches app theme to avoid black flashes */}
      {/** set background color at mount and on theme change **/}
      {(() => {
        // inline IIFE to call effect-like update without changing structure
        // React hook used below to respect rules of hooks
        return null;
      })()}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(doctor)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="call" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} backgroundColor={bg} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <ChatProvider>
            <NotificationProvider>
              <LayoutContent />
              <IncomingCallModal />
            </NotificationProvider>
          </ChatProvider>
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
