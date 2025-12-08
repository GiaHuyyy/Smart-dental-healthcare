import { Colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function Index() {
  const { session, isHydrating } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log("🔍 Index screen state:", {
      isHydrating,
      hasSession: !!session,
      role: session?.user?.role,
    });
  }, [isHydrating, session]);

  // Wait for session to load - show loading indicator instead of null
  if (isHydrating) {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.background }}
      >
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={{ marginTop: 16, color: Colors.gray[500] }}>Đang tải...</Text>
      </View>
    );
  }

  // If user is logged in, redirect to appropriate dashboard
  if (session?.token) {
    console.log("✅ Redirecting logged-in user, role:", session.user.role);
    if (session.user.role === "doctor") {
      return <Redirect href="/(doctor)/home" />;
    }
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // If not logged in, redirect to login
  console.log("🔓 Redirecting to login");
  return <Redirect href="/(auth)/login" />;
}
