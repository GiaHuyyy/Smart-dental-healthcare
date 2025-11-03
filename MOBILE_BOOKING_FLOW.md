# Quy trình Đặt lịch Mobile - Giống Client

## 📋 Tổng quan

Quy trình đặt lịch mobile đã được cập nhật để giống với quy trình đặt lịch trên web client, bao gồm:

- ✅ **Multi-step wizard** với progress indicator  
- ✅ **3 bước đặt lịch** rõ ràng và dễ hiểu
- ✅ **Thanh toán MoMo** tích hợp hoàn chỉnh
- ✅ **Áp dụng voucher** giảm giá
- ✅ **Xác nhận thông tin** trước khi đặt

## 🔄 Quy trình đặt lịch (3 bước)

### Bước 1: Chọn lịch (doctor-time)
- Hiển thị thông tin bác sĩ được chọn
- Chọn hình thức tư vấn:
  - **Tại phòng khám** (ON_SITE) - 100% phí
  - **Tư vấn online** (VIDEO_CALL) - Giảm 20% phí
- Chọn ngày khám (date picker)
- Chọn khung giờ (hiển thị khung giờ đã kín)

### Bước 2: Thông tin (patient-info)
- Toggle "Đặt lịch cho bản thân"
- Nếu đặt cho người khác:
  - Họ tên bệnh nhân
  - Giới tính (Nam/Nữ/Khác)
- **Lý do khám** (bắt buộc)
- Ghi chú thêm (tùy chọn)

### Bước 3: Xác nhận & Thanh toán (confirmation)
- **Tóm tắt thông tin:**
  - Bác sĩ
  - Ngày giờ
  - Hình thức tư vấn
  - Lý do khám
  
- **Mã giảm giá:**
  - Nhập mã voucher
  - Nút "Áp dụng"
  - Hiển thị trạng thái áp dụng thành công
  
- **Phương thức thanh toán:**
  - 💳 **MoMo** - Thanh toán qua ví MoMo
  - 💵 **Tiền mặt** - Thanh toán tại phòng khám
  - ⏰ **Thanh toán sau** - Thanh toán sau khi khám
  
- **Chi tiết thanh toán:**
  - Phí tư vấn
  - Giảm giá online (nếu VIDEO_CALL)
  - Giảm giá voucher
  - **Tổng thanh toán**

## 💳 Thanh toán MoMo

### Flow thanh toán MoMo:

```
1. Người dùng chọn "MoMo" làm phương thức thanh toán
   ↓
2. Click "Xác nhận đặt lịch"
   ↓
3. Tạo appointment trên server
   ↓
4. Gọi API tạo MoMo payment
   ↓
5. Nhận payUrl từ MoMo
   ↓
6. Hiển thị Alert xác nhận chuyển đến MoMo
   ↓
7. Mở ứng dụng MoMo (Linking.openURL)
   ↓
8. Người dùng thanh toán trên MoMo
   ↓
9. MoMo callback về server
   ↓
10. Server cập nhật trạng thái appointment
    ↓
11. Người dùng quay lại app, xem lịch đã xác nhận
```

### API MoMo:

```typescript
POST /api/v1/payments/momo/create
Body: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  orderInfo: string;
}

Response: {
  success: boolean;
  message: string;
  data: {
    payUrl: string;     // URL để mở MoMo
    orderId: string;
    requestId: string;
  }
}
```

## 📁 Cấu trúc File

### Components mới:
```
mobile/components/appointments/
├── BookingStepModal.tsx        # Modal 3 bước đặt lịch
└── (các component cũ...)

mobile/services/
├── paymentService.ts           # Service thanh toán MoMo
└── (các service cũ...)
```

### Thay đổi chính:

**`BookingStepModal.tsx`** (902 dòng):
- Component Modal với 3 step
- Progress indicator
- 3 sub-components cho mỗi step:
  - `DoctorTimeStep`
  - `PatientInfoStep`
  - `ConfirmationStep`
- Validation từng bước
- Tích hợp voucher
- Chọn phương thức thanh toán

**`paymentService.ts`**:
- `createMoMoPayment()` - Tạo thanh toán MoMo
- `checkPaymentStatus()` - Kiểm tra trạng thái thanh toán

**`appointments.tsx`**:
- Thêm state cho booking modal
- Handler `handleOpenBookingModal()`
- Handler `handleBookingConfirm()` - Tạo appointment
- Handler `handleMoMoPayment()` - Xử lý thanh toán MoMo
- Handler `handleDateChangeForBooking()` - Fetch busy times
- Tích hợp `BookingStepModal`

## 🎨 UI/UX Features

### Progress Steps:
- Hiển thị 3 bước với icon
- Step đã hoàn thành: ✓ màu xanh
- Step hiện tại: icon màu primary
- Step chưa đến: icon màu xám
- Đường kẻ nối giữa các step

### Responsive Design:
- Modal chiếm 95% chiều cao màn hình
- Scroll được khi nội dung dài
- Footer cố định với nút action
- Transition mượt mà giữa các bước

### Validation:
- Kiểm tra từng bước trước khi next
- Alert hiển thị lỗi cụ thể
- Disable nút khi đang submit

### Payment Methods Icons:
- 💳 MoMo - Đỏ
- 💵 Tiền mặt - Xanh lá
- ⏰ Thanh toán sau - Vàng

## 🔧 Cách sử dụng

