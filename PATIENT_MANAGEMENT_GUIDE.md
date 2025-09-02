# Hướng dẫn sử dụng hệ thống quản lý bệnh nhân

## Tổng quan

Hệ thống quản lý bệnh nhân đã được hoàn thiện với đầy đủ các tính năng cần thiết cho bác sĩ:

### 🏥 Tính năng chính

1. **Quản lý danh sách bệnh nhân**
   - Xem danh sách tất cả bệnh nhân
   - Tìm kiếm bệnh nhân theo tên, số điện thoại, email
   - Lọc bệnh nhân theo trạng thái (đang hoạt động/không hoạt động)
   - Phân trang danh sách bệnh nhân

2. **Thống kê bệnh nhân**
   - Tổng số bệnh nhân
   - Số bệnh nhân đang hoạt động
   - Số bệnh nhân mới trong tháng
   - Số bệnh nhân không hoạt động

3. **Chi tiết bệnh nhân**
   - Thông tin cá nhân đầy đủ
   - Lịch sử lịch hẹn
   - Đơn thuốc gần đây
   - Hồ sơ bệnh án (sẽ phát triển trong tương lai)

## 🚀 Cách sử dụng

### 1. Truy cập trang quản lý bệnh nhân

- Đăng nhập vào hệ thống với tài khoản bác sĩ
- Vào menu **Bác sĩ** → **Bệnh nhân**

### 2. Tìm kiếm và lọc bệnh nhân

- **Tìm kiếm**: Nhập tên, số điện thoại hoặc email vào ô tìm kiếm
- **Lọc**: Chọn trạng thái bệnh nhân từ dropdown
- **Phân trang**: Sử dụng nút "Trước" và "Sau" để di chuyển giữa các trang

### 3. Xem chi tiết bệnh nhân

- Click vào tên bệnh nhân hoặc nút "Xem chi tiết" để xem thông tin đầy đủ
- Trang chi tiết có 4 tab:
  - **Tổng quan**: Thông tin cá nhân và thống kê nhanh
  - **Lịch hẹn**: Lịch sử các lịch hẹn
  - **Đơn thuốc**: Đơn thuốc gần đây
  - **Hồ sơ bệnh án**: Sẽ phát triển trong tương lai

### 4. Thao tác nhanh

- **Tạo lịch hẹn**: Click nút "Tạo lịch hẹn" để tạo lịch hẹn mới
- **Tạo đơn thuốc**: Click nút "Tạo đơn thuốc" để tạo đơn thuốc mới
- **Gọi điện**: Sử dụng thông tin số điện thoại để liên lạc

## 🔧 API Endpoints

### Users API
- `GET /api/users/patients/search` - Tìm kiếm bệnh nhân
- `GET /api/users/patients/stats` - Thống kê bệnh nhân
- `GET /api/users/patients/:id/details` - Chi tiết bệnh nhân

### Appointments API
- `GET /api/appointments/patient/:patientId/history` - Lịch sử lịch hẹn
- `GET /api/appointments/patient/:patientId/upcoming` - Lịch hẹn sắp tới

### Prescriptions API
- `GET /api/prescriptions/patient/:patientId/history` - Lịch sử đơn thuốc
- `GET /api/prescriptions/patient/:patientId/recent` - Đơn thuốc gần đây

## 📱 Giao diện

### Trang danh sách bệnh nhân
- Header với tiêu đề và nút thêm bệnh nhân
- Ô tìm kiếm và bộ lọc
- 4 thẻ thống kê (tổng, đang hoạt động, mới tháng này, không hoạt động)
- Bảng danh sách bệnh nhân với phân trang

### Trang chi tiết bệnh nhân
- Header với thông tin bệnh nhân và các nút hành động
- Hệ thống tab để chuyển đổi giữa các chức năng
- Thông tin cá nhân chi tiết
- Thống kê nhanh và hành động nhanh

## 🎨 Thiết kế UI/UX

- **Responsive**: Tương thích với mọi kích thước màn hình
- **Modern**: Sử dụng Tailwind CSS với thiết kế hiện đại
- **Intuitive**: Giao diện trực quan, dễ sử dụng
- **Accessible**: Hỗ trợ tốt cho người dùng khuyết tật

## 🔒 Bảo mật

- Tất cả API endpoints đều được đánh dấu `@Public()` để dễ dàng test
- Có thể thêm middleware xác thực sau này
- Dữ liệu được validate và sanitize trước khi xử lý

## 🚧 Tính năng sẽ phát triển

1. **Hồ sơ bệnh án**
   - Lưu trữ lịch sử bệnh án
   - Chẩn đoán và điều trị
   - Kết quả xét nghiệm

2. **Quản lý thuốc**
   - Danh sách thuốc
   - Liều lượng và hướng dẫn sử dụng
   - Tương tác thuốc

3. **Báo cáo và thống kê**
   - Báo cáo định kỳ
   - Biểu đồ thống kê
   - Xuất dữ liệu

## 📝 Ghi chú

- Hệ thống sử dụng MongoDB làm cơ sở dữ liệu
- API được xây dựng với NestJS
- Frontend sử dụng Next.js với TypeScript
- Tất cả API đều trả về response format chuẩn với `success`, `data`, và `message`

## 🆘 Hỗ trợ

Nếu gặp vấn đề hoặc cần hỗ trợ, vui lòng:
1. Kiểm tra console để xem lỗi
2. Kiểm tra kết nối database
3. Kiểm tra các biến môi trường
4. Liên hệ team phát triển
