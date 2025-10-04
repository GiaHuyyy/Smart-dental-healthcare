import { ReactNode } from "react";
import { Text, View } from "react-native";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-white">
      <Text className="text-2xl font-bold text-center">Auth</Text>
      {children}
    </View>
  );
}
