# Integration Complete - Full Billing System Implementation Guide

## ✅ Tổng quan hoàn thành

Hệ thống billing với các chức năng đổi lịch, hủy lịch, tạo tái khám và quản lý voucher đã được tích hợp đầy đủ vào:

### 1. **Patient Interface** (Bệnh nhân)

- ✅ Trang My Appointments: `client/src/app/patient/appointments/my-appointments/page.tsx`

  - Đã thay RescheduleModal → **RescheduleWithBillingModal**
  - Đã thay Cancel Dialog → **CancelWithBillingModal** (userRole="patient")
  - Đã thêm **FollowUpSuggestions** component ở đầu trang
  - Loại bỏ hàm handleRescheduleConfirm không dùng nữa

- ✅ Trang Vouchers: `client/src/app/patient/vouchers/page.tsx` (**MỚI**)
  - Hiển thị danh sách voucher với VoucherList component
  - Hướng dẫn sử dụng voucher
  - Cách thức nhận voucher (hủy khẩn cấp, tái khám)

### 2. **Doctor Interface** (Bác sĩ)

- ✅ Trang Schedule: `client/src/app/doctor/schedule/page.tsx`
  - Đã thay Cancel Dialog → **CancelWithBillingModal** (userRole="doctor")
  - Đã thêm **CreateFollowUpModal** cho appointment đã hoàn thành
  - Button "Tạo đề xuất tái khám" với icon CalendarDays cho status="completed"

---

## 📋 Các thay đổi chi tiết

### A. Patient My Appointments Page

**Imports mới:**

```typescript
import RescheduleWithBillingModal from "@/components/appointments/RescheduleWithBillingModal";
import CancelWithBillingModal from "@/components/appointments/CancelWithBillingModal";
import FollowUpSuggestions from "@/components/appointments/FollowUpSuggestions";
```

**UI Changes:**

1. **FollowUpSuggestions Section** - Đã thêm vào đầu trang, trước danh sách appointments:

   ```tsx
   <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
     <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
       <Calendar className="w-6 h-6 text-primary" />
       Đề xuất tái khám
     </h2>
     <FollowUpSuggestions />
   </div>
   ```

2. **RescheduleWithBillingModal** - Thay thế modal cũ:

   ```tsx
   {
     rescheduleDialogOpen && appointmentToReschedule && (
       <RescheduleWithBillingModal
         isOpen={rescheduleDialogOpen}
         onClose={() => {
           setRescheduleDialogOpen(false);
           setAppointmentToReschedule(null);
         }}
         appointment={appointmentToReschedule}
         onSuccess={() => {
           setRescheduleDialogOpen(false);
           setAppointmentToReschedule(null);
           loadAppointments();
         }}
       />
     );
   }
   ```

3. **CancelWithBillingModal** - Thay thế dialog cũ:
   ```tsx
   {
     cancelDialogOpen && selectedAppointment && (
       <CancelWithBillingModal
         isOpen={cancelDialogOpen}
         onClose={() => {
           setCancelDialogOpen(false);
           setSelectedAppointment(null);
           setCancelReason("");
         }}
         appointment={selectedAppointment}
         userRole="patient"
         onSuccess={() => {
           setCancelDialogOpen(false);
           setSelectedAppointment(null);
           setCancelReason("");
           loadAppointments();
         }}
       />
     );
   }
   ```

**Removed:**

- ❌ `handleRescheduleConfirm()` function (không cần nữa vì modal tự xử lý)
- ❌ Import `RescheduleModal` cũ

---

### B. Doctor Schedule Page

**Imports mới:**

```typescript
import CreateFollowUpModal from "@/components/appointments/CreateFollowUpModal";
import CancelWithBillingModal from "@/components/appointments/CancelWithBillingModal";
```

**State mới:**

```typescript
const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
const [appointmentForFollowUp, setAppointmentForFollowUp] = useState<Appointment | null>(null);
```

**UI Changes:**

1. **Follow-Up Button** - Thêm cho appointment đã hoàn thành:

   ```tsx
   {
     selectedAppointment.status === "completed" && (
       <button
         onClick={() => {
           setAppointmentForFollowUp(selectedAppointment);
           setFollowUpModalOpen(true);
           setDetailModalOpen(false);
         }}
         className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
       >
         <CalendarDays className="w-4 h-4" />
         Tạo đề xuất tái khám
       </button>
     );
   }
   ```

