import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Camera } from "lucide-react-native";

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={<Image source={require("@/assets/images/partial-react-logo.png")} style={styles.reactLogo} />}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">
          Welcome, cấu hình tạo file màu chủ đạo cho đúng, có cài tailwind với icon rồi!
        </ThemedText>
        <HelloWave />
      </ThemedView>
      {/* Example use tailwind */}
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-extrabold text-blue-500">Example use tailwind!</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-bold text-[#087ea4]">Example use icon</Text>
        <Camera color="#087ea4" size={48} />
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
