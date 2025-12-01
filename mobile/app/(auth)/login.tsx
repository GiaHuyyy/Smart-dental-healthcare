import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Eye, EyeOff, Smile, Stethoscope, User } from 'lucide-react-native';
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

type UserType = 'patient' | 'doctor';

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

  const [userType, setUserType] = useState<UserType>('patient');
  const [email, setEmail] = useState<string>(prefilledEmail);
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    console.log('🔐 Login screen mounted');
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
      console.log('🔐 Attempting login with:', { email, userType });
      const response = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
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
        throw new Error('Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.');
      }

      await setSession({
        user,
        token: accessToken,
      });

      const userName = user.fullName ?? user.email ?? 'bạn';

      Alert.alert('Đăng nhập thành công', `Chào mừng ${userName}!`);
      
      // Navigate based on user role
      if (user.role === 'doctor') {
        router.replace('/(doctor)/home' as any);
      } else {
        router.replace('/(tabs)/dashboard' as any);
      }
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      Alert.alert('Đăng nhập thất bại', message);
    } finally {
      setIsLoading(false);
    }
  };

  console.log('🎨 Login render:', { email, userType, isLoading, hasError: !!error });

  return (
    <LinearGradient 
      colors={['#eff6ff', '#e0f2fe', '#dbeafe']} 
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.select({ ios: 0, android: -200, default: 0 }) ?? 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 items-center">
              <View className="w-full" style={{ maxWidth: 420 }}>
                <View className="items-center">
                  <TouchableOpacity
                    activeOpacity={0.9}
                    className="flex-row items-center"
                    onPress={() => router.push('/(tabs)/dashboard' as const)}
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
                    <Text className="text-center text-2xl font-semibold text-slate-900">Đăng nhập hệ thống</Text>
                    <Text className="mt-2 text-center text-base text-slate-500">
                      Vui lòng chọn loại tài khoản và đăng nhập
                    </Text>
                  </View>
                </View>

                {/* User Type Selection */}
                <View className="mt-6 space-y-4 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl">
                  <View className="flex-row gap-4">
                    {/* Patient Card */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      className={`flex-1 rounded-2xl border-2 p-4 ${
                        userType === 'patient'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => {
                        setUserType('patient');
                        setEmail('');
                        setPassword('');
                      }}
                    >
                      <View className="items-center">
                        <View
                          className={`mb-2 h-12 w-12 items-center justify-center rounded-xl ${
                            userType === 'patient' ? 'bg-blue-100' : 'bg-gray-100'
                          }`}
                        >
                          <User color={userType === 'patient' ? '#1d4ed8' : '#6b7280'} size={24} />
                        </View>
                        <Text className={`font-semibold ${userType === 'patient' ? 'text-blue-700' : 'text-gray-700'}`}>
                          Bệnh nhân
                        </Text>
                        <Text className="mt-1 text-center text-xs text-gray-500">Đặt lịch & theo dõi sức khỏe</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Doctor Card */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      className={`flex-1 rounded-2xl border-2 p-4 ${
                        userType === 'doctor'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => {
                        setUserType('doctor');
                        setEmail('');
                        setPassword('');
                      }}
                    >
                      <View className="items-center">
                        <View
                          className={`mb-2 h-12 w-12 items-center justify-center rounded-xl ${
                            userType === 'doctor' ? 'bg-blue-100' : 'bg-gray-100'
                          }`}
                        >
                          <Stethoscope color={userType === 'doctor' ? '#1d4ed8' : '#6b7280'} size={24} />
                        </View>
                        <Text className={`font-semibold ${userType === 'doctor' ? 'text-blue-700' : 'text-gray-700'}`}>
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
                        <Text className="text-center text-lg font-semibold text-white">
                          Đăng nhập {userType === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân'}
                        </Text>
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
