export default function PatientDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chào mừng trở lại!</h1>
        <p className="text-gray-600">Tổng quan tình trạng sức khỏe răng miệng của bạn</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Lịch hẹn tiếp theo</p>
              <p className="text-2xl font-bold text-gray-900">15/01/2024</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Đã hoàn thành</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Đang chờ</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Lịch hẹn sắp tới</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Khám định kỳ</p>
                <p className="text-sm text-gray-600">BS. Nguyễn Thị B</p>
                <p className="text-sm text-gray-500">15/01/2024 - 09:00</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Đã xác nhận</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tẩy trắng răng</p>
                <p className="text-sm text-gray-600">BS. Trần Văn C</p>
                <p className="text-sm text-gray-500">20/01/2024 - 14:00</p>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Chờ xác nhận</span>
            </div>
          </div>
        </div>

        {/* Health Reminders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Nhắc nhở chăm sóc</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Đánh răng sau bữa ăn</p>
                <p className="text-sm text-gray-600">Đã 3 giờ kể từ bữa trưa</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Uống thuốc kháng sinh</p>
                <p className="text-sm text-gray-600">Đã hoàn thành hôm nay</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Tái khám định kỳ</p>
                <p className="text-sm text-gray-600">Còn 5 ngày nữa</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
