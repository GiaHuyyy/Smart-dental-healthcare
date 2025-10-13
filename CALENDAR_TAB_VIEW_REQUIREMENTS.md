# Available Slots & Calendar View - Updated Requirements

## Ngày cập nhật: 13/10/2025

## Yêu cầu chính xác

### 1. Duplicate Functions ✅

- **Vấn đề**: Có 2 hàm `getAvailableSlots` trong service
- **Giải pháp**: Xóa hàm cũ (đã comment), giữ hàm mới hỗ trợ duration linh hoạt

### 2. Calendar View vs Tab View ✅

- **Calendar View**: KHÔNG hiển thị lịch CANCELLED
- **Tab/List View**: VẪN hiển thị tất cả trạng thái kể cả CANCELLED

### 3. Available Slots ✅

- **Yêu cầu**: Cho phép đặt trùng giờ với lịch đã hủy (CANCELLED)
- **Logic**: Chỉ disable giờ của lịch ACTIVE (PENDING, CONFIRMED, IN_PROGRESS) và COMPLETED

## Implementation Details

### API Calendar View (exclude CANCELLED)

#### 1. `findByDate(date, query)` - Line 620

```typescript
status: {
  $ne: AppointmentStatus.CANCELLED;
}
```

**Sử dụng**: Daily calendar view - Không hiển thị lịch đã hủy

#### 2. `findByDateRange(startDate, endDate, query)` - Line 658

```typescript
status: {
  $ne: AppointmentStatus.CANCELLED;
}
```

**Sử dụng**: Weekly/Range calendar view - Không hiển thị lịch đã hủy

#### 3. `findByMonth(year, month, query)` - Line 690

```typescript
status: {
  $ne: AppointmentStatus.CANCELLED;
}
```

**Sử dụng**: Monthly calendar view - Không hiển thị lịch đã hủy

---

### API List/Tab View (include ALL statuses)

#### 1. `findByDoctor(doctorId, query)` - Line 361

```typescript
// KHÔNG filter status - trả về TẤT CẢ
.find({
  ...filter,
  doctorId,
})
```

**Sử dụng**:

- Tab "Danh sách lịch hẹn" của bác sĩ
- **VẪN hiển thị CANCELLED** để xem lịch sử đầy đủ
- Frontend có thể filter bằng query: `?status[$ne]=CANCELLED` nếu cần

#### 2. `findByPatient(patientId, query)` - Line 346

```typescript
// KHÔNG filter status - trả về TẤT CẢ
.find({
  ...filter,
  patientId,
})
```

**Sử dụng**: Tab lịch hẹn của bệnh nhân - Hiển thị tất cả

---

### Booking Available Slots

#### `getAvailableSlots(doctorId, date, duration)` - Line 1099

```typescript
const bookedAppointments = await this.appointmentModel
  .find({
    doctorId,
    appointmentDate: { $gte: targetDate, $lte: endDate },
    status: {
      $nin: [AppointmentStatus.CANCELLED], // CHỈ exclude CANCELLED
    },
  })
  .select("startTime endTime")
  .lean();
```

**Logic**:

- ✅ Giờ của lịch **CANCELLED** → **AVAILABLE** (có thể đặt lại)
- ❌ Giờ của lịch **PENDING/CONFIRMED/IN_PROGRESS** → **DISABLED**
- ❌ Giờ của lịch **COMPLETED** → **DISABLED** (tránh overlap)

**Lý do giữ COMPLETED**:

- Lịch đã hoàn thành vẫn cần check để tránh overlap với lịch sử khám
- Đảm bảo không đặt 2 lịch cùng lúc

---

## Behavior Summary

| Trường hợp    | Calendar View         | Tab/List View       | Available Slots  |
| ------------- | --------------------- | ------------------- | ---------------- |
| PENDING       | ✅ Hiển thị           | ✅ Hiển thị         | ❌ Disabled      |
| CONFIRMED     | ✅ Hiển thị           | ✅ Hiển thị         | ❌ Disabled      |
| IN_PROGRESS   | ✅ Hiển thị           | ✅ Hiển thị         | ❌ Disabled      |
| COMPLETED     | ✅ Hiển thị           | ✅ Hiển thị         | ❌ Disabled      |
| **CANCELLED** | ❌ **KHÔNG hiển thị** | ✅ **VẪN hiển thị** | ✅ **Available** |

