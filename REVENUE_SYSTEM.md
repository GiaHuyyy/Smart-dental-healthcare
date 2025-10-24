# Hệ Thống Thanh Toán và Doanh Thu Bác Sĩ

## Tổng Quan
Hệ thống này quản lý việc chuyển tiền từ thanh toán của bệnh nhân sang doanh thu của bác sĩ, với trang dashboard doanh thu chi tiết cho bác sĩ.

## Cấu Trúc Backend

### 1. Revenue Module (Mới)
**Location:** `server/src/modules/revenue/`

#### Schema: `revenue.schemas.ts`
Lưu trữ thông tin doanh thu của bác sĩ:
- `doctorId`: ID bác sĩ
- `paymentId`: ID thanh toán liên kết
- `patientId`: ID bệnh nhân
- `amount`: Số tiền gốc
- `platformFee`: Phí nền tảng (5%)
- `netAmount`: Số tiền thực nhận (amount - platformFee)
- `revenueDate`: Ngày phát sinh doanh thu
- `status`: Trạng thái (pending, completed, withdrawn, cancelled)
- `refId`: Reference đến Appointment/MedicalRecord
- `type`: Loại doanh thu (appointment, treatment, medicine, other)
- `notes`: Ghi chú
- `withdrawnDate`: Ngày rút tiền
- `withdrawnMethod`: Phương thức rút
- `withdrawnTransactionId`: Mã giao dịch rút tiền

#### Service: `revenue.service.ts`
Các API chính:

1. **`createRevenueFromPayment(paymentId)`**
   - Tự động tạo revenue khi payment status = completed
   - Tính phí nền tảng 5%
   - Tính số tiền thực nhận

2. **`getDoctorRevenueSummary(doctorId, startDate?, endDate?)`**
   - Tổng quan doanh thu
   - Phân bổ theo trạng thái
   - Biểu đồ xu hướng 12 tháng

3. **`getDoctorRevenues(doctorId, query, page, pageSize)`**
   - Danh sách doanh thu có phân trang
   - Hỗ trợ filter theo status, type, date range

4. **`getRevenueByDateRange(doctorId, startDate, endDate, status?)`**
   - Lấy doanh thu theo khoảng thời gian
   - Tính tổng summary

#### Controller: `revenue.controller.ts`
Endpoints:
- `POST /api/v1/revenue/from-payment/:paymentId` - Tạo revenue từ payment
- `GET /api/v1/revenue/doctor/:doctorId/summary` - Tổng quan doanh thu
- `GET /api/v1/revenue/doctor/:doctorId` - Danh sách doanh thu (phân trang)
- `GET /api/v1/revenue/doctor/:doctorId/range` - Doanh thu theo khoảng thời gian
- Standard CRUD endpoints

### 2. Cập Nhật Payment Module
**File:** `server/src/modules/payments/payments.service.ts`

#### Tích hợp RevenueService
- Import `RevenueService` vào `PaymentsService`
- Trong callback MoMo khi payment status = "completed":
  ```typescript
  if (status === 'completed') {
    await this.revenueService.createRevenueFromPayment(paymentId);
  }
  ```

#### Flow hoàn chỉnh:
1. Bệnh nhân thanh toán qua MoMo
2. MoMo callback về backend
3. Payment status cập nhật thành "completed"
4. **Tự động tạo revenue record**
5. Appointment status cập nhật thành "confirmed"

## Cấu Trúc Frontend

### 1. Revenue Service
**File:** `client/src/services/revenueService.ts`

API client để gọi các endpoint revenue:
- `getDoctorRevenueSummary()` - Lấy tổng quan
- `getDoctorRevenues()` - Lấy danh sách có phân trang
- `getRevenueByDateRange()` - Lấy theo khoảng thời gian
- `getRevenueDetail()` - Chi tiết một record
- `updateRevenue()` - Cập nhật (ví dụ: đánh dấu đã rút)

### 2. Revenue Dashboard Page
**File:** `client/src/app/doctor/revenue/page.tsx`

#### Tính năng chính:

1. **Thống kê tổng quan (4 cards)**
   - Tổng doanh thu
   - Phí nền tảng (5%)
   - Doanh thu thực nhận
   - Tỷ lệ tăng trưởng (so với tháng trước)

2. **Bộ lọc linh hoạt**
   - Khoảng thời gian: Tất cả, Tháng này, Tháng trước, Năm nay
   - Trạng thái: Tất cả, Hoàn thành, Chờ xử lý, Đã rút, Đã hủy
   - Loại doanh thu: Tất cả, Lịch khám, Điều trị, Thuốc, Khác

3. **Phân bổ theo trạng thái**
   - Cards hiển thị doanh thu theo từng trạng thái
   - Số giao dịch
   - Tổng tiền và thực nhận

4. **Bảng lịch sử doanh thu**
   - Hiển thị chi tiết từng giao dịch
   - Thông tin bệnh nhân
   - Số tiền, phí, thực nhận
   - Trạng thái và mã giao dịch
   - Phân trang

5. **UI/UX**
   - Responsive design
   - Color coding cho trạng thái
   - Icons trực quan
   - Loading states
   - Badge cho status và type

### 3. Table Component
**File:** `client/src/components/ui/table.tsx`

