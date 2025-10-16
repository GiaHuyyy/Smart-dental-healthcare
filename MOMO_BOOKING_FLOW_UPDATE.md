# 💳 Cập nhật: Thanh toán MoMo trong Booking Flow

## ✅ Đã hoàn thành

Đã thêm **tùy chọn thanh toán** ngay trong modal đặt lịch khám với 3 phương thức:

1. **💰 Thanh toán MoMo** - Thanh toán trước khi đặt lịch
2. **💵 Thanh toán tại phòng khám** - Thanh toán trực tiếp
3. **⏰ Thanh toán sau** - Đặt lịch trước, thanh toán sau

---

## 🎯 Files Modified

### 1. `client/src/types/appointment.ts`
```typescript
export interface BookingFormData {
  // ... existing fields
  paymentMethod?: "momo" | "cash" | "later";  // ✨ NEW
  paymentAmount?: number;                      // ✨ NEW
}
```

### 2. `client/src/components/appointments/BookingForm.tsx`

#### ✨ Added Payment Method Selection Section:

```tsx
<div className="healthcare-card p-6">
  <h3>Phương thức thanh toán</h3>
  
  {/* Option 1: MoMo Payment */}
  <label>
    <input type="radio" value="momo" />
    <div className="border peer-checked:border-pink-500">
      <div className="w-12 h-12 bg-pink-600">M</div>
      <div>
        <div>Thanh toán MoMo</div>
        <div>Thanh toán trực tuyến qua ví MoMo</div>
        <div>50,000 đ</div>
      </div>
    </div>
  </label>
  
  {/* Option 2: Cash Payment */}
  <label>
    <input type="radio" value="cash" />
    <div>
      <CreditCard />
      <div>Thanh toán tại phòng khám</div>
    </div>
  </label>
  
  {/* Option 3: Pay Later */}
  <label>
    <input type="radio" value="later" />
    <div>
      <Clock />
      <div>Thanh toán sau</div>
    </div>
  </label>
  
  {/* MoMo Info Alert */}
  {paymentMethod === "momo" && (
    <div className="bg-pink-50 border border-pink-200">
      <AlertCircle />
      <ul>
        <li>Bạn sẽ được chuyển đến trang thanh toán MoMo</li>
        <li>Lịch hẹn sẽ được tạo sau khi thanh toán thành công</li>
        <li>Nếu thanh toán thất bại, lịch hẹn sẽ không được tạo</li>
      </ul>
    </div>
  )}
</div>
```

---

## 🔄 New Booking Flow

### Cũ (Before):
```
1. Chọn bác sĩ
2. Chọn thời gian
3. Điền thông tin
4. Xác nhận
5. ✅ Tạo appointment ngay
6. Hiển thị confirmation
```

### Mới (After):

#### Option A: Thanh toán MoMo
```
1. Chọn bác sĩ
2. Chọn thời gian
3. Điền thông tin
4. ✅ Chọn "Thanh toán MoMo"
5. Xác nhận
6. 🔄 Tạo payment record (không tạo appointment)
7. 🔄 Redirect đến MoMo payment page
8. 💳 User thanh toán trên MoMo
9. ✅ MoMo callback về backend
10. ✅ Backend tạo appointment + update payment
11. 🔄 MoMo redirect về payment-result page
12. 🎉 Hiển thị kết quả + link đến appointment
```

#### Option B: Cash/Later
```
1. Chọn bác sĩ
2. Chọn thời gian
3. Điền thông tin
4. ✅ Chọn "Thanh toán tại phòng khám" hoặc "Thanh toán sau"
5. Xác nhận
6. ✅ Tạo appointment ngay (như cũ)
7. Hiển thị confirmation
```

---

## 🎨 UI Features

### Payment Method Cards