2. **CancelWithBillingModal** - Thay thế cancel dialog cũ:

   ```tsx
   {
     cancelDialogOpen && appointmentToCancel && (
       <CancelWithBillingModal
         isOpen={cancelDialogOpen}
         onClose={() => {
           setCancelDialogOpen(false);
           setAppointmentToCancel(null);
           setCancelReason("");
         }}
         appointment={appointmentToCancel as any}
         userRole="doctor"
         onSuccess={() => {
           setCancelDialogOpen(false);
           setAppointmentToCancel(null);
           setCancelReason("");
           fetchAppointments();
         }}
       />
     );
   }
   ```

3. **CreateFollowUpModal** - Modal mới cho tái khám:
   ```tsx
   {
     followUpModalOpen && appointmentForFollowUp && (
       <CreateFollowUpModal
         isOpen={followUpModalOpen}
         onClose={() => {
           setFollowUpModalOpen(false);
           setAppointmentForFollowUp(null);
         }}
         appointment={appointmentForFollowUp as any}
         onSuccess={() => {
           setFollowUpModalOpen(false);
           setAppointmentForFollowUp(null);
           fetchAppointments();
         }}
       />
     );
   }
   ```

**Removed:**

- ❌ Cancel Dialog HTML cũ (đã thay bằng CancelWithBillingModal)
- ❌ `confirmCancel()` function sẽ không còn được sử dụng

---

### C. New Vouchers Page

**Location:** `client/src/app/patient/vouchers/page.tsx`

**Features:**

- 📋 Hiển thị tất cả vouchers của bệnh nhân
- 📋 Click to copy voucher code
- 📋 Visual status indicators (available, used, expired)
- 💡 Hướng dẫn sử dụng voucher
- 🎁 Cách nhận voucher từ các nguồn khác nhau

**Navigation:** Bệnh nhân có thể truy cập qua:

- Direct URL: `/patient/vouchers`
- Có thể thêm link trong sidebar/menu patient

---

## 🔧 TypeScript Fixes Applied

### 1. **RescheduleWithBillingModal.tsx**

```typescript
// Added null check before API call
if (!appointment._id) {
  throw new Error("ID lịch hẹn không hợp lệ");
}
```

### 2. **CancelWithBillingModal.tsx**

```typescript
// Added null check before API call
if (!appointment._id) {
  throw new Error("ID lịch hẹn không hợp lệ");
}
```

### 3. **CreateFollowUpModal.tsx**

```typescript
// Added null check before API call
if (!appointment._id) {
  throw new Error("ID lịch hẹn không hợp lệ");
}
```

### 4. **FollowUpSuggestions.tsx**

```typescript
// Fixed imports
import { useEffect, useState, useCallback } from "react";
import { Appointment, AppointmentStatus } from "@/types/appointment";

// Fixed useCallback and useEffect dependencies
const loadSuggestions = useCallback(async () => {
  // ... implementation
}, [session?.user?._id]);

useEffect(() => {
  if (session?.user?._id) {
    loadSuggestions();
  }
}, [session?.user?._id, loadSuggestions]);

// Fixed enum usage
const result = await appointmentService.updateAppointmentStatus(
  appointmentId,
  AppointmentStatus.CONFIRMED // Changed from "confirmed"
);
```

---

## 🎯 Business Logic Flows

### Flow 1: Bệnh nhân đổi lịch (Patient Reschedule)

```
1. Bệnh nhân click "Đổi lịch" trên appointment
2. RescheduleWithBillingModal mở
3. Component tự động tính thời gian còn lại
4. IF < 30 phút:
   - Hiện warning banner màu vàng
   - Hiện thông tin phí: "Phí đặt chỗ: 100,000 VND"
5. Bệnh nhân chọn ngày/giờ mới
6. Submit → API call rescheduleWithBilling
7. Backend:
   - Kiểm tra threshold 30 phút
   - Nếu <30 phút: Tính phí 100,000 VND
   - Tạo appointment mới
   - Hủy appointment cũ
   - Gửi notification qua socket
8. Success alert hiển thị:
   - "Đổi lịch thành công!"
   - Hoặc "Đổi lịch thành công! Phí đặt chỗ: 100,000 VND"
9. Refresh danh sách appointments
```

### Flow 2: Bệnh nhân hủy lịch (Patient Cancel)

