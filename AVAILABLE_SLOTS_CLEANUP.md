# Available Slots Cleanup & Calendar Filter Summary

## Ngày thực hiện: 13/10/2025

## Vấn đề

1. **Duplicate `getAvailableSlots` functions**: Có 2 hàm cùng tên trong `appointments.service.ts`
2. **Calendar hiển thị lịch đã hủy**: Các API calendar không filter appointments đã CANCELLED

## Giải pháp thực hiện

### 1. Xóa hàm `getAvailableSlots` cũ (đã comment)

**Vị trí**: `appointments.service.ts` lines 905-991

**Hàm cũ** (đã xóa):

- Không hỗ trợ `durationMinutes` parameter
- Fixed 30 phút
- Return format: `{ availableSlots, unavailableSlots, date }`

**Hàm mới** (giữ lại - line 1184):

```typescript
async getAvailableSlots(
  doctorId: string,
  date: string,
  durationMinutes: number = 30,
)
```

**Ưu điểm hàm mới**:

- ✅ Hỗ trợ duration linh hoạt (30 hoặc 60 phút)
- ✅ Return metadata đầy đủ: `{ date, duration, bookedSlots, availableSlots, totalSlots, availableCount }`
- ✅ Exclude cả CANCELLED và COMPLETED appointments
- ✅ Tích hợp với TimeSlotPicker component

### 2. Thêm filter loại bỏ CANCELLED appointments khỏi calendar

#### Các API đã được cập nhật:

1. **`findByDoctor(doctorId, query)`** - Line 361

   ```typescript
   status: {
     $ne: AppointmentStatus.CANCELLED;
   }
   ```

   - Dùng để hiển thị tất cả appointments của bác sĩ
   - Calendar của bác sĩ

2. **`findByDate(date, query)`** - Line 620

   ```typescript
   status: {
     $ne: AppointmentStatus.CANCELLED;
   }
   ```

   - Dùng để xem appointments theo ngày cụ thể
   - Daily calendar view

3. **`findByDateRange(startDate, endDate, query)`** - Line 658

   ```typescript
   status: {
     $ne: AppointmentStatus.CANCELLED;
   }
   ```

   - Dùng để xem appointments trong khoảng thời gian
   - Weekly/Range calendar view

4. **`findByMonth(year, month, query)`** - Line 690
   ```typescript
   status: {
     $ne: AppointmentStatus.CANCELLED;
   }
   ```
   - Dùng để xem appointments theo tháng
   - Monthly calendar view

## Kết quả

### ✅ Trước khi fix:

- 2 hàm `getAvailableSlots` gây confusion
- Calendar hiển thị cả appointments đã hủy
- Bác sĩ thấy lịch đã hủy trên calendar

### ✅ Sau khi fix:

- Chỉ còn 1 hàm `getAvailableSlots` với đầy đủ tính năng
- Calendar chỉ hiển thị appointments:
  - PENDING (Đang chờ)
  - CONFIRMED (Đã xác nhận)
  - IN_PROGRESS (Đang tiến hành)
  - COMPLETED (Đã hoàn thành)
- Không hiển thị appointments CANCELLED

## API Endpoints ảnh hưởng

1. `GET /api/v1/appointments/doctor/:doctorId/available-slots` - Available slots checking
2. `GET /api/v1/appointments/doctor/:doctorId` - Doctor's all appointments
3. `GET /api/v1/appointments/date/:date` - Appointments by date
4. `GET /api/v1/appointments/week/:startDate/:endDate` - Appointments by date range
5. `GET /api/v1/appointments/month/:year/:month` - Appointments by month

## Testing checklist

- [ ] Test API `available-slots` với duration 30 phút
- [ ] Test API `available-slots` với duration 60 phút
- [ ] Verify calendar không hiển thị CANCELLED appointments
- [ ] Test doctor calendar view (daily/weekly/monthly)
- [ ] Verify COMPLETED appointments vẫn hiển thị trên calendar
- [ ] Test time slot booking với doctor availability

## Notes

- Các API history (`findHistoryByDoctor`, `findHistoryByPatient`) vẫn trả về CANCELLED appointments - đây là behavior mong muốn vì history cần hiển thị tất cả
- `findUpcomingByDoctor` và `findUpcomingByPatient` chỉ trả về PENDING và CONFIRMED - không cần thay đổi
- Lỗi TypeScript còn lại (unsafe `any` assignments) là lỗi cũ, không ảnh hưởng functionality

## Related Files

- `server/src/modules/appointments/appointments.service.ts`
- `server/src/modules/appointments/appointments.controller.ts` (route order đã fix trước đó)
- `client/src/components/appointments/TimeSlotPicker.tsx`
- `client/src/app/patient/appointments/page.tsx`
