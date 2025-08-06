export default function PatientRecords() {
  const records = [
    {
      id: 1,
      date: "10/01/2024",
      doctor: "BS. Nguyễn Thị B",
      diagnosis: "Sâu răng số 6 hàm dưới",
      treatment: "Trám răng composite",
      notes: "Bệnh nhân cần theo dõi trong 2 tuần tới",
      images: ["xray-1.jpg"],
    },
    {
      id: 2,
      date: "05/01/2024",
      doctor: "BS. Trần Văn C",
      diagnosis: "Viêm nướu nhẹ",
      treatment: "Lấy cao răng, hướng dẫn vệ sinh răng miệng",
      notes: "Tái khám sau 3 tháng",
      images: [],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ điều trị</h1>
        <p className="text-gray-600">Lịch sử khám và điều trị răng miệng</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng lần khám</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">🦷</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Răng đã điều trị</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cần theo dõi</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Lịch sử điều trị</h2>
        </div>
        <div className="divide-y">
          {records.map((record) => (
            <div key={record.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{record.diagnosis}</h3>
                  <p className="text-sm text-gray-600">
                    {record.date} - {record.doctor}
                  </p>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm">Xem chi tiết</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Điều trị</h4>
                  <p className="text-gray-700">{record.treatment}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Ghi chú</h4>
                  <p className="text-gray-700">{record.notes}</p>
                </div>
              </div>

              {record.images.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Hình ảnh</h4>
                  <div className="flex space-x-2">
                    {record.images.map((image, index) => (
                      <div
                        key={index}
                        className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center"
                      >
                        <span className="text-xs text-gray-500">📷</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dental Chart */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Sơ đồ răng</h2>
        </div>
        <div className="p-6">
          <div className="text-center">
            <div className="inline-block p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">Sơ đồ răng sẽ được hiển thị ở đây</p>
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: 32 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center text-xs ${
                      [5, 6, 7].includes(i % 16)
                        ? "border-red-300 bg-red-50 text-red-600"
                        : "border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-center space-x-4 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 border-2 border-gray-300 bg-white rounded mr-1"></div>
                  <span>Bình thường</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 border-2 border-red-300 bg-red-50 rounded mr-1"></div>
                  <span>Đã điều trị</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