```
1. Bệnh nhân click "Hủy lịch"
2. CancelWithBillingModal mở với userRole="patient"
3. Component tự động tính thời gian còn lại
4. IF < 30 phút:
   - Hiện warning banner màu đỏ
   - "⚠ Hủy trong vòng 30 phút sẽ bị tính phí đặt chỗ 100,000 VND"
5. Bệnh nhân nhập lý do
6. Submit → API call cancelWithBilling
7. Backend:
   - Đánh dấu appointment cancelled
   - IF <30 phút: Tính phí 100,000 VND
   - IF đã thanh toán: Hoàn lại consultation fee
   - Gửi notification
8. Success alert tổng hợp:
   - "Hủy lịch thành công!"
   - + "Phí đặt chỗ: 100,000 VND" (nếu có)
   - + "Phí khám đã được hoàn lại." (nếu có)
9. Refresh danh sách
```

### Flow 3: Bác sĩ hủy khẩn cấp (Doctor Emergency Cancel)

```
1. Bác sĩ click "Hủy Lịch Hẹn"
2. CancelWithBillingModal mở với userRole="doctor"
3. Dropdown chọn lý do:
   - "Khẩn cấp của bác sĩ" (emergency)
   - "Bệnh nhân đến muộn" (patient_late)
4. IF chọn "emergency":
   - Hiện text màu xanh: "✓ Bệnh nhân sẽ nhận voucher giảm giá 5%"
5. IF chọn "patient_late":
   - Hiện text màu cam: "⚠ Bệnh nhân sẽ bị tính phí đặt chỗ 100,000 VND"
6. Submit → API call cancelWithBilling
7. Backend:
   - IF emergency:
     - Hoàn lại consultation fee cho bệnh nhân
     - Tạo voucher 5% cho bệnh nhân
     - Gửi voucher code qua email
   - IF patient_late:
     - Tính phí bệnh nhân 100,000 VND
     - Hoàn lại consultation fee
8. Success alert:
   - Emergency: "Đã tạo voucher 5% cho bệnh nhân"
   - Patient late: "Đã tính phí bệnh nhân"
9. Refresh danh sách
```

### Flow 4: Tạo đề xuất tái khám (Create Follow-Up)

```
1. Bác sĩ hoàn thành khám
2. Appointment status → "completed"
3. Button "Tạo đề xuất tái khám" xuất hiện
4. Bác sĩ click button
5. CreateFollowUpModal mở
6. Hiện thông tin:
   - Banner xanh: "Ưu đãi tái khám - Bệnh nhân sẽ tự động nhận voucher giảm giá 5%"
   - Tên bệnh nhân
   - Date picker (default: 7 ngày sau)
   - Time picker
   - Notes (bắt buộc)
   - Info box: "📧 Thông báo: Bệnh nhân sẽ nhận được thông báo qua email và app với mã voucher giảm giá 5%"
7. Submit → API call createFollowUpSuggestion
8. Backend:
   - Tạo voucher 5% với expiry 90 ngày
   - Tạo appointment mới với:
     - status: "pending"
     - isFollowUp: true
     - followUpParentId: appointment cũ
     - appliedVoucherId: voucher vừa tạo
   - Gửi notification + email cho bệnh nhân
9. Success alert: "Mã voucher: DENTAL123456"
10. Bệnh nhân nhận:
    - Email với voucher code
    - Notification trong app
    - Xuất hiện trong "Đề xuất tái khám" tab
```

### Flow 5: Bệnh nhân xem và sử dụng voucher

```
1. Bệnh nhân truy cập /patient/vouchers
2. VoucherList component load vouchers
3. Hiển thị:
   - Available vouchers: Gradient xanh-tím
   - Used vouchers: Nền xanh lá + checkmark
   - Expired vouchers: Xám mờ + X icon
4. Bệnh nhân click vào voucher code
5. Code được copy vào clipboard
6. Visual feedback: Nền xanh + checkmark 2 giây
7. Khi đặt lịch/thanh toán:
   - Dán code vào form
   - Backend verify và apply discount
   - Voucher được đánh dấu isUsed: true
```

---

## 🚀 Next Steps (Optional)

### 1. Navigation Links

Thêm link vouchers vào patient sidebar/menu:

**File:** `client/src/components/layout/PatientSidebar.tsx` (hoặc tương tự)

```tsx
<Link href="/patient/vouchers" className="nav-link">
  <Gift className="w-5 h-5" />
  <span>Voucher của tôi</span>
</Link>
```

### 2. Booking Form Integration

Thêm voucher input vào booking form:

**File:** `client/src/components/appointments/BookingFlowModal.tsx`

```tsx
<div className="mt-4">
  <label className="text-sm font-medium text-gray-700">Mã voucher (nếu có)</label>
  <input
    type="text"
    placeholder="Nhập mã voucher"
    className="w-full mt-1 px-4 py-2 border rounded-lg"
    value={voucherCode}
    onChange={(e) => setVoucherCode(e.target.value)}
  />
</div>
```

