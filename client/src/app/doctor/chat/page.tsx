export default function DoctorChatPage() {
  return (
    <div className="h-full flex">
      {/* Chat Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chat & Tư vấn</h2>
          <p className="text-sm text-gray-600">Hỗ trợ bệnh nhân trực tuyến</p>
        </div>

        {/* Patient List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Bệnh nhân chờ tư vấn (3)
            </div>

            {/* Sample patient conversations */}
            <div className="space-y-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Nguyễn Thị Mai</h4>
                    <p className="text-sm text-gray-600 truncate">Đau răng khôn kéo dài 3 ngày...</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                    <p className="text-xs text-gray-500 mt-1">2 phút</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Trần Văn Nam</h4>
                    <p className="text-sm text-gray-600 truncate">Cần tư vấn về niềng răng...</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <p className="text-xs text-gray-500 mt-1">15 phút</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Lê Thị Hoa</h4>
                    <p className="text-sm text-gray-600 truncate">Cảm ơn bác sĩ đã tư vấn</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">1 giờ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-medium">N</span>
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900">Nguyễn Thị Mai</h3>
              <p className="text-sm text-gray-600">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Đang hoạt động
              </p>
            </div>
            <div className="ml-auto flex space-x-2">
              <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">
                📞 Gọi điện
              </button>
              <button className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200">
                📅 Đặt lịch
              </button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {/* AI Bot suggestion */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">🤖</span>
              </div>
              <div className="flex-1">
                <div className="text-sm text-blue-800">
                  <strong>AI đề xuất:</strong> Bệnh nhân có triệu chứng đau răng khôn. Đề xuất khám và có thể cần nhổ
                  răng khôn.
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  <button className="hover:underline">Xem chi tiết phân tích AI</button>
                </div>
              </div>
            </div>
          </div>

          {/* Patient message */}
          <div className="flex">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
            <div className="ml-3 flex-1">
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-xs">
                <p className="text-gray-900">
                  Xin chào bác sĩ! Em bị đau răng khôn đã 3 ngày rồi ạ. Đau liên tục và bây giờ sưng cả má. Em có nên
                  nhổ không ạ?
                </p>
                <p className="text-xs text-gray-500 mt-1">14:30</p>
              </div>
            </div>
          </div>

          {/* Doctor message */}
          <div className="flex justify-end">
            <div className="mr-3 flex-1 flex justify-end">
              <div className="bg-blue-500 text-white rounded-lg p-3 shadow-sm max-w-xs">
                <p>
                  Chào bạn! Triệu chứng bạn mô tả có vẻ như răng khôn mọc lệch và viêm nhiễm. Tôi cần kiểm tra trực tiếp
                  để đưa ra phương án điều trị phù hợp. Bạn có thể đặt lịch khám không?
                </p>
                <p className="text-xs text-blue-100 mt-1">14:32</p>
              </div>
            </div>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex-shrink-0 flex items-center justify-center">
              <span className="text-white text-sm">BS</span>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex space-x-2">
            <div className="flex-1">
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tin nhắn..."
                rows={2}
              />
            </div>
            <div className="flex flex-col space-y-1">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">Gửi</button>
              <button className="px-4 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs">
                📎 File
              </button>
            </div>
          </div>

          {/* Quick replies */}
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
              Cần đặt lịch khám
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
              Cần chụp X-quang
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
              Kê đơn thuốc
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
