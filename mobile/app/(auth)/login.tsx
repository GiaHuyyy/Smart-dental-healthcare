import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Eye, EyeOff, Smile, User } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest, formatApiError } from '@/utils/api';

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
const PATIENT_ROLE = 'patient' as const;

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const params = useLocalSearchParams<QueryParams>();
  const prefilledEmail = useMemo(() => {
    const value = params?.email;
    if (Array.isArray(value)) {
      return value[0] ?? '';
    }
    return typeof value === 'string' ? value : '';
  }, [params]);

  const [email, setEmail] = useState<string>(prefilledEmail);
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin đăng nhập.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: {
          username: email.trim(),
          email: email.trim(),
          password,
          role: PATIENT_ROLE,
        },
      });

      const user = response.data?.user;
      const accessToken = response.data?.access_token;

      if (!user || !accessToken) {
        throw new Error('Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.');
      }

      await setSession({
        user,
        token: accessToken,
      });

      const userName = user.fullName ?? user.email ?? 'bạn';

      Alert.alert('Đăng nhập thành công', `Chào mừng ${userName}!`);
      router.replace('/(tabs)');
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      Alert.alert('Đăng nhập thất bại', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#eff6ff', '#e0f2fe', '#dbeafe']} className="flex-1">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.select({ ios: 0, android: -200, default: 0 }) ?? 0}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 items-center">
              <View className="w-full" style={{ maxWidth: 420 }}>
                <View className="items-center">
                  <TouchableOpacity
                    activeOpacity={0.9}
                    className="flex-row items-center"
                    onPress={() => router.push('/(tabs)' as const)}
                  >
                    <View className="h-16 w-16 items-center justify-center rounded-3xl bg-blue-500 shadow-lg">
                      <Smile color="#ffffff" size={32} />
                    </View>
                    <View className="ml-4">
                      <Text className="text-2xl font-bold text-slate-900">Smart Dental</Text>
                      <Text className="-mt-1 text-sm text-slate-500">Healthcare Platform</Text>
                    </View>
                  </TouchableOpacity>
                  <View className="mt-8 w-full rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl">
                    <Text className="text-center text-2xl font-semibold text-slate-900">Đăng nhập Bệnh nhân</Text>
                    <Text className="mt-2 text-center text-base text-slate-500">
                      Sử dụng tài khoản bệnh nhân để truy cập hồ sơ và đặt lịch khám
                    </Text>
                  </View>
                </View>

                <View className="mt-8 space-y-6 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl">
                  <View className="items-center space-y-3 rounded-2xl border border-blue-100 bg-blue-50 px-6 py-5">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                      <User color="#1d4ed8" size={28} />
                    </View>
                    <View className="items-center">
                      <Text className="text-base font-semibold text-slate-900">Cổng đăng nhập Bệnh nhân</Text>
                      <Text className="mt-1 text-center text-xs text-slate-500">
                        Dùng để đặt lịch, theo dõi điều trị và trò chuyện với bác sĩ
                      </Text>
                    </View>
                  </View>

                  <View className="rounded-3xl border border-slate-100 bg-white/90 p-6">
                    {error ? (
                      <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <Text className="text-sm font-medium text-red-600">{error}</Text>
                      </View>
                    ) : null}

                    <View className="space-y-6">
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
                        <View className="flex-row items-center space-x-3">
                          <Switch
                            value={rememberMe}
                            onValueChange={setRememberMe}
                            thumbColor={rememberMe ? '#1d4ed8' : undefined}
                            trackColor={{ false: '#cbd5f5', true: '#bfdbfe' }}
                          />
                          <Text className="text-sm font-medium text-slate-700">Ghi nhớ đăng nhập</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() =>
                            Alert.alert(
                              'Quên mật khẩu',
                              'Vui lòng sử dụng tính năng quên mật khẩu trên phiên bản web để đặt lại mật khẩu trong giai đoạn này.',
                            )
                          }
                        >
                          <Text className="text-sm font-semibold text-blue-600">Quên mật khẩu?</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      className={`mt-8 rounded-2xl bg-blue-600 py-4 ${isLoading ? 'opacity-60' : ''}`}
                      disabled={isLoading}
                      onPress={handleLogin}
                    >
                      {isLoading ? (
                        <View className="flex-row items-center justify-center space-x-2">
                          <ActivityIndicator color="#ffffff" />
                          <Text className="text-base font-semibold text-white">Đang đăng nhập...</Text>
                        </View>
                      ) : (
                        <Text className="text-center text-lg font-semibold text-white">Đăng nhập Bệnh nhân</Text>
                      )}
                    </TouchableOpacity>

                    <View className="mt-6 items-center">
                      <Text className="text-sm text-slate-600">
                        Chưa có tài khoản?{' '}
                        <Link href="/(auth)/register" className="font-semibold text-blue-600">
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
