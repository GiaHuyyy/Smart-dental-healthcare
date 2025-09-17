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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header Section */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 bg-gradient-to-br rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
                }}
              >
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="healthcare-heading text-3xl">Chào mừng trở lại, Nguyễn Văn A</h1>
                <p className="healthcare-body mt-1">Theo dõi sức khỏe răng miệng và quản lý các cuộc hẹn của bạn</p>
                <div className="flex items-center gap-4 mt-3">
                  <StatusIndicator status="normal">Khỏe mạnh</StatusIndicator>
                  <StatusIndicator status="attention">2 lời nhắc</StatusIndicator>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="btn-healthcare-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Đặt lịch hẹn mới
              </button>
              <button className="btn-healthcare-secondary flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Liên hệ bác sĩ
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced KPI Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card variant="healthcare">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
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

          <KPICard value={12} label="Lần khám hoàn thành" trend={{ direction: "up", value: "+2 tháng này" }} />

          <Card variant="healthcare" status="attention">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                Cần theo dõi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">2</div>
              <div className="text-sm text-gray-600 mt-1">Yêu cầu tái khám</div>
              <div className="mt-2">
                <StatusIndicator status="attention">Cần chú ý</StatusIndicator>
              </div>
            </CardContent>
          </Card>

          <Card variant="healthcare">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Heart className="w-5 h-5 text-green-600" />
                </div>
                Sức khỏe răng miệng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tổng quan</span>
                  <span className="text-lg font-bold text-green-600">74%</span>
                </div>
                <ProgressBar value={74} variant="success" />
                <StatusIndicator status="normal">Tình trạng tốt</StatusIndicator>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Khám định kỳ hoàn thành</div>
                      <div className="text-sm text-gray-600 mt-1">15/01/2024 — BS. Nguyễn Thị B</div>
                      <div className="mt-2">
                        <StatusIndicator status="normal">Hoàn thành</StatusIndicator>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-50 rounded-lg">
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

                  <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
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
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Thermometer className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-primary)" }} />
                    <div className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                      36.5°C
                    </div>
                    <div className="text-sm text-gray-600">Nhiệt độ</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Heart className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-green-600">72 BPM</div>
                    <div className="text-sm text-gray-600">Nhịp tim</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Eye className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-purple-600">95%</div>
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
                  <div className="w-3 h-3 rounded-full mt-2 bg-red-500"></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Đánh răng sau bữa ăn</div>
                    <div className="text-sm text-gray-600 mt-1">Đã 3 giờ kể từ bữa trưa</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-3 h-3 rounded-full mt-2 bg-green-500"></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Uống thuốc kháng sinh</div>
                    <div className="text-sm text-gray-600 mt-1">Đã hoàn thành hôm nay</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-3 h-3 rounded-full mt-2 bg-yellow-500"></div>
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
                      <span className="text-sm font-medium text-green-600">↗ +5%</span>
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
