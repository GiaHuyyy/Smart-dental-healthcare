import Link from "next/link";

export default async function HomePage() {
  const services = [
    {
      icon: "🦷",
      title: "Khám tổng quát",
      description: "Kiểm tra sức khỏe răng miệng định kỳ",
    },
    {
      icon: "✨",
      title: "Tẩy trắng răng",
      description: "Làm trắng răng an toàn, hiệu quả",
    },
    {
      icon: "🔧",
      title: "Chỉnh nha",
      description: "Niềng răng, chỉnh hình hàm răng",
    },
    {
      icon: "🏥",
      title: "Phẫu thuật",
      description: "Nhổ răng khôn, cấy ghép implant",
    },
  ];

  const doctors = [
    {
      name: "BS. Nguyễn Thị Mai",
      specialty: "Nha khoa tổng quát",
      experience: "10+ năm kinh nghiệm",
      rating: 4.9,
    },
    {
      name: "BS. Trần Văn Nam",
      specialty: "Chỉnh nha",
      experience: "8+ năm kinh nghiệm",
      rating: 4.8,
    },
    {
      name: "BS. Lê Thị Hoa",
      specialty: "Thẩm mỹ răng",
      experience: "12+ năm kinh nghiệm",
      rating: 4.9,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">🦷</span>
              </div>
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Smart Dental Healthcare</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#services" className="text-gray-600 hover:text-gray-900">
                Dịch vụ
              </Link>
              <Link href="#doctors" className="text-gray-600 hover:text-gray-900">
                Bác sĩ
              </Link>
              <Link href="#about" className="text-gray-600 hover:text-gray-900">
                Về chúng tôi
              </Link>
              <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
                Đăng nhập
              </Link>
              <Link href="/auth/register" className="bg-sky-500 text-white px-4 py-2 rounded-md hover:bg-sky-600">
                Đăng ký
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section with Booking */}
      <section className="bg-gradient-to-br from-sky-500 to-sky-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Đặt lịch khám răng</h2>
            <p className="text-xl text-sky-100 max-w-2xl mx-auto">
              Hệ thống đặt lịch thông minh, kết nối bạn với các bác sĩ nha khoa hàng đầu
            </p>
          </div>

          {/* Booking Form */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
            <form className="space-y-6">
              {/* Search Bar and Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chọn địa điểm</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500">
                    <option>Hồ Chí Minh</option>
                    <option>Hà Nội</option>
                    <option>Đà Nẵng</option>
                    <option>Cần Thơ</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Tìm bác sĩ, phòng khám, chuyên khoa..."
                      className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 px-6 bg-sky-500 text-white rounded-r-lg hover:bg-sky-600 transition-colors font-medium"
                    >
                      Tìm kiếm
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Quick Filters */}
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-3">Bạn đang tìm kiếm:</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-sm">Nha khoa tổng quát ✕</span>
                <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-sm">Chỉnh nha ✕</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Dịch vụ nha khoa chuyên nghiệp</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Chúng tôi cung cấp đầy đủ các dịch vụ nha khoa từ cơ bản đến chuyên sâu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h4>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Section */}
      <section id="doctors" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Đội ngũ bác sĩ giàu kinh nghiệm</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Các bác sĩ nha khoa hàng đầu với nhiều năm kinh nghiệm và chuyên môn cao
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {doctors.map((doctor, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md p-6 text-center border hover:shadow-lg transition-shadow"
              >
                <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-4"></div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">{doctor.name}</h4>
                <p className="text-sky-600 font-medium mb-1">{doctor.specialty}</p>
                <p className="text-gray-600 text-sm mb-3">{doctor.experience}</p>
                <div className="flex items-center justify-center">
                  <span className="text-yellow-400">⭐</span>
                  <span className="ml-1 text-sm font-medium">{doctor.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">Về Smart Dental Healthcare</h3>
              <p className="text-lg text-gray-600 mb-6">
                Chúng tôi là hệ thống chăm sóc sức khỏe răng miệng hàng đầu, kết hợp công nghệ hiện đại với dịch vụ
                chuyên nghiệp để mang đến trải nghiệm tốt nhất cho bệnh nhân.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600">✓</span>
                  </div>
                  <span className="text-gray-700">Đặt lịch online dễ dàng</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600">✓</span>
                  </div>
                  <span className="text-gray-700">Bác sĩ chuyên nghiệp, giàu kinh nghiệm</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600">✓</span>
                  </div>
                  <span className="text-gray-700">Trang thiết bị hiện đại</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600">✓</span>
                  </div>
                  <span className="text-gray-700">Theo dõi điều trị trực tuyến</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-sky-100 to-blue-100 rounded-2xl p-8">
              <div className="text-center">
                <h4 className="text-2xl font-bold text-gray-900 mb-6">Thống kê hệ thống</h4>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-3xl font-bold text-sky-600">1000+</div>
                    <div className="text-gray-600">Bệnh nhân tin tưởng</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-sky-600">50+</div>
                    <div className="text-gray-600">Bác sĩ chuyên nghiệp</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-sky-600">5+</div>
                    <div className="text-gray-600">Năm kinh nghiệm</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-sky-600">98%</div>
                    <div className="text-gray-600">Khách hàng hài lòng</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-sky-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Sẵn sàng chăm sóc nụ cười của bạn?</h3>
          <p className="text-xl text-sky-100 mb-8 max-w-2xl mx-auto">
            Đăng ký ngay hôm nay để được tư vấn miễn phí và đặt lịch khám với các bác sĩ hàng đầu
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="bg-white text-sky-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Đăng ký ngay
            </Link>
            <Link
              href="/auth/login"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-sky-600 transition-colors"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-white font-bold">🦷</span>
                </div>
                <span className="text-lg font-bold">Smart Dental</span>
              </div>
              <p className="text-gray-400">
                Hệ thống chăm sóc sức khỏe răng miệng thông minh, kết nối bệnh nhân với bác sĩ chuyên nghiệp.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Dịch vụ</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Khám tổng quát</li>
                <li>Tẩy trắng răng</li>
                <li>Chỉnh nha</li>
                <li>Cấy ghép Implant</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Liên hệ</li>
                <li>Câu hỏi thường gặp</li>
                <li>Chính sách bảo mật</li>
                <li>Điều khoản sử dụng</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Liên hệ</h4>
              <ul className="space-y-2 text-gray-400">
                <li>📞 1900 1234</li>
                <li>📧 info@smartdental.vn</li>
                <li>📍 TP. Hồ Chí Minh</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Smart Dental Healthcare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
