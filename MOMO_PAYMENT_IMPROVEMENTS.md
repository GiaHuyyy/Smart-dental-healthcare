# Cải Tiến Thanh Toán MoMo

## Tổng Quan
Document này mô tả các cải tiến được thực hiện cho khâu thanh toán MoMo trong hệ thống đặt lịch khám bệnh.

## Vấn Đề Ban Đầu

### 1. **Lỗi Validation Status**
- Status `pending_payment` không tồn tại trong `AppointmentStatus` enum
- Gây ra lỗi khi tạo appointment với MoMo payment

### 2. **Thiếu Error Handling**
- Không có retry logic cho network errors
- Error messages không rõ ràng
- Không xử lý failed payment

### 3. **Flow Chưa Tối Ưu**
- Không hủy appointment khi payment failed
- Thiếu loading states
- Không có recovery mechanism

## Các Cải Tiến

### Backend Improvements

#### 1. **Cập Nhật Appointment Schema** (`appointment.schemas.ts`)
```typescript
export enum AppointmentStatus {
  PENDING = 'pending',
  PENDING_PAYMENT = 'pending_payment', // ✅ THÊM MỚI
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  IN_PROGRESS = 'in-progress',
}
```

**Lợi ích:**
- Phân biệt rõ appointment đang chờ thanh toán
- Cho phép tracking appointments theo payment status

#### 2. **Nâng Cấp MoMo Service** (`momo.service.ts`)

**Thêm payWithMethod Support:**
```typescript
requestType?: 'payWithMethod' | 'captureWallet';
autoCapture?: boolean;
```

**Retry Logic với Exponential Backoff:**
- 3 lần retry tự động cho timeout và network errors
- Timeout: 30 giây
- Backoff: 1s, 2s, 3s

**Error Code Mapping:**
- Map 30+ error codes của MoMo sang tiếng Việt
- User-friendly error messages

**Ví dụ:**
```typescript
3001: 'Số dư ví không đủ để thanh toán'
4010: 'OTP không hợp lệ'
1005: 'Giao dịch thất bại do URL hoặc QR code đã hết hạn'
```

#### 3. **Cải Thiện Payment Callback** (`payments.service.ts`)

**Auto-confirm Appointment:**
```typescript
if (status === 'completed' && appointmentId) {
  // Only update if in pending_payment or pending status
  if (['pending_payment', 'pending'].includes(appointment.status)) {
    await updateAppointment({
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentId: updatedPayment._id,
    });
  }
}
```

**Auto-cancel on Failed Payment:**
```typescript
else if (status === 'failed' && appointmentId) {
  if (appointment.status === 'pending_payment') {
    await updateAppointment({
      status: 'cancelled',
      cancellationReason: 'Thanh toán thất bại hoặc bị hủy',
      paymentStatus: 'unpaid',
    });
  }
}
```

### Frontend Improvements

#### 4. **Enhanced Payment Flow** (`page.tsx`)

**3-Step Process với Loading States:**
```typescript
Step 1: Create appointment (status: pending_payment)
  ↓ toast: "Đang tạo lịch hẹn..."
Step 2: Create MoMo payment
  ↓ toast: "Đang tạo thanh toán MoMo..."
Step 3: Redirect to MoMo
  ↓ toast: "Đang chuyển đến trang thanh toán MoMo..."
```

**Validation Trước Khi Thanh Toán:**
- Check access token validity
- Validate required fields
- Auto-redirect nếu session expired

**Recovery Mechanism:**
```typescript
localStorage.setItem('pending_payment_appointment', JSON.stringify({
  appointmentId,
  timestamp: Date.now()
}));
```

**Rollback on Failure:**
- Tự động hủy appointment nếu tạo payment thất bại
- Prevent orphaned appointments

#### 5. **Payment Result Page** (`payment-result/page.tsx`)

**Better User Feedback:**
- Success: "Lịch hẹn của bạn đã được xác nhận"
- Failed: Hiển thị error message cụ thể từ MoMo
- Clear localStorage sau khi xử lý xong

**Error Handling:**
- Không fail toàn bộ process nếu query payment thất bại
- Graceful degradation

## Flow Diagram

### MoMo Payment Flow

