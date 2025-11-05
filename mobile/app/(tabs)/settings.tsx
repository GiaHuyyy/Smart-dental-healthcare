import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  Languages,
  Lock,
  LogOut,
  Mail,
  Palette,
  ShieldCheck,
  Trash2,
  UserCircle,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EditProfileModal } from '@/components/settings/EditProfileModal';

const SUPPORT_LINK = 'https://smart-dental-healthcare.com/support';
const PRIVACY_LINK = 'https://smart-dental-healthcare.com/privacy';
const TERMS_LINK = 'https://smart-dental-healthcare.com/terms';

function SettingRow({
  icon: Icon,
  title,
  description,
  onPress,
}: {
  icon: typeof UserCircle;
  title: string;
  description?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between rounded-3xl border border-white/70 bg-white/95 p-4 shadow-sm shadow-blue-100"
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View className="flex-row items-center space-x-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
          <Icon color="#1d4ed8" size={22} />
        </View>
        <View>
          <Text className="text-sm font-semibold text-slate-900">{title}</Text>
          {description ? <Text className="mt-1 text-xs text-slate-500">{description}</Text> : null}
        </View>
      </View>
      <ChevronRight color="#94a3b8" size={18} />
    </TouchableOpacity>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  value,
  onValueChange,
}: {
  icon: typeof UserCircle;
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-3xl border border-white/70 bg-white/95 p-4 shadow-sm shadow-blue-100">
      <View className="flex-row items-center space-x-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
          <Icon color="#1d4ed8" size={22} />
        </View>
        <View>
          <Text className="text-sm font-semibold text-slate-900">{title}</Text>
          {description ? <Text className="mt-1 text-xs text-slate-500">{description}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#cbd5f5', true: '#3b82f6' }}
        thumbColor={value ? '#ffffff' : '#f1f5f9'}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { session, clearSession, updateUser } = useAuth();
  const colorScheme = useColorScheme();

  const profile = useMemo(() => session?.user ?? null, [session?.user]);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(colorScheme === 'dark');
  const [selectedLanguage, setSelectedLanguage] = useState('vi');
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const handleLogout = useCallback(() => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản Smart Dental?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, [clearSession, router]);

  const handleUpdateProfile = useCallback(() => {
    setShowEditProfileModal(true);
  }, []);

  const handleChangePassword = useCallback(() => {
    Alert.alert('Đổi mật khẩu', 'Vui lòng truy cập cổng web Smart Dental để đổi mật khẩu an toàn.');
  }, []);

  const handleContactSupport = useCallback(async () => {
    const supported = await Linking.canOpenURL(SUPPORT_LINK);
    if (supported) {
      await Linking.openURL(SUPPORT_LINK);
    } else {
      Alert.alert('Không thể mở liên kết', 'Vui lòng truy cập smart-dental-healthcare.com/support');
    }
  }, []);

  const handleOpenLink = useCallback(async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Không thể mở liên kết', url);
    }
  }, []);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Xóa bộ nhớ cache', 
      'Bạn có chắc muốn xóa bộ nhớ cache? Điều này sẽ đăng xuất bạn khỏi ứng dụng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa cache',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            Alert.alert('Thành công', 'Đã xóa cache và đăng xuất.');
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  }, [clearSession, router]);

  const handleLanguageSelect = useCallback(() => {
    Alert.alert(
      'Chọn ngôn ngữ',
      'Chọn ngôn ngữ hiển thị',
      [
        {
          text: 'Tiếng Việt',
          onPress: () => {
            setSelectedLanguage('vi');
            Alert.alert('Thành công', 'Đã chuyển sang Tiếng Việt');
          },
        },
        {
          text: 'English',
          onPress: () => {
            setSelectedLanguage('en');
            Alert.alert('Success', 'Changed to English (Coming soon)');
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  }, []);

  const handleThemeToggle = useCallback(() => {
    Alert.alert(
      'Chế độ giao diện',
      'Tính năng Dark Mode sẽ sớm được hỗ trợ.',
      [{ text: 'OK' }]
    );
  }, []);

  return (
    <LinearGradient colors={['#eef2ff', '#e0f2fe', '#fff']} className="flex-1">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="space-y-6">
            <View className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-lg shadow-blue-100">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-6">
                  <View className="h-16 w-16 items-center justify-center rounded-3xl bg-blue-600">
                    <UserCircle color="#ffffff" size={36} />
                  </View>
                  <Text className="mt-5 text-2xl font-semibold text-slate-900">
                    {profile?.fullName ?? profile?.email ?? 'Người dùng Smart Dental'}
                  </Text>
                  <Text className="mt-2 text-sm text-slate-600">{profile?.email ?? 'Chưa cập nhật email'}</Text>
                  <Text className="mt-1 text-xs text-slate-400 uppercase tracking-wide">Vai trò: {profile?.role ?? 'Bệnh nhân'}</Text>
                </View>
                <TouchableOpacity
                  className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-2"
                  onPress={handleUpdateProfile}
                >
                  <Text className="text-xs font-semibold text-blue-700">Chỉnh sửa</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="space-y-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giao diện & ngôn ngữ</Text>
              <SettingRow 
                icon={Palette} 
                title="Chế độ giao diện" 
                description={darkMode ? 'Chế độ tối' : 'Chế độ sáng'}
                onPress={handleThemeToggle} 
              />
              <SettingRow 
                icon={Languages} 
                title="Ngôn ngữ" 
                description={selectedLanguage === 'vi' ? 'Tiếng Việt' : 'English'}
                onPress={handleLanguageSelect} 
              />
            </View>

            <View className="space-y-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thông báo & bảo mật</Text>
              <ToggleRow
                icon={Bell}
                title="Thông báo đẩy"
                description="Nhận nhắc lịch hẹn và tái khám"
                value={pushEnabled}
                onValueChange={(value) => {
                  setPushEnabled(value);
                  Alert.alert('Cập nhật thông báo', value ? 'Đã bật nhắc nhở thông báo.' : 'Đã tắt nhắc nhở thông báo.');
                }}
              />
              <ToggleRow
                icon={Mail}
                title="Email cập nhật"
                description="Tin tức và hướng dẫn chăm sóc răng miệng"
                value={emailUpdatesEnabled}
                onValueChange={(value) => {
                  setEmailUpdatesEnabled(value);
                  void updateUser({});
                }}
              />
              <ToggleRow
                icon={ShieldCheck}
                title="Sinh trắc học"
                description="Sử dụng Face ID / vân tay khi đăng nhập"
                value={biometricEnabled}
                onValueChange={(value) => {
                  setBiometricEnabled(value);
                  Alert.alert('Sinh trắc học', value ? 'Tính năng sẽ được kích hoạt khi khả dụng.' : 'Đã tắt sinh trắc học.');
                }}
              />
            </View>

            <View className="space-y-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tài khoản</Text>
              <SettingRow icon={Lock} title="Đổi mật khẩu" description="Bảo vệ tài khoản của bạn" onPress={handleChangePassword} />
            </View>

            <View className="space-y-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hỗ trợ & thông tin</Text>
              <SettingRow icon={HelpCircle} title="Liên hệ hỗ trợ" description="Đội ngũ Smart Dental" onPress={handleContactSupport} />
              <SettingRow icon={ShieldCheck} title="Chính sách bảo mật" onPress={() => handleOpenLink(PRIVACY_LINK)} />
              <SettingRow icon={FileText} title="Điều khoản dịch vụ" onPress={() => handleOpenLink(TERMS_LINK)} />
            </View>

            <View className="space-y-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dữ liệu & lưu trữ</Text>
              <SettingRow 
                icon={Trash2} 
                title="Xóa bộ nhớ cache" 
                description="Giải phóng dung lượng lưu trữ"
                onPress={handleClearCache} 
              />
            </View>

            <TouchableOpacity
              className="mt-2 flex-row items-center justify-center rounded-3xl border border-red-200 bg-red-50 py-4"
              activeOpacity={0.7}
              onPress={handleLogout}
            >
              <LogOut color="#b91c1c" size={20} />
              <Text className="ml-2 text-base font-semibold text-red-700">Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Edit Profile Modal */}
        <EditProfileModal
          visible={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