### 1. Mở booking modal:
```typescript
// Từ danh sách bác sĩ
const doctor = { _id: '123', fullName: 'Dr. Smith', ... };
handleOpenBookingModal(doctor);

// Hoặc từ form hiện tại
handleOpenBookingModal(); // Lấy doctor từ selectedDoctorId
```

### 2. User điền thông tin theo 3 bước

### 3. Confirm và xử lý:
```typescript
const handleBookingConfirm = async (formData) => {
  // 1. Create appointment
  const appointment = await createAppointment(formData);
  
  // 2. Handle payment
  if (formData.paymentMethod === 'momo') {
    await handleMoMoPayment(appointment, formData);
  } else {
    // Cash or later - success
    showSuccessAlert();
  }
};
```

## 🚀 Testing

### Test scenarios:

1. **Đặt lịch với thanh toán sau:**
   - Chọn bác sĩ → ngày/giờ → điền thông tin → "Thanh toán sau"
   - ✅ Appointment tạo thành công
   - ✅ Alert "Đặt lịch thành công"

2. **Đặt lịch với tiền mặt:**
   - Chọn bác sĩ → ngày/giờ → điền thông tin → "Tiền mặt"
   - ✅ Appointment tạo thành công
   - ✅ Alert "Thanh toán tiền mặt khi đến khám"

3. **Đặt lịch với MoMo:**
   - Chọn bác sĩ → ngày/giờ → điền thông tin → "MoMo"
   - ✅ Appointment tạo thành công
   - ✅ Alert xác nhận chuyển đến MoMo
   - ✅ Mở ứng dụng MoMo
   - ✅ Sau khi thanh toán, appointment status = confirmed

4. **Áp dụng voucher:**
   - Nhập mã voucher hợp lệ
   - ✅ Áp dụng thành công
   - ✅ Hiển thị số tiền giảm
   - ✅ Cập nhật tổng thanh toán

5. **Validation:**
   - Bỏ trống các trường bắt buộc
   - ✅ Alert hiển thị lỗi cụ thể
   - ✅ Không cho next step

## 📱 Screenshots Flow

```
┌─────────────────────┐
│  Bước 1: Chọn lịch  │
│  ┌───────────────┐  │
│  │ Bác sĩ info   │  │
│  │ □ Phòng khám  │  │
│  │ □ Online      │  │
│  │ [Chọn ngày]   │  │
│  │ [08:00] [09:00]│ │
│  └───────────────┘  │
│  [Quay lại] [Tiếp] │
└─────────────────────┘
          ↓
┌─────────────────────┐
│ Bước 2: Thông tin   │
│  ┌───────────────┐  │
│  │ ☑ Đặt cho tôi │  │
│  │ Lý do khám:   │  │
│  │ [____________]│  │
│  │ Ghi chú:      │  │
│  │ [____________]│  │
│  └───────────────┘  │
│  [Quay lại] [Tiếp] │
└─────────────────────┘
          ↓
┌─────────────────────┐
│ Bước 3: Xác nhận    │
│  ┌───────────────┐  │
│  │ 📋 Tóm tắt    │  │
│  │ 🎫 Voucher    │  │
│  │ 💳 Thanh toán │  │
│  │   ○ MoMo      │  │
│  │   ○ Tiền mặt  │  │
│  │   ● Sau       │  │
│  │ Tổng: 200,000đ│  │
│  └───────────────┘  │
│  [Quay lại] [Xác nhận]│
└─────────────────────┘
```

## 🔐 Security & Error Handling

### Token validation:
- Kiểm tra token trước mỗi API call
- Redirect đến login nếu không có token

### Error handling:
- Try-catch cho mọi async operation
- Alert hiển thị lỗi user-friendly
- Log chi tiết lỗi cho dev

### MoMo payment security:
- Validate appointmentId, patientId, doctorId
- Không lưu thông tin thanh toán nhạy cảm
- Chỉ lưu orderId để tracking

## 📝 TODO / Future Improvements

- [ ] Thêm voucher validation API thật
- [ ] Deep link để xử lý MoMo callback
- [ ] Push notification khi thanh toán thành công
- [ ] Lưu draft booking khi user thoát modal
- [ ] Thêm animation giữa các step
- [ ] Support thanh toán qua ZaloPay, VNPay
- [ ] Lịch sử giao dịch MoMo
- [ ] Refund handling

## 🎯 So sánh với Client

| Feature | Client (Web) | Mobile | Status |
|---------|-------------|--------|--------|
| 3-step wizard | ✅ | ✅ | ✅ Done |
| Progress indicator | ✅ | ✅ | ✅ Done |
| Chọn consult type | ✅ | ✅ | ✅ Done |
| Busy times | ✅ | ✅ | ✅ Done |
| Patient info | ✅ | ✅ | ✅ Done |
| Voucher | ✅ | ✅ | ✅ Done |
| MoMo payment | ✅ | ✅ | ✅ Done |
| Cash payment | ✅ | ✅ | ✅ Done |
| Later payment | ✅ | ✅ | ✅ Done |
| Summary card | ✅ | ✅ | ✅ Done |

## 📞 Support

Nếu có vấn đề hoặc câu hỏi về quy trình đặt lịch, vui lòng liên hệ team dev.

---

**Version:** 1.0.0  
**Last Updated:** 2024-11-03  
**Author:** Smart Dental Team
