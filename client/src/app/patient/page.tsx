import { Calendar, Check, Clock, Activity, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// ...existing imports

export default function PatientDashboard() {
  return (
    <div className="space-y-6">
      {/* Top header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chào mừng trở lại</h1>
          <p className="text-gray-600 mt-1">Xem nhanh tình trạng răng miệng và lịch hẹn của bạn</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary-filled px-4 py-2 rounded-lg">Đặt lịch mới</button>
          <button className="btn-primary-filled px-3 py-2 rounded-lg">Liên hệ bác sĩ</button>
        </div>
      </div>

      {/* KPI / stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary-100 rounded-md">
                <Calendar className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              Lịch hẹn tiếp theo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">15/01/2024 — 09:00</div>
            <div className="text-sm text-gray-500 mt-1">BS. Nguyễn Thị B</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary-100 rounded-md">
                <Check className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              Kết quả điều trị
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <div className="text-sm text-gray-500 mt-1">Lần khám đã hoàn thành</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary-100 rounded-md">
                <Activity className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              Cần theo dõi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">2</div>
            <div className="text-sm text-gray-500 mt-1">Yêu cầu tái khám</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary-100 rounded-md">
                <Heart className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              Sức khỏe răng miệng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">Chỉ số tổng quan</div>
            <div className="w-full bg-gray-200 rounded-lg h-3 overflow-hidden">
              <div className="h-3 bg-gradient-to-r from-primary to-primary-600" style={{ width: "74%" }} />
            </div>
            <div className="text-sm text-gray-500 mt-2">74% — Đang tốt</div>
          </CardContent>
        </Card>
      </div>

      {/* Main grid: recent activities and reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-100 rounded-md">
                    <Clock className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <div className="font-medium">Khám định kỳ</div>
                    <div className="text-sm text-gray-500">15/01/2024 — BS. Nguyễn Thị B</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-100 rounded-md">
                    <Check className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <div className="font-medium">Tẩy trắng răng</div>
                    <div className="text-sm text-gray-500">20/01/2024 — Chờ xác nhận</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-100 rounded-md">
                    <Activity className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <div className="font-medium">Đã nhận đơn thuốc</div>
                    <div className="text-sm text-gray-500">10/12/2023 — BS. Trần Văn C</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hồ sơ & Sơ đồ răng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium">Hồ sơ gần nhất</div>
                  <div className="text-sm text-gray-500 mt-1">Khám ngày 10/12/2023 — Phục hồi</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium">Sơ đồ răng</div>
                  <div className="text-sm text-gray-500 mt-1">32 răng — 4 răng đã điều trị</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reminders */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nhắc nhở chăm sóc</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Đánh răng sau bữa ăn</div>
                  <div className="text-sm text-gray-500">Đã 3 giờ kể từ bữa trưa</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Uống thuốc kháng sinh</div>
                  <div className="text-sm text-gray-500">Đã hoàn thành hôm nay</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Tái khám định kỳ</div>
                  <div className="text-sm text-gray-500">Còn 5 ngày nữa</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liên hệ nhanh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <button className="btn-primary-filled py-2 rounded-lg">Gọi ngay</button>
                <button className="btn-primary-filled py-2 rounded-lg">Gửi tin nhắn</button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