```
┌─────────────────────────────────────────────────┐
│ User chọn MoMo payment trong booking modal      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Frontend: Create appointment                     │
│ Status: pending_payment                          │
│ Toast: "Đang tạo lịch hẹn..."                   │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Frontend: Create MoMo payment                    │
│ Toast: "Đang tạo thanh toán MoMo..."            │
└────────────────┬────────────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │   Success?        │
       └────┬────────┬─────┘
            │        │
        YES │        │ NO
            │        │
            │        ▼
            │    ┌──────────────────────────┐
            │    │ Cancel appointment       │
            │    │ Show error to user       │
            │    └──────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────┐
│ Save to localStorage & Redirect to MoMo         │
│ Toast: "Đang chuyển đến trang thanh toán..."    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ User completes payment on MoMo                   │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ MoMo redirects to /payment-result                │
│ MoMo sends IPN callback to backend               │
└────────────────┬────────────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │   resultCode?     │
       └────┬────────┬─────┘
            │        │
          0 │        │ !0
    SUCCESS │        │ FAILED
            │        │
            ▼        ▼
    ┌──────────┐  ┌──────────────┐
    │ Confirm  │  │ Cancel       │
    │ appt     │  │ appt         │
    │ status:  │  │ status:      │
    │confirmed │  │cancelled     │
    └──────────┘  └──────────────┘
            │        │
            └────┬───┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Show result page with appropriate message        │
│ Clear localStorage                               │
└─────────────────────────────────────────────────┘
```

## Cấu Hình Environment Variables

### Backend (.env)
```env
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8081
```

## Testing Checklist

### Happy Path
- [ ] User có thể chọn MoMo payment
- [ ] Appointment được tạo với status `pending_payment`
- [ ] MoMo payment link được tạo thành công
- [ ] Redirect đến MoMo hoạt động
- [ ] Sau thanh toán thành công, appointment status = `confirmed`
- [ ] Payment result page hiển thị success message

### Error Scenarios
- [ ] Network timeout → Retry 3 lần → Show error
- [ ] Appointment creation fails → Show error, không tạo payment
- [ ] Payment creation fails → Cancel appointment
- [ ] User cancels on MoMo → Appointment status = `cancelled`
- [ ] Invalid signature on callback → Reject callback
- [ ] Payment query fails → Still show result based on URL params

## Monitoring & Logs

### Backend Logs
```typescript
// Success logs
✅ Payment created: { orderId, amount, requestType }
✅ Appointment confirmed after payment: { appointmentId, previousStatus, newStatus }

// Error logs
❌ MoMo Error: { resultCode, message, vietnameseMessage }
❌ Invalid MoMo callback signature: { orderId, expected, received }
❌ Failed to update appointment: { error }
```

### Frontend Logs
```typescript
console.log("Creating appointment with pending_payment status")
console.log("Creating MoMo payment:", paymentPayload)
console.log("MoMo payment created:", paymentResult.data)
```

## Các Cải Tiến Trong Tương Lai

1. **Payment Timeout Handler**
   - Cronjob để auto-cancel appointments pending_payment > 15 phút

2. **Payment Retry for Users**
   - Cho phép user retry payment từ my-appointments page

3. **Webhook Logging**
   - Log tất cả webhooks từ MoMo để debug

4. **Payment Analytics**
   - Track success/failure rates
   - Monitor payment processing time

5. **Multiple Payment Methods**
   - VNPay, ZaloPay integration
   - Credit card support

## Tài Liệu Tham Khảo

- [MoMo API Documentation](https://developers.momo.vn/#/docs/en/aiov2/)
- Code example từ MoMo docs (payWithMethod)

## Changelog

### v1.0.0 (2025-01-16)
- ✅ Thêm `pending_payment` status vào AppointmentStatus enum
- ✅ Cập nhật MoMo Service với payWithMethod
- ✅ Thêm retry logic và error handling
- ✅ Cải thiện payment callback xử lý
- ✅ Enhanced frontend payment flow
- ✅ Better error messages cho users
- ✅ Auto-cancel failed payments
- ✅ Recovery mechanism với localStorage

---

**Ghi chú:** Document này được tạo để tracking các improvements cho payment flow. Update khi có thay đổi mới.