Component UI cho bảng dữ liệu, bao gồm:
- Table, TableHeader, TableBody
- TableRow, TableHead, TableCell
- TableFooter, TableCaption

### 4. Cập Nhật Doctor Dashboard
**File:** `client/src/app/doctor/page.tsx`

Thay đổi route của card "Doanh thu":
```typescript
case "income":
  router.push("/doctor/revenue"); // Thay vì /doctor/finances
```

## Cài Đặt và Chạy

### Backend

1. Import RevenueModule vào AppModule:
```typescript
// server/src/app.module.ts
import { RevenueModule } from './modules/revenue/revenue.module';

@Module({
  imports: [
    // ... other modules
    RevenueModule,
  ],
})
```

2. Start server:
```bash
cd server
npm install
npm run start:dev
```

### Frontend

1. Install dependencies (nếu cần):
```bash
cd client
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Truy cập trang doanh thu:
```
http://localhost:3000/doctor/revenue
```

## API Endpoints Summary

### Revenue APIs
- **GET** `/api/v1/revenue/doctor/:doctorId/summary` - Tổng quan doanh thu
  - Query params: `startDate`, `endDate`
  
- **GET** `/api/v1/revenue/doctor/:doctorId` - Danh sách doanh thu
  - Query params: `current`, `pageSize`, `status`, `type`, `revenueDate[$gte]`, `revenueDate[$lte]`
  
- **GET** `/api/v1/revenue/doctor/:doctorId/range` - Doanh thu theo khoảng thời gian
  - Query params: `startDate` (required), `endDate` (required), `status`
  
- **POST** `/api/v1/revenue/from-payment/:paymentId` - Tạo revenue từ payment
  
- **GET** `/api/v1/revenue/:id` - Chi tiết revenue
  
- **PATCH** `/api/v1/revenue/:id` - Cập nhật revenue

### Existing Payment APIs
- **POST** `/api/v1/payments/momo/create` - Tạo thanh toán MoMo
- **POST** `/api/v1/payments/momo/callback` - MoMo callback (tự động tạo revenue)
- **GET** `/api/v1/payments/doctor/:doctorId` - Danh sách thanh toán của bác sĩ

## Luồng Hoạt Động

### 1. Thanh Toán → Doanh Thu
```
Bệnh nhân thanh toán
    ↓
MoMo xử lý thanh toán
    ↓
MoMo callback về server
    ↓
Payment status = "completed"
    ↓
Tự động tạo Revenue record
    ↓
Appointment status = "confirmed"
```

### 2. Bác Sĩ Xem Doanh Thu
```
Bác sĩ truy cập /doctor/revenue
    ↓
Load tổng quan doanh thu
    ↓
Hiển thị thống kê + biểu đồ
    ↓
Hiển thị danh sách chi tiết
    ↓
Bác sĩ có thể filter theo nhiều tiêu chí
```

## Tính Năng Nổi Bật

### 1. Tự Động Hóa
- Revenue tự động được tạo khi payment hoàn thành
- Không cần can thiệp thủ công

### 2. Tính Phí Nền Tảng
- Tự động tính 5% phí nền tảng
- Hiển thị rõ ràng số tiền thực nhận

### 3. Báo Cáo Chi Tiết
- Tổng quan theo nhiều góc độ
- Phân tích theo trạng thái
- Xu hướng 12 tháng

### 4. Filter Mạnh Mẽ
- Theo thời gian (tháng, năm, custom range)
- Theo trạng thái
- Theo loại doanh thu
- Phân trang hiệu quả

### 5. UI/UX Tốt
- Responsive
- Loading states
- Color coding
- Icons trực quan
- Badge cho status

## Mở Rộng Tương Lai

### 1. Rút Tiền
- API để bác sĩ yêu cầu rút tiền
- Cập nhật status sang "withdrawn"
- Lưu thông tin giao dịch rút tiền

### 2. Xuất Báo Cáo
- Export Excel/PDF
- Báo cáo theo tháng/quý/năm
- Gửi email báo cáo định kỳ

### 3. Biểu Đồ Nâng Cao
- Chart.js hoặc Recharts
- Biểu đồ cột, đường, tròn
- So sánh theo thời gian

### 4. Thông Báo
- Thông báo khi có doanh thu mới
- Nhắc nhở rút tiền
- Alert khi doanh thu giảm

## Lưu Ý Quan Trọng

1. **Bảo Mật**
   - Chỉ bác sĩ mới xem được doanh thu của mình
   - Validate doctorId trong mọi request
   - Sử dụng JWT authentication

2. **Performance**
   - Index trên doctorId và revenueDate
   - Pagination cho danh sách lớn
   - Cache summary data nếu cần

3. **Testing**
   - Test flow payment → revenue
   - Test các filter combinations
   - Test pagination
   - Test error cases

4. **Monitoring**
   - Log khi tạo revenue
   - Monitor failed revenue creations
   - Alert nếu revenue không được tạo sau payment completed

## Hỗ Trợ

Nếu có vấn đề, kiểm tra:
1. RevenueModule đã được import vào AppModule chưa
2. Database connection
3. MoMo callback có gọi đúng endpoint không
4. Logs trong console/terminal
5. Network tab trong browser DevTools
