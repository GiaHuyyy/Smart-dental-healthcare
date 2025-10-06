import { LinearGradient } from 'expo-linear-gradient';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Eye,
  FileText,
  Heart,
  MessageSquare,
  Phone,
  Stethoscope,
  Thermometer,
  TrendingUp,
} from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StatusVariant = 'normal' | 'info' | 'attention';

type KpiCardData = {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  badge?: string;
  accent: {
    background: string;
    color: string;
  };
  Icon: typeof Calendar;
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  status: StatusVariant;
  Icon: typeof Calendar;
};

type Reminder = {
  id: string;
  title: string;
  subtitle: string;
};

type HealthMetric = {
  id: string;
  label: string;
  value: string;
  Icon: typeof Heart;
};

type Trend = {
  id: string;
  label: string;
  value: number;
  trend: string;
};

const STATUS_COLORS: Record<StatusVariant, { text: string; background: string }> = {
  normal: { text: '#047857', background: '#D1FAE5' },
  info: { text: '#1d4ed8', background: '#dbeafe' },
  attention: { text: '#b45309', background: '#fef3c7' },
};

const KPI_CARDS: KpiCardData[] = [
  {
    id: 'next-appointment',
    title: 'Lịch hẹn tiếp theo',
    value: '15/01/2024',
    subtitle: '09:00 • BS. Nguyễn Thị B',
    badge: 'Khám định kỳ',
    accent: { background: '#dbeafe', color: '#1d4ed8' },
    Icon: Calendar,
  },
  {
    id: 'completed-visits',
    title: 'Lần khám hoàn thành',
    value: '12',
    subtitle: '+2 tháng này',
    accent: { background: '#dcfce7', color: '#047857' },
    Icon: Check,
  },
  {
    id: 'follow-up',
    title: 'Cần theo dõi',
    value: '2',
    subtitle: 'Yêu cầu tái khám',
    accent: { background: '#fef3c7', color: '#b45309' },
    Icon: AlertTriangle,
  },
  {
    id: 'oral-health',
    title: 'Sức khỏe răng miệng',
    value: '74%',
    subtitle: 'Tình trạng tốt',
    accent: { background: '#fee2e2', color: '#be123c' },
    Icon: Heart,
  },
];

const ACTIVITIES: ActivityItem[] = [
  {
    id: 'activity-1',
    title: 'Khám định kỳ hoàn thành',
    subtitle: '15/01/2024 — BS. Nguyễn Thị B',
    status: 'normal',
    Icon: Check,
  },
  {
    id: 'activity-2',
    title: 'Tẩy trắng răng được lên lịch',
    subtitle: '20/01/2024 — Chờ xác nhận',
    status: 'info',
    Icon: Clock,
  },
  {
    id: 'activity-3',
    title: 'Kết quả X-quang đã sẵn sàng',
    subtitle: '12/01/2024 — Xem kết quả',
    status: 'attention',
    Icon: FileText,
  },
];

const HEALTH_METRICS: HealthMetric[] = [
  {
    id: 'temperature',
    label: 'Nhiệt độ',
    value: '36.5°C',
    Icon: Thermometer,
  },
  {
    id: 'heart-rate',
    label: 'Nhịp tim',
    value: '72 BPM',
    Icon: Heart,
  },
  {
    id: 'spo2',
    label: 'SpO₂',
    value: '95%',
    Icon: Eye,
  },
];

const REMINDERS: Reminder[] = [
  {
    id: 'reminder-1',
    title: 'Đánh răng sau bữa ăn',
    subtitle: 'Đã 3 giờ kể từ bữa trưa',
  },
  {
    id: 'reminder-2',
    title: 'Uống thuốc kháng sinh',
    subtitle: 'Đã hoàn thành hôm nay',
  },
  {
    id: 'reminder-3',
    title: 'Tái khám định kỳ',
    subtitle: 'Còn 5 ngày nữa',
  },
];

const TRENDS: Trend[] = [
  {
    id: 'trend-1',
    label: 'Vệ sinh răng miệng',
    value: 85,
    trend: '+5%',
  },
  {
    id: 'trend-2',
    label: 'Tuân thủ điều trị',
    value: 92,
    trend: '+2%',
  },
];