**MoMo Option:**
- 🎨 Pink theme (#A50064)
- 💰 Logo "M" trong ô vuông màu hồng
- 💵 Hiển thị số tiền: "50,000 đ"
- ✅ Checkmark khi được chọn
- ⚠️ Warning box với lưu ý

**Cash Option:**
- 🔵 Blue theme
- 💳 CreditCard icon
- 📝 "Thanh toán trực tiếp khi đến khám"

**Later Option:**
- 🟢 Green theme
- ⏰ Clock icon
- 📝 "Đặt lịch trước, thanh toán sau"

---

## 🔧 Implementation Details

### Frontend Logic Flow (TO BE IMPLEMENTED)

```typescript
// In patient/appointments/page.tsx

const handleConfirmBooking = async () => {
  const paymentMethod = bookingData.paymentMethod;
  
  if (paymentMethod === "momo") {
    // Flow A: MoMo Payment First
    
    // Step 1: Save booking data to localStorage
    localStorage.setItem('pendingBooking', JSON.stringify(bookingData));
    
    // Step 2: Create MoMo payment (WITHOUT creating appointment)
    const paymentResult = await paymentService.createMomoPayment({
      appointmentId: "PENDING", // Temporary ID
      patientId: userId,
      doctorId: selectedDoctor._id,
      amount: bookingData.paymentAmount || 50000,
      orderInfo: `Đặt lịch khám với ${selectedDoctor.fullName}`,
    }, accessToken);
    
    // Step 3: Redirect to MoMo
    if (paymentResult.success && paymentResult.data.payUrl) {
      window.location.href = paymentResult.data.payUrl;
    }
  } else {
    // Flow B: Create appointment immediately (cash/later)
    await handleBookingSubmit();
  }
};
```

### Backend Callback Handler (TO BE IMPLEMENTED)

```typescript
// In payments.service.ts handleMomoCallback

async handleMomoCallback(callbackData: MoMoCallbackData) {
  // ... existing code
  
  if (resultCode === 0) {
    // Payment successful
    
    // Step 1: Get pending booking data from payment extraData
    const { pendingBookingData } = JSON.parse(callbackData.extraData);
    
    // Step 2: Create appointment
    const appointment = await this.appointmentModel.create({
      ...pendingBookingData,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentId: payment._id,
    });
    
    // Step 3: Update payment with appointmentId
    await this.paymentModel.findByIdAndUpdate(paymentId, {
      refId: appointment._id,
    });
    
    // Step 4: Send notification
    await this.notificationService.sendAppointmentCreatedNotification(appointment);
  }
}
```

### Payment Result Page Handler (TO BE IMPLEMENTED)

```typescript
// In patient/appointments/payment-result/page.tsx

useEffect(() => {
  if (resultCode === "0") {
    // Payment successful
    
    // Option 1: Get appointment from callback
    // Option 2: Query appointment by paymentId
    // Option 3: Poll backend until appointment is created
    
    // Show success message với link đến appointment
  }
}, [resultCode]);
```

---

## ⚠️ Important Notes

### Security Considerations:

1. **Pending Booking Data Storage:**
   - ❌ Không lưu trong localStorage (có thể bị giả mạo)
   - ✅ Lưu trong backend session/cache (Redis)
   - ✅ Hoặc encode trong payment extraData (nhưng limit 255 chars)

2. **Double Booking Prevention:**
   - Lock time slot khi tạo payment
   - Release lock nếu payment failed/timeout
   - Check slot availability trước khi tạo appointment trong callback

3. **Payment Timeout:**
   - MoMo payment có thời hạn (thường 15 phút)
   - Cleanup pending payments sau timeout

### Race Conditions:

- User có thể close browser sau khi thanh toán
- Callback có thể đến trước redirect
- Cần handle idempotency (prevent duplicate appointments)

---

## 📝 TODO: Implementation Steps

### Step 1: Update Appointment Creation Logic ⏳
```typescript
// file: client/src/app/patient/appointments/page.tsx

const handleConfirmBooking = async () => {
  if (bookingData.paymentMethod === "momo") {
    // TODO: Implement MoMo flow
    await handleMoMoPaymentFlow();
  } else {
    // Existing flow
    await handleBookingSubmit();
  }
};

const handleMoMoPaymentFlow = async () => {
  // TODO:
  // 1. Save booking data to backend temp storage
  // 2. Create payment with booking data in extraData
  // 3. Redirect to MoMo
};
```

### Step 2: Update Backend Callback Handler ⏳
```typescript
// file: server/src/modules/payments/payments.service.ts

async handleMomoCallback(callbackData: MoMoCallbackData) {
  // ... verify signature
  
  if (resultCode === 0) {
    // TODO:
    // 1. Parse pending booking data from extraData
    // 2. Create appointment
    // 3. Link appointment to payment
    // 4. Send notification
  }
}
```

### Step 3: Update Payment Result Page ⏳
```typescript
// file: client/src/app/patient/appointments/payment-result/page.tsx

// TODO:
// 1. Query appointment by paymentId
// 2. Show appointment details
// 3. Provide link to view appointment
// 4. Handle case where appointment not yet created (polling)
```

### Step 4: Add Backend Temp Storage ⏳
```typescript
// file: server/src/modules/payments/temp-booking.service.ts

// TODO:
// 1. Create temp storage for pending bookings (Redis)
// 2. Methods: save(), get(), delete()
// 3. TTL: 15 minutes
```

---

## 🎉 Current Status

### ✅ Completed:
- [x] BookingFormData type với paymentMethod field
- [x] Payment method selection UI in BookingForm
- [x] Beautiful MoMo/Cash/Later cards
- [x] Warning message cho MoMo option
- [x] Icons và styling

### ⏳ Pending:
- [ ] Implement MoMo payment flow logic
- [ ] Backend callback creates appointment
- [ ] Temp booking data storage
- [ ] Payment result page shows appointment
- [ ] Time slot locking mechanism
- [ ] Testing full flow

---

## 🚀 Next Actions

1. **Implement MoMo Flow Logic** (Priority: HIGH)
   - Update `handleConfirmBooking` in appointments page
   - Add temp booking storage
   - Update callback handler to create appointment

2. **Testing** (Priority: HIGH)
   - Test MoMo payment → appointment creation
   - Test cash/later still works
   - Test payment failure handling

3. **UI Polish** (Priority: MEDIUM)
   - Loading states during payment
   - Better error messages
   - Success animation

---

**Created**: October 16, 2025  
**Status**: 🟡 **IN PROGRESS** (UI Complete, Logic Pending)  
**Version**: 1.1.0


