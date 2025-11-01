# Sửa lỗi setup giờ cho chức năng Đề xuất Tái khám

## Vấn đề

Khi bác sĩ tạo đề xuất tái khám, hệ thống đang lưu thời gian được đề xuất (`suggestedTime`) trực tiếp vào các trường `startTime` và `endTime` của appointment. Điều này khiến đề xuất trở thành một lịch hẹn có giờ cố định thay vì một đề xuất linh hoạt cho phép bệnh nhân chọn thời gian phù hợp.

## Yêu cầu đúng

1. **Đề xuất tái khám** chỉ là một đề xuất, không phải lịch hẹn thực sự
2. Bệnh nhân sẽ quyết định thời gian khi họ nhấn "Lên lịch tái khám"
3. Thời gian của bác sĩ đề xuất chỉ là gợi ý, được lưu trong `suggestedFollowUpDate` và `suggestedFollowUpTime`
4. Khi bệnh nhân xác nhận, họ có thể chọn thời gian khác hoặc sử dụng thời gian đề xuất

## Các thay đổi đã thực hiện

### 1. Backend - Sửa logic tạo đề xuất tái khám

**File:** `server/src/modules/appointments/appointments.service.ts`

- **Trước:** Lưu `suggestedDate` vào `appointmentDate` và `suggestedTime` vào `startTime`/`endTime`
- **Sau:** Không set `appointmentDate`, `startTime`, `endTime` khi tạo đề xuất. Chỉ lưu gợi ý trong `suggestedFollowUpDate` và `suggestedFollowUpTime`

```typescript
// Đề xuất chỉ chứa thông tin gợi ý, không có thời gian cố định
const followUpAppointment = new this.appointmentModel({
  patientId: (parentAppointment.patientId as any)._id,
  doctorId: (parentAppointment.doctorId as any)._id,
  // Do NOT set these yet - patient will choose when they accept
  appointmentDate: undefined,
  startTime: undefined,
  endTime: undefined,
  duration: 30,
  appointmentType: "Tái khám",
  consultationFee: parentAppointment.consultationFee,
  notes: notes || "Lịch tái khám theo đề xuất của bác sĩ",
  status: AppointmentStatus.PENDING_PATIENT_CONFIRMATION,
  isFollowUp: true,
  isFollowUpSuggestion: true,
  followUpParentId: parentAppointmentId,
  followUpDiscount: 5,
  suggestedFollowUpDate: suggestedDate, // Store suggestion if provided
  suggestedFollowUpTime: suggestedTime, // Store suggestion if provided
  appliedVoucherId: (voucher as any)._id,
});
```

### 2. Backend - Thêm endpoints mới

**File:** `server/src/modules/appointments/appointments.controller.ts`

- `POST /api/v1/appointments/follow-up/:id/schedule` - Lên lịch tái khám (bệnh nhân chọn thời gian)
- `POST /api/v1/appointments/follow-up/:id/reject` - Từ chối đề xuất tái khám
- `GET /api/v1/appointments/available-slots/:doctorId?date=...` - Lấy giờ trống (alternative endpoint)
- Sửa `GET /api/v1/appointments/follow-up/suggestions/:patientId` để lọc đúng đề xuất tái khám

### 3. Frontend - Cập nhật TypeScript types

**File:** `client/src/types/appointment.ts`

- Thêm các trường mới vào interface `Appointment`:

  - `isFollowUp?: boolean`
  - `isFollowUpSuggestion?: boolean`
  - `followUpParentId?: string`
  - `followUpDiscount?: number`
  - `suggestedFollowUpDate?: string`
  - `suggestedFollowUpTime?: string`
  - `appliedVoucherId?: string`

- Thêm status mới vào enum `AppointmentStatus`:
  - `PENDING_PATIENT_CONFIRMATION = "pending_patient_confirmation"`

### 4. Frontend - Thêm các service methods

**File:** `client/src/services/appointmentService.ts`

- `scheduleFollowUpAppointment(appointmentId, payload)` - Lên lịch tái khám
- `rejectFollowUpSuggestion(appointmentId)` - Từ chối đề xuất
- `getAvailableSlots(doctorId, date)` - Lấy giờ trống

