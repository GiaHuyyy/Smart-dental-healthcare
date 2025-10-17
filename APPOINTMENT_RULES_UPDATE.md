# Cập nhật quy tắc đặt lịch và thêm chức năng thay đổi lịch khám

## Tóm tắt các thay đổi

Đã cập nhật hệ thống đặt lịch khám với các quy tắc mới và thêm chức năng thay đổi lịch khám cho bệnh nhân.

## 1. Quy tắc đặt lịch mới - Tối thiểu 1 tiếng trước

### File: `client/src/components/appointments/TimeSlotPicker.tsx`

**Thay đổi:**

- Thêm constant `MINIMUM_LEAD_TIME_MINUTES = 60` (1 tiếng)
- Cập nhật logic kiểm tra slot khả dụng để tính toán khoảng cách thời gian từ hiện tại
- Slot không khả dụng nếu khoảng cách < 60 phút

**Code:**

```typescript
const MINIMUM_LEAD_TIME_MINUTES = 60;

// Calculate time difference in minutes
const timeDifferenceMs = slotDateTime.getTime() - now.getTime();
const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

// Slot is invalid if it's in the past OR less than 1 hour from now
isPast = timeDifferenceMinutes < MINIMUM_LEAD_TIME_MINUTES;
```

**Kết quả:**

- ✅ Bệnh nhân chỉ có thể chọn các khung giờ cách thời điểm hiện tại ít nhất 1 tiếng
- ✅ Ngăn chặn đặt lịch gấp quá, đảm bảo bác sĩ có thời gian chuẩn bị

---

## 2. Quy tắc hủy lịch - Chỉ cho phép hủy trước 30 phút

### File: `client/src/app/patient/appointments/my-appointments/page.tsx`

**Thay đổi:**

- Thêm helper function `canCancelAppointment()` để kiểm tra xem có thể hủy lịch không
- Thêm helper function `canRescheduleAppointment()` để kiểm tra xem có thể đổi lịch không
- Cập nhật UI để chỉ hiển thị nút "Hủy lịch" khi còn ít nhất 30 phút

**Code:**

```typescript
const canCancelAppointment = (appointment: Appointment): boolean => {
  try {
    const now = new Date();
    const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.startTime}`);
    const timeDifferenceMs = appointmentDateTime.getTime() - now.getTime();
    const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

    // Can cancel only if appointment is at least 30 minutes away
    return timeDifferenceMinutes >= 30;
  } catch (error) {
    console.error("Error checking cancel eligibility:", error);
    return false;
  }
};
```

**UI Changes:**

```tsx
{
  appointment.status === AppointmentStatus.PENDING && canCancelAppointment(appointment) && (
    <button onClick={() => handleOpenCancelDialog(appointment)}>Hủy lịch</button>
  );
}
{
  appointment.status === AppointmentStatus.PENDING && !canCancelAppointment(appointment) && (
    <div className="text-xs text-gray-500 italic">Không thể hủy lịch (còn dưới 30 phút)</div>
  );
}
```

**Kết quả:**

- ✅ Bệnh nhân chỉ có thể hủy lịch khi còn ít nhất 30 phút trước giờ khám
- ✅ Ngăn chặn hủy lịch phút chót, giảm thiểu ảnh hưởng đến lịch làm việc của bác sĩ
- ✅ Hiển thị thông báo rõ ràng khi không thể hủy

---

## 3. Chức năng thay đổi lịch khám (Reschedule)

### 3.1. Backend API

#### File: `server/src/modules/appointments/appointments.service.ts`

**API đã có sẵn:**

- Method `rescheduleAppointment()` đã tồn tại trong service
- Xử lý logic:
  - Kiểm tra appointment có tồn tại
  - Kiểm tra trạng thái (không thể đổi lịch đã hoàn thành)
  - Kiểm tra trùng lặp khung giờ với bác sĩ
  - Tạo appointment mới với thông tin cập nhật
  - Hủy appointment cũ với lý do "Đã đổi lịch"
  - Đồng bộ với medical record

#### File: `server/src/modules/appointments/appointments.controller.ts`

**Cập nhật:**

```typescript
@Patch(':id/reschedule')
@Public()
@ResponseMessage('Đổi lịch hẹn thành công')
reschedule(
  @Param('id') id: string,
  @Body() updateAppointmentDto: UpdateAppointmentDto,
) {
  return this.appointmentsService.rescheduleAppointment(
    id,
    updateAppointmentDto,
  );
}
```

**Endpoint:** `PATCH /api/v1/appointments/:id/reschedule`

**Request Body:**

```json
{
  "appointmentDate": "2025-10-20",
  "startTime": "14:00",
  "endTime": "14:30",
  "duration": 30
}
```

---

### 3.2. Client Service

#### File: `client/src/services/appointmentService.ts`

**Cập nhật:**

```typescript
async rescheduleAppointment(
  appointmentId: string,
  updateData: {
    appointmentDate: string;
    startTime: string;
    endTime?: string;
    duration?: number;
  },
  token?: string
): Promise<AppointmentResponse>
```

**Kết quả:**

- ✅ Service method nhận đầy đủ thông tin cần thiết
- ✅ Xử lý response và error một cách chính xác

---

### 3.3. UI Component - Reschedule Modal

#### File: `client/src/components/appointments/RescheduleModal.tsx` (MỚI)

**Component mới:**

- Hiển thị TimeSlotPicker để chọn ngày giờ mới
- Tái sử dụng component TimeSlotPicker (DRY principle)
- UI/UX nhất quán với booking flow

**Props:**

```typescript
interface RescheduleModalProps {
  appointment: Appointment;
  doctor: Doctor;
  onClose: () => void;
  onConfirm: (newDate: string, newTime: string, newEndTime: string) => void;
}
```

**Features:**

- ✅ Hiển thị thông tin bác sĩ
- ✅ Cho phép chọn ngày giờ mới
- ✅ Áp dụng quy tắc 1 tiếng tối thiểu (thông qua TimeSlotPicker)
- ✅ Nút xác nhận chỉ active khi đã chọn đủ thông tin

---

### 3.4. Integration vào My Appointments Page

#### File: `client/src/app/patient/appointments/my-appointments/page.tsx`

**Thêm state:**

```typescript
const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
```

**Thêm handlers:**

```typescript
const handleOpenRescheduleDialog = (appointment: Appointment) => {
  setAppointmentToReschedule(appointment);
  setRescheduleDialogOpen(true);
};

