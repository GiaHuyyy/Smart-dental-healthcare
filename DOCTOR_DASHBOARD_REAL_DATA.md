# Doctor Dashboard - Real Data Integration

## Tổng quan

Đã thay thế toàn bộ dữ liệu mẫu (mock data) bằng dữ liệu thật từ database cho trang tổng quan bác sĩ.

## Các thay đổi chính

### 1. Service Layer (`client/src/services/doctorDashboardService.ts`)

#### Thêm interfaces mới:

- **`DashboardStats`**: Chứa thống kê tổng quan

  ```typescript
  {
    totalPatients: number;
    totalAppointments: number;
    totalIncome: number;
    totalTreatments: number;
    patientGrowth: number;
    appointmentGrowth: number;
    incomeGrowth: number;
    treatmentGrowth: number;
  }
  ```

- **`ChartDataPoint`**: Cấu trúc dữ liệu cho biểu đồ
  ```typescript
  {
    period: string; // "T1", "T2", ... hoặc "1", "2", ... (ngày)
    hoanthanh: number; // Số lịch hẹn hoàn thành
    huy: number; // Số lịch hẹn bị hủy
    choXuLy: number; // Số lịch hẹn đang chờ xử lý
  }
  ```

#### Thêm methods mới:

1. **`getDashboardStats(doctorId, token)`**

   - Lấy thống kê tổng quan từ nhiều nguồn:
     - `/api/v1/users/patient-stats`: Thống kê bệnh nhân
     - `/api/v1/appointments/doctor/{doctorId}`: Tất cả appointments
     - `/api/v1/prescriptions/stats`: Thống kê đơn thuốc
   - Tính toán:
     - Tổng doanh thu từ appointments đã hoàn thành
     - Tỷ lệ tăng trưởng so với tháng trước (appointments, income)
     - Tỷ lệ bệnh nhân mới

2. **`getChartData(doctorId, year, month?, token)`**
   - Lấy dữ liệu biểu đồ theo năm hoặc tháng
   - Nếu `month` được cung cấp: trả về dữ liệu theo ngày trong tháng (1-31)
   - Nếu không có `month`: trả về dữ liệu theo tháng trong năm (T1-T12)
   - Phân loại appointments theo status:
     - `hoanthanh`: status = "completed"
     - `huy`: status = "cancelled"
     - `choXuLy`: status = "pending", "confirmed", "in-progress"

### 2. Dashboard Component (`client/src/app\doctor\page.tsx`)

#### State Management:

```typescript
const [loading, setLoading] = useState(true);
const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
```

#### Data Loading:

- **useEffect chính**: Load tất cả dữ liệu khi component mount hoặc khi year/month thay đổi

  ```typescript
  Promise.all([getDashboardStats(), getTodayAppointments(), getChartData()]);
  ```

- **useEffect phụ**: Load lại chart data khi người dùng thay đổi năm hoặc tháng

#### Stats Cards - Hiển thị dữ liệu thật:

1. **Tổng bệnh nhân**

   - Giá trị: `dashboardStats?.totalPatients`
   - Tăng trưởng: `dashboardStats?.patientGrowth`
   - Click → `/doctor/patients`

2. **Tổng lịch hẹn**

   - Giá trị: `dashboardStats?.totalAppointments`
   - Tăng trưởng: `dashboardStats?.appointmentGrowth`
   - Màu sắc động: xanh nếu tăng, đỏ nếu giảm
   - Click → `/doctor/schedule`

3. **Tổng doanh thu**

   - Giá trị: `dashboardStats?.totalIncome` (format VND)
   - Tăng trưởng: `dashboardStats?.incomeGrowth`
   - Màu sắc động: xanh nếu tăng, đỏ nếu giảm
   - Click → `/doctor/finances`

4. **Tổng điều trị**
   - Giá trị: `dashboardStats?.totalTreatments`
   - Tăng trưởng: `dashboardStats?.treatmentGrowth`
   - Click → `/doctor/medical-records`

#### Biểu đồ Line Chart:

- Sử dụng dữ liệu từ `chartData` state
- X-axis: `period` (dynamic: "T1"-"T12" hoặc "1"-"31")
- Y-axis: Auto scale dựa trên dữ liệu thực
- Tooltip: Hiển thị chi tiết theo ngày/tháng với format đúng

#### Lịch hẹn hôm nay:

- Load từ API: `getTodayAppointments()`
- Hiển thị theo time slots (08:00 - 16:00)
- Status indicator màu động
- Current time indicator

## API Endpoints được sử dụng

### Đã có sẵn:

1. `GET /api/v1/users/patient-stats?doctorId={doctorId}`
2. `GET /api/v1/appointments/doctor/{doctorId}`
3. `GET /api/v1/prescriptions/stats?doctorId={doctorId}`

### Lưu ý:

- Tất cả endpoints đều support optional token trong header
- Dữ liệu được xử lý và tính toán ở client side
- Error handling được implement đầy đủ với fallback values (0 cho số liệu)

## Tính năng bổ sung

### Growth Calculation:

- So sánh dữ liệu tháng hiện tại với tháng trước
- Công thức: `((thisMonth - lastMonth) / lastMonth) * 100`
- Hiển thị màu sắc động: xanh (tăng), đỏ (giảm)

### Chart Interaction:

- Dropdown chọn tháng (0 = cả năm, 1-12 = từng tháng)
- Dropdown chọn năm (2023, 2024, 2025)
- Tự động reload chart data khi thay đổi filter

### Loading States:

- Loading spinner khi đang fetch data
- Error message khi fetch thất bại
- Retry button cho error cases

## Testing Checklist

- [x] Stats cards hiển thị dữ liệu đúng từ API
- [x] Growth indicators tính toán chính xác
- [x] Chart data load đúng theo tháng/năm
- [x] Today appointments hiển thị đúng status và thời gian
- [x] Error handling hoạt động
- [x] Loading states hiển thị
- [x] Click navigation hoạt động
- [x] No TypeScript errors
- [x] Responsive design maintained

## Các file đã thay đổi

1. `client/src/services/doctorDashboardService.ts`

   - Thêm interfaces: `DashboardStats`, `ChartDataPoint`
   - Thêm methods: `getDashboardStats()`, `getChartData()`

2. `client/src/app/doctor/page.tsx`
   - Xóa toàn bộ mock data
   - Thêm state management cho real data
   - Implement data loading logic
   - Update UI components để sử dụng real data

## Khuyến nghị tiếp theo

### Backend enhancements:

1. Tạo endpoint tổng hợp `/api/v1/doctors/{doctorId}/dashboard` để giảm số lượng API calls
2. Thêm caching cho dashboard data
3. Implement pagination cho chart data nếu cần
4. Thêm endpoint riêng cho treatment statistics

### Frontend improvements:

1. Thêm date range picker cho custom period
2. Implement real-time updates với WebSocket
3. Thêm export data functionality
4. Cache dashboard data trong localStorage/sessionStorage

### Performance:

1. Implement React Query/SWR cho data fetching
2. Add debounce cho filter changes
3. Lazy load chart component
4. Optimize re-renders với useMemo/useCallback
