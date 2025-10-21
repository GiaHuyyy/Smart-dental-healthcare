import {
  Calendar,
  Check,
  Clock,
  Activity,
  Heart,
  User,
  Phone,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  FileText,
  Thermometer,
  Eye,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, KPICard, StatusIndicator, ProgressBar } from "@/components/ui/card";

export default function PatientDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
              <p className="text-sm text-gray-500 mt-1">Theo dõi sức khỏe răng miệng của bạn</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="btn-healthcare-primary flex items-center gap-2 px-4 py-2">
                <Calendar className="w-4 h-4" />
                Đặt lịch hẹn
              </button>
              <button className="btn-healthcare-secondary flex items-center gap-2 px-4 py-2">
                <MessageSquare className="w-4 h-4" />
                Liên hệ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Quick Status Bar */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Nguyễn Văn A</div>
                <div className="text-sm text-gray-500">Mã BN: BN001234</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator status="normal">Khỏe mạnh</StatusIndicator>
              <StatusIndicator status="attention">2 lời nhắc</StatusIndicator>
            </div>
          </div>
        </div>

        {/* Enhanced KPI Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="healthcare" className="kpi-card group hover:scale-[1.02] transition-transform duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-primary-50)" }}
                >
                  <Calendar className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                </div>
                Lịch hẹn tiếp theo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xl font-bold text-gray-900">15/01/2024</div>
                <div className="text-sm text-gray-600">9:00 AM với BS. Nguyễn Thị B</div>
                <div className="text-xs font-medium" style={{ color: "var(--color-primary)" }}>
                  Khám định kỳ
                </div>
              </div>
            </CardContent>
          </Card>

          <KPICard
            value={12}
            label="Lần khám hoàn thành"
            trend={{ direction: "up", value: "+2 tháng này" }}
            className="kpi-card group hover:scale-[1.02] transition-transform duration-200"
          />

          <Card
            variant="healthcare"
            status="attention"
            className="kpi-card group hover:scale-[1.02] transition-transform duration-200"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-primary-50)" }}
                >
                  <AlertTriangle className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                </div>
                Cần theo dõi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                2
              </div>
              <div className="text-sm text-gray-600 mt-1">Yêu cầu tái khám</div>
              <div className="mt-2">
                <StatusIndicator status="attention">Cần chú ý</StatusIndicator>
              </div>
            </CardContent>
          </Card>

          <Card variant="healthcare" className="kpi-card group hover:scale-[1.02] transition-transform duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-primary-50)" }}
                >
                  <Heart className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                </div>
                Sức khỏe răng miệng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tổng quan</span>
                  <span className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                    74%
                  </span>
                </div>
                <ProgressBar value={74} variant="success" />
                <StatusIndicator status="normal">Tình trạng tốt</StatusIndicator>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activities & Records */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activities */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="healthcare-subheading flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Hoạt động gần đây
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
                    style={{ borderLeft: "1px solid var(--color-border)" }}
                  >
                    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                      <Check className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Khám định kỳ hoàn thành</div>
                      <div className="text-sm text-gray-600 mt-1">15/01/2024 — BS. Nguyễn Thị B</div>
                      <div className="mt-2">
                        <StatusIndicator status="normal">Hoàn thành</StatusIndicator>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
                    style={{ borderLeft: "1px solid var(--color-border)" }}
                  >
                    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                      <Clock className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Tẩy trắng răng được lên lịch</div>
                      <div className="text-sm text-gray-600 mt-1">20/01/2024 — Chờ xác nhận</div>
                      <div className="mt-2">
                        <StatusIndicator status="info">Đang xử lý</StatusIndicator>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
                    style={{ borderLeft: "1px solid var(--color-border)" }}
                  >
                    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                      <FileText className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Kết quả X-quang đã sẵn sàng</div>
                      <div className="text-sm text-gray-600 mt-1">12/01/2024 — Xem kết quả</div>
                      <div className="mt-2">
                        <StatusIndicator status="attention">Cần xem</StatusIndicator>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vital Signs & Health Metrics */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="healthcare-subheading flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  Chỉ số sức khỏe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                    <Thermometer className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-primary)" }} />
                    <div className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                      36.5°C
                    </div>
                    <div className="text-sm text-gray-600">Nhiệt độ</div>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                    <Heart className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-primary)" }} />
                    <div className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                      72 BPM
                    </div>
                    <div className="text-sm text-gray-600">Nhịp tim</div>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                    <Eye className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-primary)" }} />
                    <div className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                      95%
                    </div>
                    <div className="text-sm text-gray-600">SpO2</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Records */}
            <Card variant="healthcare">
              <CardHeader>
                <CardTitle className="healthcare-subheading flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Hồ sơ và Báo cáo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                    <div className="font-medium text-gray-900">Hồ sơ khám gần nhất</div>
                    <div className="text-sm text-gray-600 mt-1">10/12/2023 — Phục hồi răng số 6</div>
                    <div className="mt-3">
                      <StatusIndicator status="normal">Hoàn thành</StatusIndicator>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                    <div className="font-medium text-gray-900">Sơ đồ răng</div>
                    <div className="text-sm text-gray-600 mt-1">32 răng — 4 răng đã điều trị</div>
                    <div className="mt-3">
                      <ProgressBar value={87} variant="success" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Reminders & Quick Actions */}
          <div className="space-y-6">
            {/* Care Reminders */}
            <Card variant="healthcare">
              <CardHeader>
                <CardTitle className="healthcare-subheading flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Nhắc nhở chăm sóc
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-3 h-3 rounded-full mt-2" style={{ backgroundColor: "var(--color-primary)" }}></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Đánh răng sau bữa ăn</div>
                    <div className="text-sm text-gray-600 mt-1">Đã 3 giờ kể từ bữa trưa</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-3 h-3 rounded-full mt-2" style={{ backgroundColor: "var(--color-primary)" }}></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Uống thuốc kháng sinh</div>
                    <div className="text-sm text-gray-600 mt-1">Đã hoàn thành hôm nay</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-3 h-3 rounded-full mt-2" style={{ backgroundColor: "var(--color-primary)" }}></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Tái khám định kỳ</div>
                    <div className="text-sm text-gray-600 mt-1">Còn 5 ngày nữa</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Contact */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="healthcare-subheading flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Liên hệ nhanh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button className="w-full btn-healthcare-primary flex items-center justify-center gap-2 py-3">
                    <Phone className="w-4 h-4" />
                    Gọi phòng khám
                  </button>
                  <button className="w-full btn-healthcare-secondary flex items-center justify-center gap-2 py-3">
                    <MessageSquare className="w-4 h-4" />
                    Gửi tin nhắn
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Health Trends */}
            <Card variant="healthcare">
              <CardHeader>
                <CardTitle className="healthcare-subheading flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Xu hướng sức khỏe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Vệ sinh răng miệng</span>
                      <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                        ↗ +5%
                      </span>
                    </div>
                    <ProgressBar value={85} variant="success" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Tuân thủ điều trị</span>
                      <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                        ↗ +2%
                      </span>
                    </div>
                    <ProgressBar value={92} variant="default" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