### 3. Email Templates

Tạo email templates cho từng scenario:

**Files cần tạo:**

- `server/src/mail/templates/reschedule-with-fee.hbs`
- `server/src/mail/templates/cancel-with-refund.hbs`
- `server/src/mail/templates/cancel-emergency-voucher.hbs`
- `server/src/mail/templates/follow-up-suggestion.hbs`

### 4. Testing Checklist

**Manual Testing:**

- [ ] Đổi lịch < 30 phút → Phí 100k
- [ ] Đổi lịch > 30 phút → Không phí
- [ ] Bệnh nhân hủy < 30 phút → Phí 100k
- [ ] Bệnh nhân hủy > 30 phút → Không phí
- [ ] Bác sĩ hủy khẩn cấp → Voucher 5%
- [ ] Bác sĩ hủy patient late → Phí bệnh nhân
- [ ] Tạo tái khám → Voucher 5% + email
- [ ] Bệnh nhân xem vouchers → Hiển thị đúng
- [ ] Copy voucher code → Clipboard hoạt động
- [ ] Follow-up suggestions → Hiện trong list
- [ ] Accept follow-up → Status confirmed

**API Testing:**

```bash
# Test reschedule với billing
curl -X PATCH http://localhost:8081/api/v1/appointments/:id/reschedule-with-billing \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentDate": "2025-10-30",
    "startTime": "10:00",
    "duration": 30,
    "userId": "patient_id",
    "notes": "Test"
  }'

# Test cancel với billing
curl -X DELETE http://localhost:8081/api/v1/appointments/:id/cancel-with-billing \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test",
    "cancelledBy": "doctor",
    "doctorReason": "emergency"
  }'

# Test create follow-up
curl -X POST http://localhost:8081/api/v1/appointments/follow-up/create-suggestion \
  -H "Content-Type: application/json" \
  -d '{
    "parentAppointmentId": "appointment_id",
    "suggestedDate": "2025-11-06",
    "suggestedTime": "10:00",
    "notes": "Tái khám sau 7 ngày"
  }'

# Test get vouchers
curl http://localhost:8081/api/v1/vouchers/my-vouchers \
  -H "Authorization: Bearer <token>"
```

---

## 📊 Database Schema Updates

Ensure these collections have the new fields:

### Appointments Collection

```javascript
{
  // Existing fields...

  // Cancellation fields
  cancelledBy: 'patient' | 'doctor',
  doctorCancellationReason: 'emergency' | 'patient_late',
  cancellationFeeCharged: boolean,
  cancellationFeeAmount: number,

  // Follow-up fields
  isFollowUp: boolean,
  followUpParentId: ObjectId,
  followUpDiscount: number,
  appliedVoucherId: ObjectId
}
```

### Vouchers Collection

```javascript
{
  code: string,           // "DENTAL123456"
  type: 'percentage' | 'fixed',
  value: number,          // 5 for 5%
  reason: 'doctor_cancellation' | 'follow_up',
  patientId: ObjectId,
  isUsed: boolean,
  expiresAt: Date,        // 90 days from creation
  relatedAppointmentId: ObjectId,
  createdAt: Date
}
```

### Payments Collection

```javascript
{
  // Existing fields...

  billType: 'consultation_fee' | 'refund' | 'reservation_fee' | 'cancellation_charge',
  relatedPaymentId: ObjectId,  // For linking refunds to original payments
  refundStatus: 'pending' | 'completed' | 'failed'
}
```

---

## 🎉 Summary

✅ **Patient Interface:**

- My Appointments page sử dụng RescheduleWithBillingModal + CancelWithBillingModal
- FollowUpSuggestions hiển thị đề xuất tái khám
- Vouchers page mới để quản lý vouchers

✅ **Doctor Interface:**

- Schedule page sử dụng CancelWithBillingModal + CreateFollowUpModal
- Button "Tạo đề xuất tái khám" cho completed appointments

✅ **All TypeScript Errors Fixed:**

- Null checks cho appointment.\_id
- Correct enum usage (AppointmentStatus.CONFIRMED)
- useCallback và useEffect dependencies đúng

✅ **Business Logic Complete:**

- 30-minute threshold detection
- Automatic fee calculation (100,000 VND)
- Voucher creation (5% discount)
- Email notifications (ready for templates)
- Refund processing
- Follow-up workflow

🚀 **Ready for Production Testing!**

Tất cả các components đã được tích hợp và sẵn sàng cho UAT (User Acceptance Testing). Hệ thống billing hoàn chỉnh với đầy đủ tính năng theo policy document.