function StatusPill({ label, status }: { label: string; status: StatusVariant }) {
  const colors = STATUS_COLORS[status];
  return (
    <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: colors.background }}>
      <Text className="text-xs font-semibold" style={{ color: colors.text }}>
        {label}
      </Text>
    </View>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <View className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </View>
  );
}

function KpiCard({ card }: { card: KpiCardData }) {
  const { Icon } = card;
  return (
    <View className="flex-1 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-lg shadow-blue-100">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: card.accent.background }}>
          <Icon color={card.accent.color} size={24} />
        </View>
        <View>
          <Text className="text-sm font-semibold text-slate-600">{card.title}</Text>
          <Text className="text-xl font-bold text-slate-900">{card.value}</Text>
        </View>
      </View>
      {card.subtitle ? <Text className="mt-3 text-sm text-slate-500">{card.subtitle}</Text> : null}
      {card.badge ? (
        <View className="mt-3 self-start rounded-full px-3 py-1" style={{ backgroundColor: card.accent.background }}>
          <Text className="text-xs font-semibold" style={{ color: card.accent.color }}>
            {card.badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function PatientDashboardScreen() {
  return (
    <LinearGradient colors={['#eff6ff', '#e0f2fe', '#fff']} className="flex-1">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="space-y-6">
            <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: '#1d4ed8' }}>
                    <Heart color="#ffffff" size={28} />
                  </View>
                  <Text className="mt-5 text-2xl font-semibold text-slate-900">Chào mừng trở lại, Nguyễn Văn A</Text>
                  <Text className="mt-2 text-sm text-slate-600">
                    Theo dõi sức khỏe răng miệng và quản lý các cuộc hẹn của bạn
                  </Text>
                  <View className="mt-4 flex-row space-x-3">
                    <StatusPill label="Khỏe mạnh" status="normal" />
                    <StatusPill label="2 lời nhắc" status="attention" />
                  </View>
                </View>
                <View className="w-24 space-y-3">
                  <View className="rounded-2xl bg-blue-50 px-3 py-2">
                    <Text className="text-xs font-semibold text-blue-600">Điểm chăm sóc</Text>
                    <Text className="text-lg font-bold text-blue-700">92</Text>
                  </View>
                  <View className="rounded-2xl bg-emerald-50 px-3 py-2">
                    <Text className="text-xs font-semibold text-emerald-600">Lịch trong tuần</Text>
                    <Text className="text-lg font-bold text-emerald-700">02</Text>
                  </View>
                </View>
              </View>
              <View className="mt-6 flex-row space-x-3">
                <View className="flex-1 items-center justify-center rounded-2xl bg-blue-600 py-3">
                  <View className="flex-row items-center space-x-2">
                    <Calendar color="#ffffff" size={18} />
                    <Text className="text-sm font-semibold text-white">Đặt lịch mới</Text>
                  </View>
                </View>
                <View className="flex-1 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 py-3">
                  <View className="flex-row items-center space-x-2">
                    <MessageSquare color="#1d4ed8" size={18} />
                    <Text className="text-sm font-semibold text-blue-700">Liên hệ bác sĩ</Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="space-y-4">
              <View className="flex-row flex-wrap gap-4">
                {KPI_CARDS.map((card) => (
                  <View key={card.id} className="w-full flex-1" style={{ minWidth: '48%' }}>
                    <KpiCard card={card} />
                  </View>
                ))}
              </View>
            </View>

            <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
              <View className="flex-row items-center gap-2">
                <Activity color="#1f2937" size={20} />
                <Text className="text-lg font-semibold text-slate-900">Hoạt động gần đây</Text>
              </View>
              <View className="mt-5 space-y-4">
                {ACTIVITIES.map((item) => {
                  const { Icon } = item;
                  return (
                    <View
                      key={item.id}
                      className="flex-row items-start gap-3 rounded-2xl border border-slate-100 bg-white/95 p-4"
                    >
                      <View className="rounded-2xl bg-blue-50 p-3">
                        <Icon color="#1d4ed8" size={20} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-900">{item.title}</Text>
                        <Text className="mt-1 text-xs text-slate-500">{item.subtitle}</Text>
                        <View className="mt-3">
                          <StatusPill
                            label={item.status === 'normal' ? 'Hoàn thành' : item.status === 'info' ? 'Đang xử lý' : 'Cần xem'}
                            status={item.status}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="space-y-6">
              <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
                <View className="flex-row items-center gap-2">
                  <Stethoscope color="#1f2937" size={20} />
                  <Text className="text-lg font-semibold text-slate-900">Chỉ số sức khỏe</Text>
                </View>
                <View className="mt-5 flex-row flex-wrap gap-4">
                  {HEALTH_METRICS.map((metric) => {
                    const { Icon } = metric;
                    return (
                      <View
                        key={metric.id}
                        className="flex-1 items-center justify-center rounded-2xl bg-blue-50 p-4"
                        style={{ minWidth: '30%' }}
                      >
                        <Icon color="#1d4ed8" size={24} />
                        <Text className="mt-2 text-lg font-semibold text-blue-700">{metric.value}</Text>
                        <Text className="mt-1 text-xs text-slate-600">{metric.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
                <View className="flex-row items-center gap-2">
                  <FileText color="#1f2937" size={20} />
                  <Text className="text-lg font-semibold text-slate-900">Hồ sơ &amp; Báo cáo</Text>
                </View>
                <View className="mt-5 space-y-4">
                  <View className="rounded-2xl border border-slate-100 bg-white/95 p-4">
                    <Text className="text-sm font-semibold text-slate-900">Hồ sơ khám gần nhất</Text>
                    <Text className="mt-1 text-xs text-slate-500">10/12/2023 — Phục hồi răng số 6</Text>
                    <View className="mt-3">
                      <StatusPill label="Hoàn thành" status="normal" />
                    </View>
                  </View>
                  <View className="rounded-2xl border border-slate-100 bg-white/95 p-4">
                    <Text className="text-sm font-semibold text-slate-900">Sơ đồ răng</Text>
                    <Text className="mt-1 text-xs text-slate-500">32 răng — 4 răng đã điều trị</Text>
                    <View className="mt-3 space-y-2">
                      <ProgressBar value={87} color="#1d4ed8" />
                      <Text className="text-right text-xs font-medium text-blue-700">87% hoàn thành</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View className="space-y-6">
              <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
                <View className="flex-row items-center gap-2">
                  <Clock color="#1f2937" size={20} />
                  <Text className="text-lg font-semibold text-slate-900">Nhắc nhở chăm sóc</Text>
                </View>
                <View className="mt-5 space-y-3">
                  {REMINDERS.map((reminder) => (
                    <View key={reminder.id} className="flex-row items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                      <View className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: '#1d4ed8' }} />
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-900">{reminder.title}</Text>
                        <Text className="mt-1 text-xs text-slate-600">{reminder.subtitle}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
                <View className="flex-row items-center gap-2">
                  <Phone color="#1f2937" size={20} />
                  <Text className="text-lg font-semibold text-slate-900">Liên hệ nhanh</Text>
                </View>
                <View className="mt-5 space-y-3">
                  <View className="items-center justify-center rounded-2xl bg-blue-600 py-3">
                    <Text className="text-sm font-semibold text-white">Gọi phòng khám</Text>
                  </View>
                  <View className="items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 py-3">
                    <Text className="text-sm font-semibold text-blue-700">Gửi tin nhắn</Text>
                  </View>
                </View>
              </View>

              <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
                <View className="flex-row items-center gap-2">
                  <TrendingUp color="#1f2937" size={20} />
                  <Text className="text-lg font-semibold text-slate-900">Xu hướng sức khỏe</Text>
                </View>
                <View className="mt-5 space-y-4">
                  {TRENDS.map((trend) => (
                    <View key={trend.id} className="space-y-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-slate-600">{trend.label}</Text>
                        <Text className="text-sm font-medium text-blue-600">↗ {trend.trend}</Text>
                      </View>
                      <ProgressBar value={trend.value} color="#1d4ed8" />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
