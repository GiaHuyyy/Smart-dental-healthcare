import { LinearGradient } from "expo-linear-gradient";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Eye, EyeOff, Smile, Stethoscope, User } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Gradients } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, formatApiError } from "@/utils/api";

type LoginResponse = {
  user: {
    _id: string;
    email: string;
    fullName?: string;
    role: string;
  };
  access_token: string;
};

type QueryParams = {
  email?: string | string[];
};

type UserType = "patient" | "doctor";

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const params = useLocalSearchParams<QueryParams>();
  const prefilledEmail = useMemo(() => {
    const value = params?.email;
    if (Array.isArray(value)) {
      return value[0] ?? "";
    }
    return typeof value === "string" ? value : "";
  }, [params]);

  const [userType, setUserType] = useState<UserType>("patient");
  const [email, setEmail] = useState<string>(prefilledEmail);
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    console.log("🔐 Login screen mounted");
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin đăng nhập.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🔐 Attempting login with:", { email, userType });
      const response = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: {
          username: email.trim(),
          email: email.trim(),
          password,
          role: userType,
        },
      });

      const user = response.data?.user;
      const accessToken = response.data?.access_token;

      if (!user || !accessToken) {
        throw new Error("Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.");
      }

      await setSession({
        user,
        token: accessToken,
      });

      const userName = user.fullName ?? user.email ?? "bạn";

      Alert.alert("Đăng nhập thành công", `Chào mừng ${userName}!`);

      // Navigate based on user role
      if (user.role === "doctor") {
        router.replace("/(doctor)/home" as any);
      } else {
        router.replace("/(tabs)/dashboard" as any);
      }
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      Alert.alert("Đăng nhập thất bại", message);
    } finally {
      setIsLoading(false);
    }
  };

  console.log("🎨 Login render:", { email, userType, isLoading, hasError: !!error });

  return (
    <LinearGradient colors={[Colors.primary[50], Colors.primary[100], Colors.primary[50]]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.select({ ios: 0, android: -200, default: 0 }) ?? 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 items-center pt-4">
              <View className="w-full" style={{ maxWidth: 420 }}>
                <View className="items-center">
                  <TouchableOpacity
                    activeOpacity={0.9}
                    className="flex-row items-center"
                    onPress={() => router.push("/(tabs)/dashboard" as const)}
                  >
                    <View className="h-16 w-16 items-center justify-center rounded-3xl bg-[#00a6f4] shadow-lg">
                      <Image
                        source={require("../../assets/images/tooth.png")}
                        className="h-8 w-8"
                        resizeMode="contain"
                      />
                    </View>

                    <View className="ml-4">
                      <Text className="text-2xl font-bold text-slate-900">Smart Dental</Text>
                      <Text className="-mt-1 text-sm text-slate-500">Healthcare Platform</Text>
                    </View>
                  </TouchableOpacity>
                  <View className="mt-8 w-full rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl">
                    <Text className="text-center text-2xl font-semibold text-slate-900">Đăng nhập hệ thống</Text>
                    <Text className="mt-2 text-center text-base text-slate-500">
                      Vui lòng chọn loại tài khoản và đăng nhập
                    </Text>
                  </View>
                </View>

                {/* User Type Selection */}
                <View className="mt-6 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl" style={{ gap: 16 }}>
                  <View className="flex-row" style={{ gap: 16 }}>
                    {/* Patient Card */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        borderWidth: 2,
                        padding: 16,
                        borderColor: userType === "patient" ? Colors.primary[500] : Colors.gray[200],
                        backgroundColor: userType === "patient" ? Colors.primary[50] : Colors.white,
                      }}
                      onPress={() => {
                        setUserType("patient");
                        setError(null);
                      }}
                    >
                      <View className="items-center">
                        <View
                          style={{
                            marginBottom: 8,
                            height: 48,
                            width: 48,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 12,
                            backgroundColor: userType === "patient" ? Colors.primary[100] : Colors.gray[100],
                          }}
                        >
                          <User color={userType === "patient" ? Colors.primary[600] : Colors.gray[500]} size={24} />
                        </View>
                        <Text
                          style={{
                            fontWeight: "600",
                            color: userType === "patient" ? Colors.primary[600] : Colors.gray[700],
                          }}
                        >
                          Bệnh nhân
                        </Text>
                        <Text className="mt-1 text-center text-xs text-gray-500">Đặt lịch & theo dõi sức khỏe</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Doctor Card */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        borderWidth: 2,
                        padding: 16,
                        borderColor: userType === "doctor" ? Colors.primary[500] : Colors.gray[200],
                        backgroundColor: userType === "doctor" ? Colors.primary[50] : Colors.white,
                      }}
                      onPress={() => {
                        setUserType("doctor");
                        setError(null);
                      }}
                    >
                      <View className="items-center">
                        <View
                          style={{
                            marginBottom: 8,
                            height: 48,
                            width: 48,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 12,
                            backgroundColor: userType === "doctor" ? Colors.primary[100] : Colors.gray[100],
                          }}
                        >
                          <Stethoscope
                            color={userType === "doctor" ? Colors.primary[600] : Colors.gray[500]}
                            size={24}
                          />
                        </View>
                        <Text
                          style={{
                            fontWeight: "600",
                            color: userType === "doctor" ? Colors.primary[600] : Colors.gray[700],
                          }}
                        >
                          Bác sĩ
                        </Text>
                        <Text className="mt-1 text-center text-xs text-gray-500">Quản lý bệnh nhân & điều trị</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Login Form */}
                  <View className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
                    {error ? (
                      <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <Text className="text-sm font-medium text-red-600">{error}</Text>
                      </View>
                    ) : null}

                    <View style={{ gap: 24 }}>
                      <View>
                        <Text className="mb-2 text-sm font-semibold text-slate-700">Địa chỉ email</Text>
                        <TextInput
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                          placeholder="Nhập địa chỉ email của bạn"
                          placeholderTextColor="#94a3b8"
                          autoCapitalize="none"
                          autoComplete="email"
                          keyboardType="email-address"
                          value={email}
                          onChangeText={setEmail}
                        />
                      </View>

                      <View>
                        <Text className="mb-2 text-sm font-semibold text-slate-700">Mật khẩu</Text>
                        <View className="relative">
                          <TextInput
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-base text-slate-900"
                            placeholder="Nhập mật khẩu của bạn"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize="none"
                          />
                          <TouchableOpacity
                            className="absolute inset-y-0 right-0 flex items-center justify-center pr-4"
                            onPress={() => setShowPassword((prev) => !prev)}
                          >
                            {showPassword ? <EyeOff color="#0369a1" size={22} /> : <Eye color="#64748b" size={22} />}
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center" style={{ gap: 12 }}>
                          <Switch
                            value={rememberMe}
                            onValueChange={setRememberMe}
                            thumbColor={rememberMe ? "#00a6f4" : "#f1f5f9"}
                            trackColor={{ false: "#cbd5f5", true: "#7dd3fc" }}
                          />
                          <Text className="text-sm font-medium text-slate-700">Ghi nhớ đăng nhập</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() =>
                            Alert.alert(
                              "Quên mật khẩu",
                              "Vui lòng sử dụng tính năng quên mật khẩu trên phiên bản web để đặt lại mật khẩu trong giai đoạn này."
                            )
                          }
                        >
                          <Text className="text-sm font-semibold text-[#00a6f4]">Quên mật khẩu?</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      className="mt-8 rounded-2xl bg-[#00a6f4] py-4"
                      style={{ opacity: isLoading ? 0.6 : 1 }}
                      disabled={isLoading}
                      onPress={handleLogin}
                    >
                      {isLoading ? (
                        <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
                          <ActivityIndicator color="#ffffff" />
                          <Text className="text-base font-semibold text-white">Đang đăng nhập...</Text>
                        </View>
                      ) : (
                        <Text className="text-center text-lg font-semibold text-white">
                          Đăng nhập {userType === "doctor" ? "Bác sĩ" : "Bệnh nhân"}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <View className="mt-6 items-center">
                      <Text className="text-sm text-slate-600">
                        Chưa có tài khoản?{" "}
                        <Link href="/(auth)/register" className="font-semibold text-[#00a6f4]">
                          Đăng ký ngay
                        </Link>
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