### 5. Frontend - Tạo modal lên lịch tái khám

**File:** `client/src/components/appointments/ScheduleFollowUpModal.tsx` (mới)

Modal cho phép bệnh nhân:

- Xem thông tin bác sĩ và lý do tái khám
- Xem thời gian đề xuất từ bác sĩ (nếu có)
- Chọn ngày khám mong muốn
- Chọn giờ khám từ danh sách giờ trống
- Xác nhận hoặc từ chối đề xuất

### 6. Frontend - Cập nhật component hiển thị đề xuất

**File:** `client/src/components/appointments/FollowUpSuggestions.tsx`

- Hiển thị thời gian đề xuất từ `suggestedFollowUpDate` và `suggestedFollowUpTime` (không phải từ `appointmentDate` và `startTime`)
- Thay đổi nút "Xác nhận tái khám" thành "Lên lịch tái khám" để mở modal chọn thời gian
- Thêm logic xử lý từ chối đề xuất
- Sử dụng `ScheduleFollowUpModal` để bệnh nhân chọn thời gian

## Flow hoạt động mới

### Bác sĩ tạo đề xuất:

1. Bác sĩ chọn lịch hẹn đã hoàn thành
2. Bác sĩ nhấn "Tạo đề xuất tái khám"
3. Bác sĩ (tùy chọn) chọn ngày/giờ đề xuất và ghi lý do
4. Hệ thống tạo:
   - Appointment với status `PENDING_PATIENT_CONFIRMATION`
   - `appointmentDate`, `startTime`, `endTime` = `undefined`
   - `suggestedFollowUpDate`, `suggestedFollowUpTime` = giá trị đề xuất (nếu có)
   - Voucher giảm giá 5%
5. Bệnh nhân nhận thông báo và voucher qua email

### Bệnh nhân xử lý đề xuất:

1. Bệnh nhân vào tab "Lịch tái khám"
2. Xem đề xuất với thời gian gợi ý (nếu có) hoặc thông báo chọn thời gian phù hợp
3. Nhấn "Lên lịch tái khám" → Modal mở ra
4. Trong modal:
   - Xem thời gian đề xuất từ bác sĩ (nếu có)
   - Chọn ngày khám
   - Chọn giờ khám từ danh sách giờ trống
   - Xác nhận hoặc từ chối
5. Khi xác nhận:
   - Appointment được cập nhật với ngày/giờ đã chọn
   - Status chuyển sang `PENDING_PAYMENT`
   - Áp dụng giảm giá 5%
6. Khi từ chối:
   - Appointment bị hủy (status = `CANCELLED`)
   - Thông báo gửi cho bác sĩ

## Lợi ích của việc sửa lỗi này

1. **Đúng nghiệp vụ:** Đề xuất tái khám không phải là lịch hẹn cố định, mà là gợi ý linh hoạt
2. **Tăng trải nghiệm bệnh nhân:** Bệnh nhân có thể chọn thời gian phù hợp với lịch trình của họ
3. **Giảm conflict:** Tránh việc bác sĩ đề xuất giờ mà sau này bị trùng lịch
4. **Minh bạch:** Phân biệt rõ giữa "đề xuất" và "lịch hẹn đã xác nhận"
5. **Quy trình rõ ràng:** Bệnh nhân chủ động lên lịch thay vì tự động được đặt lịch

## Testing checklist

- [ ] Bác sĩ tạo đề xuất tái khám với thời gian gợi ý
- [ ] Bác sĩ tạo đề xuất tái khám không có thời gian gợi ý
- [ ] Bệnh nhân xem đề xuất trong tab "Lịch tái khám"
- [ ] Bệnh nhân nhấn "Lên lịch tái khám" và modal hiển thị đúng
- [ ] Danh sách giờ trống load chính xác theo ngày chọn
- [ ] Bệnh nhân xác nhận với thời gian đề xuất
- [ ] Bệnh nhân xác nhận với thời gian khác
- [ ] Bệnh nhân từ chối đề xuất
- [ ] Voucher 5% được áp dụng khi xác nhận
- [ ] Thông báo gửi đúng cho cả bác sĩ và bệnh nhân