const handleRescheduleConfirm = async (newDate: string, newTime: string, newEndTime: string) => {
  // Calculate duration
  // Call API
  // Handle success/error
  // Refresh appointments list
};
```

**UI Integration:**

```tsx
{appointment.status === AppointmentStatus.CONFIRMED && canRescheduleAppointment(appointment) && (
  <button onClick={() => handleOpenRescheduleDialog(appointment)}>
    Đổi lịch
  </button>
)}

{rescheduleDialogOpen && appointmentToReschedule && (
  <RescheduleModal
    appointment={appointmentToReschedule}
    doctor={appointmentToReschedule.doctor}
    onClose={...}
    onConfirm={handleRescheduleConfirm}
  />
)}
```

**Kết quả:**

- ✅ Nút "Đổi lịch" chỉ hiển thị cho appointment đã confirmed
- ✅ Chỉ cho phép đổi lịch khi còn ít nhất 30 phút
- ✅ Modal mở ra với TimeSlotPicker
- ✅ Sau khi đổi lịch, refresh danh sách tự động

---

## 4. Tổng kết các quy tắc mới

### Quy tắc đặt lịch:

1. ✅ **Tối thiểu 1 tiếng trước:** Bệnh nhân chỉ có thể chọn khung giờ cách thời điểm hiện tại ít nhất 60 phút
2. ✅ **Áp dụng cho cả đặt mới và đổi lịch:** TimeSlotPicker được dùng chung

### Quy tắc hủy lịch:

1. ✅ **Tối thiểu 30 phút trước:** Chỉ cho phép hủy khi còn ít nhất 30 phút trước giờ khám
2. ✅ **Thông báo rõ ràng:** Hiển thị message khi không thể hủy
3. ✅ **Áp dụng cho PENDING status**

### Quy tắc đổi lịch:

1. ✅ **Tối thiểu 30 phút trước:** Chỉ cho phép đổi khi còn ít nhất 30 phút trước giờ khám
2. ✅ **Áp dụng cho CONFIRMED status**
3. ✅ **Tạo appointment mới, hủy appointment cũ:** Đảm bảo lịch sử rõ ràng
4. ✅ **Kiểm tra trùng lặp:** Backend kiểm tra xem bác sĩ có lịch vào khung giờ mới không

---

## 5. Flow hoạt động

### Flow đặt lịch mới:

```
1. Bệnh nhân chọn bác sĩ
2. Mở TimeSlotPicker
3. Chọn ngày
4. Hiển thị các slot khả dụng (chỉ slot >= 1 tiếng từ bây giờ)
5. Chọn slot và tiếp tục
6. Điền thông tin và đặt lịch
```

### Flow hủy lịch:

```
1. Bệnh nhân vào "Lịch hẹn của tôi"
2. Xem appointment với status PENDING
3. Nếu còn >= 30 phút → Hiển thị nút "Hủy lịch"
4. Nếu còn < 30 phút → Hiển thị "Không thể hủy lịch (còn dưới 30 phút)"
5. Click "Hủy lịch" → Nhập lý do → Xác nhận
6. Backend cập nhật status = CANCELLED
```

### Flow đổi lịch:

```
1. Bệnh nhân vào "Lịch hẹn của tôi"
2. Xem appointment với status CONFIRMED
3. Nếu còn >= 30 phút → Hiển thị nút "Đổi lịch"
4. Click "Đổi lịch" → Mở RescheduleModal
5. Chọn ngày giờ mới trong TimeSlotPicker (áp dụng rule 1 tiếng)
6. Xác nhận thay đổi
7. Backend:
   - Tạo appointment mới với thông tin mới
   - Hủy appointment cũ (status = CANCELLED, reason = "Đã đổi lịch")
