import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Eye, EyeOff, Smile, Stethoscope, User } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    KeyboardTypeOptions,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiRequest, formatApiError } from '@/utils/api';

type UserType = 'patient' | 'doctor';

type RegisterResponse = {
  _id: string;
};

type UserTypeOption = {
  type: UserType;
  title: string;
  subtitle: string;
  Icon: typeof User;
};

type GenderOption = {
  value: 'male' | 'female' | 'other';
  label: string;
};

type RegisterFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: GenderOption['value'] | '';
  address: string;
  specialty: string;
  licenseNumber: string;
};

type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  autoComplete?: 'email' | 'name' | 'tel' | 'street-address' | 'birthdate-full' | 'off';
};

const USER_TYPE_OPTIONS: UserTypeOption[] = [
  {
    type: 'patient',
    title: 'Bệnh nhân',
    subtitle: 'Đặt lịch & theo dõi sức khỏe',
    Icon: User,
  },
  {
    type: 'doctor',
    title: 'Bác sĩ',
    subtitle: 'Quản lý bệnh nhân & điều trị',
    Icon: Stethoscope,
  },
];

const GENDER_OPTIONS: GenderOption[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

const INITIAL_FORM_STATE: RegisterFormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  specialty: '',
  licenseNumber: '',
};

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'sentences',
  multiline,
  numberOfLines,
  autoComplete = 'off',
}: InputFieldProps) => (
  <View className="space-y-2">
    <Text className="text-sm font-semibold text-slate-700">{label}</Text>
    <TextInput
      className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 ${
        multiline ? 'min-h-[56px]' : ''
      }`}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      numberOfLines={numberOfLines}
      autoComplete={autoComplete}
    />
  </View>
);

export default function RegisterScreen() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>('patient');
  const [form, setForm] = useState<RegisterFormState>(INITIAL_FORM_STATE);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof RegisterFormState>(field: K, value: RegisterFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.fullName.trim()) {
      return 'Vui lòng nhập họ và tên.';
    }
    if (!form.email.trim()) {
      return 'Vui lòng nhập email.';
    }
    if (!form.phone.trim()) {
      return 'Vui lòng nhập số điện thoại.';
    }
    if (!form.dateOfBirth.trim()) {
      return 'Vui lòng nhập ngày sinh (YYYY-MM-DD).';
    }
    if (!form.gender) {
      return 'Vui lòng chọn giới tính.';
    }
    if (!form.address.trim()) {
      return 'Vui lòng nhập địa chỉ.';
    }
    if (!form.password) {
      return 'Vui lòng nhập mật khẩu.';
    }
    if (form.password.length < 6) {
      return 'Mật khẩu cần ít nhất 6 ký tự.';
    }
    if (form.password !== form.confirmPassword) {
      return 'Mật khẩu xác nhận không khớp.';
    }
    if (userType === 'doctor') {
      if (!form.specialty.trim()) {
        return 'Vui lòng nhập chuyên khoa.';
      }
      if (!form.licenseNumber.trim()) {
        return 'Vui lòng nhập số chứng chỉ hành nghề.';
      }
    }
    return null;
  };

  const handleRegister = async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await apiRequest<RegisterResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          dateOfBirth: form.dateOfBirth.trim(),
          gender: form.gender,
          address: form.address.trim(),
          specialty: userType === 'doctor' ? form.specialty.trim() : undefined,
          licenseNumber: userType === 'doctor' ? form.licenseNumber.trim() : undefined,
          role: userType,
        },
      });

      const registeredId = data?._id;

      Alert.alert(
        'Đăng ký thành công',
        `Vui lòng kiểm tra email để kích hoạt tài khoản trước khi đăng nhập.${
          registeredId ? `\nMã người dùng: ${registeredId}` : ''
        }`,
        [
          {
            text: 'Đăng nhập ngay',
            onPress: () =>
              router.replace({
                pathname: '/(auth)/login' as const,
                params: { email: form.email.trim() },
              }),
          },
        ],
      );
      setForm(INITIAL_FORM_STATE);
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      Alert.alert('Đăng ký thất bại', message);
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
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 items-center">
              <View className="w-full" style={{ maxWidth: 720 }}>
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
                    <Text className="text-center text-2xl font-semibold text-slate-900">Tạo tài khoản mới</Text>
                    <Text className="mt-2 text-center text-base text-slate-500">
                      Điền thông tin để tham gia hệ thống chăm sóc sức khỏe
                    </Text>
                  </View>
                </View>

                <View className="mt-8 space-y-6 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl">
                  <View className="flex-row space-x-4">
                    {USER_TYPE_OPTIONS.map(({ type, title, subtitle, Icon }) => {
                      const isActive = userType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          activeOpacity={0.9}
                          className={`flex-1 rounded-2xl border-2 px-3 py-4 ${
                            isActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                          }`}
                          onPress={() => setUserType(type)}
                        >
                          <View className="items-center">
                            <View
                              className={`mb-2 h-12 w-12 items-center justify-center rounded-xl ${
                                isActive ? 'bg-blue-100' : 'bg-slate-100'
                              }`}
                            >
                              <Icon color={isActive ? '#1d4ed8' : '#475569'} size={28} />
                            </View>
                            <Text className="text-base font-semibold text-slate-900">{title}</Text>
                            <Text className="mt-1 text-center text-xs text-slate-500">{subtitle}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View className="space-y-8 rounded-3xl border border-slate-100 bg-white/90 p-6">
                    {error ? (
                      <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <Text className="text-sm font-medium text-red-600">{error}</Text>
                      </View>
                    ) : null}

                    <View className="space-y-6">
                      <Text className="text-lg font-semibold text-slate-900">Thông tin cơ bản</Text>
                      <View className="space-y-6">
                        <InputField
                          label="Họ và tên *"
                          value={form.fullName}
                          onChangeText={(value) => updateField('fullName', value)}
                          placeholder="Nhập họ và tên đầy đủ"
                          autoCapitalize="words"
                          autoComplete="name"
                        />
                        <InputField
                          label="Email *"
                          value={form.email}
                          onChangeText={(value) => updateField('email', value)}
                          placeholder="Nhập địa chỉ email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                        />
                        <InputField
                          label="Số điện thoại *"
                          value={form.phone}
                          onChangeText={(value) => updateField('phone', value)}
                          placeholder="Nhập số điện thoại"
                          keyboardType="phone-pad"
                          autoComplete="tel"
                        />
                        <InputField
                          label="Ngày sinh (YYYY-MM-DD) *"
                          value={form.dateOfBirth}
                          onChangeText={(value) => updateField('dateOfBirth', value)}
                          placeholder="Ví dụ: 1990-12-31"
                          keyboardType="numbers-and-punctuation"
                          autoCapitalize="none"
                          autoComplete="birthdate-full"
                        />
                        <View>
                          <Text className="mb-2 text-sm font-semibold text-slate-700">Giới tính *</Text>
                          <View className="flex-row space-x-3">
                            {GENDER_OPTIONS.map(({ value, label }) => {
                              const isActive = form.gender === value;
                              return (
                                <TouchableOpacity
                                  key={value}
                                  activeOpacity={0.9}
                                  className={`flex-1 rounded-2xl border px-4 py-3 ${
                                    isActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                                  }`}
                                  onPress={() => updateField('gender', value)}
                                >
                                  <Text className={`text-center font-semibold ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                                    {label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                        <InputField
                          label="Địa chỉ *"
                          value={form.address}
                          onChangeText={(value) => updateField('address', value)}
                          placeholder="Nhập địa chỉ đầy đủ"
                          multiline
                          numberOfLines={3}
                          autoComplete="street-address"
                        />
                      </View>
                    </View>

                    {userType === 'doctor' ? (
                      <View className="space-y-6">
                        <Text className="text-lg font-semibold text-slate-900">Thông tin nghề nghiệp</Text>
                        <View className="space-y-6">
                          <InputField
                            label="Chuyên khoa *"
                            value={form.specialty}
                            onChangeText={(value) => updateField('specialty', value)}
                            placeholder="Ví dụ: Nha khoa tổng quát, Chỉnh hình..."
                            autoCapitalize="sentences"
                          />
                          <InputField
                            label="Số chứng chỉ hành nghề *"
                            value={form.licenseNumber}
                            onChangeText={(value) => updateField('licenseNumber', value)}
                            placeholder="Nhập số chứng chỉ hành nghề"
                            autoCapitalize="characters"
                          />
                        </View>
                      </View>
                    ) : null}

                    <View className="space-y-6">
                      <Text className="text-lg font-semibold text-slate-900">Thông tin bảo mật</Text>
                      <View className="space-y-6">
                        <View>
                          <Text className="mb-2 text-sm font-semibold text-slate-700">Mật khẩu *</Text>
                          <View className="relative">
                            <TextInput
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-base text-slate-900"
                              placeholder="Tối thiểu 6 ký tự"
                              placeholderTextColor="#94a3b8"
                              secureTextEntry={!showPassword}
                              value={form.password}
                              onChangeText={(value) => updateField('password', value)}
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
                        <View>
                          <Text className="mb-2 text-sm font-semibold text-slate-700">Xác nhận mật khẩu *</Text>
                          <View className="relative">
                            <TextInput
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-base text-slate-900"
                              placeholder="Nhập lại mật khẩu"
                              placeholderTextColor="#94a3b8"
                              secureTextEntry={!showConfirmPassword}
                              value={form.confirmPassword}
                              onChangeText={(value) => updateField('confirmPassword', value)}
                              autoCapitalize="none"
                            />
                            <TouchableOpacity
                              className="absolute inset-y-0 right-0 flex items-center justify-center pr-4"
                              onPress={() => setShowConfirmPassword((prev) => !prev)}
                            >
                              {showConfirmPassword ? <EyeOff color="#0369a1" size={22} /> : <Eye color="#64748b" size={22} />}
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      className={`rounded-2xl bg-blue-600 py-4 ${isLoading ? 'opacity-60' : ''}`}
                      disabled={isLoading}
                      onPress={handleRegister}
                    >
                      {isLoading ? (
                        <View className="flex-row items-center justify-center space-x-2">
                          <ActivityIndicator color="#ffffff" />
                          <Text className="text-base font-semibold text-white">Đang xử lý...</Text>
                        </View>
                      ) : (
                        <Text className="text-center text-lg font-semibold text-white">
                          {userType === 'doctor' ? 'Tạo tài khoản Bác sĩ' : 'Tạo tài khoản Bệnh nhân'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <View className="items-center">
                      <Text className="text-sm text-slate-600">
                        Đã có tài khoản?{' '}
                        <Link href="/(auth)/login" className="font-semibold text-blue-600">
                          Đăng nhập ngay
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
