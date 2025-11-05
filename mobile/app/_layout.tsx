import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

import IncomingCallModal from '@/components/call/IncomingCallModal';
import { AuthProvider } from '@/contexts/auth-context';
import { CallProvider } from '@/contexts/CallContext';
import { ChatProvider } from '@/contexts/chat-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '../global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? '#0a0a0a' : '#ffffff';

  useEffect(() => {
    // Suppress SafeAreaView deprecation warning from dependencies
    // Our code already uses react-native-safe-area-context correctly
    LogBox.ignoreLogs([
      'SafeAreaView has been deprecated',
    ]);

    // Align system background with app background to avoid black screens
    SystemUI.setBackgroundColorAsync(bg).catch(() => {});
  }, [bg]);

  return (
    <AuthProvider>
      <ChatProvider>
        <NotificationProvider>
          <CallProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
              <Stack.Screen name="call" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={bg} />
            <IncomingCallModal />
          </ThemeProvider>
        </CallProvider>
      </NotificationProvider>
    </ChatProvider>
    </AuthProvider>
  );
}