---

## API Endpoints

### Calendar APIs (exclude CANCELLED)

```
GET /api/v1/appointments/date/:date
GET /api/v1/appointments/week/:startDate/:endDate
GET /api/v1/appointments/month/:year/:month
```

### List/Tab APIs (include ALL)

```
GET /api/v1/appointments/doctor/:doctorId
GET /api/v1/appointments/patient/:patientId
```

**Note**: Có thể thêm query parameter để filter:

- `?status=CANCELLED` - Chỉ lấy đã hủy
- `?status[$ne]=CANCELLED` - Loại bỏ đã hủy

### Booking API

```
GET /api/v1/appointments/doctor/:doctorId/available-slots?date=YYYY-MM-DD&duration=30
```

**Behavior**: CANCELLED slots = available

---

## Testing Checklist

### Calendar View

- [ ] Calendar KHÔNG hiển thị lịch CANCELLED
- [ ] Calendar hiển thị PENDING, CONFIRMED, IN_PROGRESS, COMPLETED

### Tab/List View

- [ ] Tab "Tất cả" VẪN hiển thị lịch CANCELLED
- [ ] Có thể filter/sort theo status

### Available Slots

- [ ] Giờ của lịch CANCELLED → có thể chọn được (màu xanh/available)
- [ ] Giờ của lịch PENDING → disabled (màu xám)
- [ ] Giờ của lịch CONFIRMED → disabled
- [ ] Giờ của lịch COMPLETED → disabled
- [ ] Đặt lịch trùng giờ với CANCELLED → thành công
- [ ] Đặt lịch trùng giờ với PENDING/CONFIRMED → báo lỗi

### Integration

- [ ] Bác sĩ hủy lịch → slot available ngay lập tức
- [ ] Bệnh nhân hủy lịch → slot available ngay lập tức
- [ ] Lịch COMPLETED không thể đặt trùng

---

## Frontend Implementation Notes

### Calendar Component

```typescript
// Sử dụng API calendar (đã filter CANCELLED)
GET / api / v1 / appointments / month / 2025 / 10;
// Response tự động exclude CANCELLED
```

### List/Tab Component

```typescript
// Sử dụng API list (bao gồm tất cả)
GET /api/v1/appointments/doctor/${doctorId}
// Hiển thị tất cả statuses
// Có badge màu cho từng status
```

### Booking Component (TimeSlotPicker)

```typescript
// API available-slots tự động exclude CANCELLED
GET /api/v1/appointments/doctor/${doctorId}/available-slots?date=2025-10-13&duration=30
// CANCELLED slots sẽ không nằm trong bookedSlots
// → Hiển thị là available
```

---

## Related Files Modified

1. `server/src/modules/appointments/appointments.service.ts`

   - Line 361: `findByDoctor()` - Reverted, không filter
   - Line 620: `findByDate()` - Filter CANCELLED
   - Line 658: `findByDateRange()` - Filter CANCELLED
   - Line 690: `findByMonth()` - Filter CANCELLED
   - Line 1099: `getAvailableSlots()` - Chỉ exclude CANCELLED

2. `server/src/modules/appointments/appointments.controller.ts`

   - Route order đã fix (available-slots before :id)

3. `client/src/components/appointments/TimeSlotPicker.tsx`
   - Fetch available slots từ API
   - Hiển thị available/disabled slots

---

## Notes

- **History APIs**: Vẫn trả về tất cả statuses (đúng)
- **Upcoming APIs**: Chỉ trả về PENDING/CONFIRMED (đúng)
- **Query Parameters**: Frontend có thể dùng `aqp` syntax để filter thêm
- **TypeScript errors**: Là lỗi cũ (unsafe any), không ảnh hưởng chức năng
