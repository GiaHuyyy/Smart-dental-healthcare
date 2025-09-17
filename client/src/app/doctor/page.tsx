import {
  Users,
  Check,
  Clock,
  Pill,
  Calendar,
  MessageSquare,
  Activity,
  Stethoscope,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  UserCheck,
  Timer,
} from "lucide-react";

export default function DoctorDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
                }}
              >
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="healthcare-heading text-3xl">Bảng điều khiển bác sĩ</h1>
                <p className="healthcare-body mt-1">Tổng quan hoạt động và lịch khám hôm nay</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn-healthcare-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Thêm lịch khám
              </button>
              <button className="btn-healthcare-secondary flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Tạo đơn thuốc
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Today's Patients */}
          <div className="kpi-card group hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                </div>
                <div>
                  <div className="healthcare-caption text-gray-500">Hôm nay</div>
                  <div className="healthcare-subheading text-lg">Bệnh nhân</div>
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
                8
              </div>
              <div className="status-indicator status-info">
                <TrendingUp className="w-3 h-3" />
                +12%
              </div>
            </div>
            <div className="healthcare-caption mt-2">Lượt khám đã lên lịch</div>
          </div>

          {/* Completed Appointments */}
          <div className="kpi-card group hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                </div>
                <div>
                  <div className="healthcare-caption text-gray-500">Đã hoàn thành</div>
                  <div className="healthcare-subheading text-lg">Khám xong</div>
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
                5
              </div>
              <div className="status-indicator status-normal">
                <Check className="w-3 h-3" />
                Hoàn thành
              </div>
            </div>
            <div className="healthcare-caption mt-2">Ca đã khám xong</div>
          </div>

          {/* Waiting Patients */}
          <div className="kpi-card group hover:scale-105 transition-transform duration-200 border-l-2 border-orange-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl flex items-center justify-center">
                  <Timer className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <div className="healthcare-caption text-gray-500">Đang chờ</div>
                  <div className="healthcare-subheading text-lg">Bệnh nhân</div>
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-orange-500">3</div>
              <div className="status-indicator status-attention">
                <AlertCircle className="w-3 h-3" />
                Chờ khám
              </div>
            </div>
            <div className="healthcare-caption mt-2">Đang chờ tại phòng khám</div>
          </div>

          {/* Prescriptions */}
          <div className="kpi-card group hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                </div>
                <div>
                  <div className="healthcare-caption text-gray-500">Đơn thuốc</div>
                  <div className="healthcare-subheading text-lg">Chờ xử lý</div>
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
                12
              </div>
              <div className="status-indicator status-info">
                <Pill className="w-3 h-3" />
                Chờ
              </div>
            </div>
            <div className="healthcare-caption mt-2">Đơn cần xử lý</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Schedule - Spans 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Appointments */}
            <div className="healthcare-card-elevated">
              <div className="p-6 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <h3 className="healthcare-subheading">Lịch khám hôm nay</h3>
                    <p className="healthcare-caption">8 bệnh nhân đã lên lịch</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Appointment Item */}
                <div className="healthcare-card p-4 hover:shadow-md transition-shadow cursor-pointer border-l-2 border-blue-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
                        <Activity className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Nguyễn Văn A</div>
                        <div className="text-sm text-gray-500">Khám định kỳ</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="status-indicator status-info">
                            <Clock className="w-3 h-3" />
                            09:00
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="btn-healthcare-secondary px-3 py-1 text-xs">Bắt đầu khám</button>
                  </div>
                </div>

                <div className="healthcare-card p-4 hover:shadow-md transition-shadow cursor-pointer border-l-2 border-green-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Trần Thị B</div>
                        <div className="text-sm text-gray-500">Nhổ răng khôn</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="status-indicator status-normal">
                            <Check className="w-3 h-3" />
                            Hoàn thành
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="btn-healthcare-primary px-3 py-1 text-xs">Xem kết quả</button>
                  </div>
                </div>

                <div className="healthcare-card p-4 hover:shadow-md transition-shadow cursor-pointer border-l-2 border-orange-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                        <Timer className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Lê Văn C</div>
                        <div className="text-sm text-gray-500">Tẩy trắng răng</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="status-indicator status-attention">
                            <AlertCircle className="w-3 h-3" />
                            Đang chờ
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="btn-healthcare-secondary px-3 py-1 text-xs">Gọi vào</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="healthcare-card-elevated">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="healthcare-subheading">Hoạt động gần đây</h3>
                    <p className="healthcare-caption">Cập nhật mới nhất</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Hoàn thành điều trị Nguyễn Văn A</div>
                    <div className="text-sm text-gray-500 mt-1">09:30 - Khám định kỳ và vệ sinh răng miệng</div>
                    <div className="text-xs text-gray-400 mt-1">15 phút trước</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Kê đơn thuốc cho Phạm Thị D</div>
                    <div className="text-sm text-gray-500 mt-1">08:45 - Điều trị viêm nướu</div>
                    <div className="text-xs text-gray-400 mt-1">1 giờ trước</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Lên lịch tái khám cho Hoàng Minh E</div>
                    <div className="text-sm text-gray-500 mt-1">08:30 - Sau điều trị tủy</div>
                    <div className="text-xs text-gray-400 mt-1">1 giờ trước</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Messages */}
            <div className="healthcare-card-elevated">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="healthcare-subheading">Tin nhắn mới</h3>
                    <p className="healthcare-caption">3 tin nhắn chưa đọc</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="healthcare-card p-3 border-l-4 border-red-400">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Nguyễn Thị X</div>
                      <div className="text-xs text-gray-500 mt-1">Yêu cầu tư vấn khẩn cấp</div>
                      <div className="text-xs text-gray-400 mt-1">5 phút trước</div>
                    </div>
                  </div>
                </div>

                <div className="healthcare-card p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Trần Văn Y</div>
                      <div className="text-xs text-gray-500 mt-1">Hỏi về lịch tái khám</div>
                      <div className="text-xs text-gray-400 mt-1">20 phút trước</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="healthcare-card-elevated">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="healthcare-subheading">Thống kê tuần</h3>
                    <p className="healthcare-caption">Hiệu suất làm việc</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Bệnh nhân đã khám</span>
                  <span className="font-semibold text-gray-900">42</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Đơn thuốc kê</span>
                  <span className="font-semibold text-gray-900">38</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tỷ lệ hài lòng</span>
                  <span className="font-semibold text-green-600">97%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Thời gian chờ TB</span>
                  <span className="font-semibold text-blue-600">8 phút</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