8. Refresh danh sách appointment
```

---

## 6. Files đã thay đổi

### Backend:

1. ✅ `server/src/modules/appointments/appointments.controller.ts` - Cập nhật reschedule endpoint
2. ✅ `server/src/modules/appointments/appointments.service.ts` - Logic reschedule đã có sẵn

### Frontend:

1. ✅ `client/src/components/appointments/TimeSlotPicker.tsx` - Thêm rule 1 tiếng tối thiểu
2. ✅ `client/src/app/patient/appointments/my-appointments/page.tsx` - Thêm logic hủy/đổi lịch
3. ✅ `client/src/components/appointments/RescheduleModal.tsx` - Component mới
4. ✅ `client/src/services/appointmentService.ts` - Cập nhật reschedule method

---

## 7. Testing

### Các scenario cần test:

#### Đặt lịch mới:

- ✅ Không thể chọn slot trong quá khứ
- ✅ Không thể chọn slot < 1 tiếng từ bây giờ
- ✅ Có thể chọn slot >= 1 tiếng từ bây giờ

#### Hủy lịch:

- ✅ Hiển thị nút "Hủy lịch" khi còn >= 30 phút
- ✅ Không hiển thị nút khi còn < 30 phút
- ✅ Hiển thị message khi không thể hủy
- ✅ Hủy thành công cập nhật status

#### Đổi lịch:

- ✅ Hiển thị nút "Đổi lịch" cho CONFIRMED appointment còn >= 30 phút
- ✅ Modal mở với TimeSlotPicker
- ✅ Áp dụng rule 1 tiếng trong TimeSlotPicker
- ✅ Tạo appointment mới, hủy appointment cũ
- ✅ Refresh danh sách sau khi đổi

---

## 8. Lưu ý quan trọng

1. **Timezone:** Đảm bảo xử lý timezone đúng khi so sánh thời gian
2. **Real-time updates:** Socket notification sẽ cập nhật danh sách appointment tự động
3. **Payment handling:** Khi đổi lịch, cần xem xét việc xử lý payment (nếu đã thanh toán)
4. **Email notifications:** Có thể cần thêm email thông báo khi đổi lịch
5. **Mobile app:** Cần cập nhật tương tự cho mobile app

---

## 9. Các cải tiến có thể làm trong tương lai

1. **Flexible time rules:** Cho phép admin cấu hình thời gian tối thiểu (hiện tại hardcode 60 và 30 phút)
2. **Reschedule limit:** Giới hạn số lần đổi lịch cho mỗi appointment
3. **Smart suggestions:** Gợi ý khung giờ tương tự khi đổi lịch
4. **Batch operations:** Cho phép đổi/hủy nhiều lịch cùng lúc
5. **Penalty system:** Áp dụng phí hủy/đổi lịch nếu quá gần giờ khám

---

Ngày cập nhật: 17/10/2025
