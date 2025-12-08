import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Platform, ScrollView, Switch, Text, TouchableOpacity, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EditProfileModal } from "@/components/settings/EditProfileModal";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";

const SUPPORT_LINK = "https://smart-dental-healthcare.com/support";
const PRIVACY_LINK = "https://smart-dental-healthcare.com/privacy";
const TERMS_LINK = "https://smart-dental-healthcare.com/terms";

function SettingRow({
  icon,
  title,
  description,
  onPress,
  showChevron = true,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress?: () => void;
  showChevron?: boolean;
  theme: {
    surface: string;
    text: {
      primary: string;
      secondary: string;
    };
  };
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between rounded-2xl border p-4"
      style={{ borderColor: Colors.primary[100], backgroundColor: theme.surface }}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className="flex-row items-center flex-1">
        <View
          className="h-11 w-11 items-center justify-center rounded-xl mr-3"
          style={{ backgroundColor: Colors.primary[50] }}
        >
          <Ionicons name={icon} color={Colors.primary[600]} size={20} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
            {title}
          </Text>
          {description ? (
            <Text className="mt-0.5 text-xs" style={{ color: theme.text.secondary }}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      {showChevron && <Ionicons name="chevron-forward" color={Colors.gray[400]} size={18} />}
    </TouchableOpacity>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  theme: {
    surface: string;
    text: {
      primary: string;
      secondary: string;
    };
  };
}) {
  return (
    <View
      className="flex-row items-center justify-between rounded-2xl border p-4"
      style={{ borderColor: Colors.primary[100], backgroundColor: theme.surface }}
    >
      <View className="flex-row items-center flex-1">
        <View
          className="h-11 w-11 items-center justify-center rounded-xl mr-3"
          style={{ backgroundColor: Colors.primary[50] }}
        >
          <Ionicons name={icon} color={Colors.primary[600]} size={20} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
            {title}
          </Text>
          {description ? (
            <Text className="mt-0.5 text-xs" style={{ color: theme.text.secondary }}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.gray[300], true: Colors.primary[400] }}
        thumbColor={value ? Colors.primary[600] : "#f4f3f4"}
        ios_backgroundColor={Colors.gray[300]}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { session, logout, updateUser, clearSession } = useAuth();
  const { colorScheme, toggleColorScheme } = useTheme();

  const profile = useMemo(() => session?.user ?? null, [session?.user]);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("vi");
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Dynamic theme based on colorScheme
  const theme = useMemo(() => {
    if (colorScheme === "dark") {
      return {
        surface: Colors.dark.surface,
        border: Colors.dark.border,
        text: {
          primary: Colors.dark.text.primary,
          secondary: Colors.dark.text.secondary,
        },
        background: Colors.dark.background,
      };
    }
    return {
      surface: Colors.light.surface,
      border: Colors.light.border,
      text: {
        primary: Colors.light.text.primary,
        secondary: Colors.light.text.secondary,
      },
      background: Colors.light.background,
    };
  }, [colorScheme]);

  console.log("⚙️ Settings screen render:", { hasProfile: !!profile, email: profile?.email });

  const handleLogout = useCallback(async () => {
    console.log("handleLogout called");

    const confirmed =
      Platform.OS === "web"
        ? window.confirm("Bạn có chắc muốn đăng xuất khỏi tài khoản Smart Dental?")
        : await new Promise((resolve) => {
            Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất khỏi tài khoản Smart Dental?", [
              { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
              { text: "Đăng xuất", style: "destructive", onPress: () => resolve(true) },
            ]);
          });

    if (!confirmed) {
      console.log("Logout cancelled");
      return;
    }

    try {
      console.log("Logout button pressed");
      await logout();
      console.log("Logout successful, navigating...");
      // Clear navigation stack and force redirect
      if (Platform.OS === "web") {
        window.location.href = "/";
      } else {
        router.dismissAll();
        router.replace("/");
      }
      console.log("Navigation called");
    } catch (error) {
      console.error("Logout error:", error);
      if (Platform.OS === "web") {
        window.alert("Không thể đăng xuất. Vui lòng thử lại.");
      } else {
        Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
      }
    }
  }, [logout, router]);

  const handleUpdateProfile = useCallback(() => {
    setShowEditProfileModal(true);
  }, []);

  const handleChangePassword = useCallback(() => {
    Alert.alert("Đổi mật khẩu", "Vui lòng truy cập cổng web Smart Dental để đổi mật khẩu an toàn.");
  }, []);

  const handleContactSupport = useCallback(async () => {
    const supported = await Linking.canOpenURL(SUPPORT_LINK);
    if (supported) {
      await Linking.openURL(SUPPORT_LINK);
    } else {
      Alert.alert("Không thể mở liên kết", "Vui lòng truy cập smart-dental-healthcare.com/support");
    }
  }, []);

  const handleOpenLink = useCallback(async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Không thể mở liên kết", url);
    }
  }, []);

  const handleClearCache = useCallback(() => {
    Alert.alert("Xóa bộ nhớ cache", "Bạn có chắc muốn xóa bộ nhớ cache? Điều này sẽ đăng xuất bạn khỏi ứng dụng.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa cache",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          Alert.alert("Thành công", "Đã xóa cache và đăng xuất.");
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [clearSession, router]);

  const handleLanguageSelect = useCallback(() => {
    Alert.alert("Chọn ngôn ngữ", "Chọn ngôn ngữ hiển thị", [
      {
        text: "Tiếng Việt",
        onPress: () => {
          setSelectedLanguage("vi");
          Alert.alert("Thành công", "Đã chuyển sang Tiếng Việt");
        },
      },
      {
        text: "English",
        onPress: () => {
          setSelectedLanguage("en");
          Alert.alert("Success", "Changed to English (Coming soon)");
        },
      },
      { text: "Hủy", style: "cancel" },
    ]);
  }, []);

  const handleThemeToggle = useCallback(async () => {
    await toggleColorScheme();
    const newMode = colorScheme === "dark" ? "Chế độ sáng" : "Chế độ tối";
    Alert.alert("Thay đổi giao diện", `Đã chuyển sang ${newMode}`);
  }, [toggleColorScheme, colorScheme]);

  return (
    <LinearGradient
      colors={colorScheme === "dark" ? ["#1f2937", "#111827", "#0a0a0a"] : ["#f0f9ff", "#e0f2fe", "#fff"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View
            className="rounded-3xl border p-6 mb-6"
            style={{ borderColor: Colors.primary[100], backgroundColor: theme.surface }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-4">
                  <View
                    className="h-16 w-16 justify-center rounded-full mr-4"
                  >
                    <Image
                      source={{ uri: profile?.avatarUrl }}
                      className="w-full h-full rounded-full"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                      {profile?.fullName ?? "Người dùng"}
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                      {profile?.email ?? "Chưa cập nhật email"}
                    </Text>
                    <View
                      className="mt-1 rounded-full px-2 py-0.5 self-start"
                      style={{ backgroundColor: Colors.primary[50] }}
                    >
                      <Text className="text-[10px] font-semibold uppercase" style={{ color: Colors.primary[700] }}>
                        {profile?.role ?? "Bệnh nhân"}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  className="rounded-xl py-2.5 items-center"
                  style={{ backgroundColor: Colors.primary[600] }}
                  onPress={handleUpdateProfile}
                >
                  <Text className="text-sm font-semibold text-white">Chỉnh sửa hồ sơ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Settings Sections */}
          <View style={{ gap: 24 }}>
            {/* Giao diện & ngôn ngữ */}
            <View>
              <Text
                className="text-xs font-bold uppercase mb-3 px-1"
                style={{ color: theme.text.secondary, letterSpacing: 0.5 }}
              >
                Giao diện & Ngôn ngữ
              </Text>
              <View style={{ gap: 12 }}>
                <SettingRow
                  icon="color-palette-outline"
                  title="Chế độ giao diện"
                  description={colorScheme === "dark" ? "Chế độ tối" : "Chế độ sáng"}
                  onPress={handleThemeToggle}
                  theme={theme}
                />
                <SettingRow
                  icon="language-outline"
                  title="Ngôn ngữ"
                  description={selectedLanguage === "vi" ? "Tiếng Việt" : "English"}
                  onPress={handleLanguageSelect}
                  theme={theme}
                />
              </View>
            </View>

            {/* Thông báo & Bảo mật */}
            <View>
              <Text
                className="text-xs font-bold uppercase mb-3 px-1"
                style={{ color: theme.text.secondary, letterSpacing: 0.5 }}
              >
                Thông báo & Bảo mật
              </Text>
              <View style={{ gap: 12 }}>
                <ToggleRow
                  icon="notifications-outline"
                  title="Thông báo đẩy"
                  description="Nhận nhắc lịch hẹn và tái khám"
                  value={pushEnabled}
                  onValueChange={(value) => {
                    setPushEnabled(value);
                    Alert.alert("Cập nhật thông báo", value ? "Đã bật thông báo đẩy" : "Đã tắt thông báo đẩy");
                  }}
                  theme={theme}
                />
                <ToggleRow
                  icon="mail-outline"
                  title="Email cập nhật"
                  description="Tin tức và hướng dẫn chăm sóc"
                  value={emailUpdatesEnabled}
                  onValueChange={(value) => {
                    setEmailUpdatesEnabled(value);
                    void updateUser({});
                  }}
                  theme={theme}
                />
                <ToggleRow
                  icon="finger-print-outline"
                  title="Sinh trắc học"
                  description="Face ID / Vân tay khi đăng nhập"
                  value={biometricEnabled}
                  onValueChange={(value) => {
                    setBiometricEnabled(value);
                    Alert.alert("Sinh trắc học", value ? "Tính năng sẽ được kích hoạt" : "Đã tắt sinh trắc học");
                  }}
                  theme={theme}
                />
              </View>
            </View>

            {/* Tài khoản */}
            <View>
              <Text
                className="text-xs font-bold uppercase mb-3 px-1"
                style={{ color: theme.text.secondary, letterSpacing: 0.5 }}
              >
                Tài khoản
              </Text>
              <View style={{ gap: 12 }}>
                <SettingRow
                  icon="lock-closed-outline"
                  title="Đổi mật khẩu"
                  description="Bảo vệ tài khoản của bạn"
                  onPress={handleChangePassword}
                  theme={theme}
                />
              </View>
            </View>

            {/* Hỗ trợ & Thông tin */}
            <View>
              <Text
                className="text-xs font-bold uppercase mb-3 px-1"
                style={{ color: theme.text.secondary, letterSpacing: 0.5 }}
              >
                Hỗ trợ & Thông tin
              </Text>
              <View style={{ gap: 12 }}>
                <SettingRow
                  icon="help-circle-outline"
                  title="Liên hệ hỗ trợ"
                  description="Đội ngũ Smart Dental"
                  onPress={handleContactSupport}
                  theme={theme}
                />
                <SettingRow
                  icon="shield-checkmark-outline"
                  title="Chính sách bảo mật"
                  onPress={() => handleOpenLink(PRIVACY_LINK)}
                  theme={theme}
                />
                <SettingRow
                  icon="document-text-outline"
                  title="Điều khoản dịch vụ"
                  onPress={() => handleOpenLink(TERMS_LINK)}
                  theme={theme}
                />
              </View>
            </View>

            {/* Dữ liệu & Lưu trữ */}
            <View>
              <Text
                className="text-xs font-bold uppercase mb-3 px-1"
                style={{ color: theme.text.secondary, letterSpacing: 0.5 }}
              >
                Dữ liệu & Lưu trữ
              </Text>
              <View style={{ gap: 12 }}>
                <SettingRow
                  icon="trash-outline"
                  title="Xóa bộ nhớ cache"
                  description="Giải phóng dung lượng"
                  onPress={handleClearCache}
                  theme={theme}
                />
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-2xl py-4 mt-2"
              style={{ backgroundColor: Colors.error[50], borderWidth: 1, borderColor: Colors.error[200] }}
              activeOpacity={0.7}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" color={Colors.error[700]} size={20} />
              <Text className="ml-2 text-base font-bold" style={{ color: Colors.error[700] }}>
                Đăng xuất
              </Text>
            </TouchableOpacity>

            {/* App Version */}
            <View className="items-center py-4">
              <Text className="text-xs" style={{ color: theme.text.secondary }}>
                Smart Dental Healthcare
              </Text>
              <Text className="text-xs mt-1" style={{ color: theme.text.secondary }}>
                Phiên bản 1.0.0
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Edit Profile Modal */}
        <EditProfileModal visible={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
      </SafeAreaView>
    </LinearGradient>
  );
}
