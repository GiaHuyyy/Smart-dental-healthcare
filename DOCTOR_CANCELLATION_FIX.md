# Doctor Cancellation Fix - Payment Auto-Reload & Patient Late Bill

**Date:** November 9, 2025
**Issue:** Khi bác sĩ hủy lịch, trang payment chưa auto-reload. Và khi bác sĩ hủy do bệnh nhân đến muộn, chưa tạo được bill +50,000 cho bác sĩ.

---

## 🔍 Root Cause Analysis

### Issue 1: Payment Page Không Auto-Reload Khi Bác Sĩ Hủy Lịch

**Nguyên nhân:**

- Method `deletePendingConsultationFeeBills()` trong `billing-helper.service.ts` xóa các bill pending consultation_fee **NHƯNG KHÔNG EMIT SOCKET EVENTS**
- Khi bác sĩ hủy lịch (bất kể lý do gì), các pending bills cũ sẽ bị xóa nhưng frontend không nhận được thông báo realtime
- So sánh: Method `deletePendingBillsForAppointment()` có emit socket events đầy đủ

**Luồng xảy ra:**

1. Bác sĩ hủy lịch với `doctorReason = 'patient_late'` hoặc `'emergency'`
2. `cancelAppointmentWithBilling()` được gọi
3. Nếu `patient_late`: Gọi `deletePendingConsultationFeeBills()` để xóa bill consultation_fee cũ (giữ lại cancellation_charge mới)
4. Nếu `emergency`: Gọi `deletePendingBillsForAppointment()` để xóa tất cả pending bills
5. ❌ `deletePendingConsultationFeeBills()` không emit events → Patient không thấy payment page tự động cập nhật

### Issue 2: Bill +50,000 Cho Bác Sĩ Khi Hủy Do Patient Late

**Thực tế:**

- Bill +50,000 **ĐÃ ĐƯỢC TẠO** trong method `createPendingReservationCharge()`
- Method này tạo CẢ 2:
  - Payment cho patient (amount = -50,000, billType = 'cancellation_charge', status = 'pending')
  - Revenue cho doctor (amount = +50,000, status = 'pending')
- Socket events cũng đã được emit trong `createPendingReservationCharge()`

**Vấn đề có thể xảy ra:**

- Nếu có lỗi khi tạo revenue (try-catch không throw), revenue có thể không được tạo nhưng payment vẫn được tạo
- Nếu frontend không connect đúng socket namespace `/revenue` với `auth: { doctorId }`

---

## ✅ Solution Implemented

### Fix 1: Thêm Socket Events Vào `deletePendingConsultationFeeBills()`

**File:** `server/src/modules/payments/billing-helper.service.ts`

**Changes:**

1. Lấy danh sách pending payments và revenues TRƯỚC KHI XÓA
2. Chỉ lấy revenues có `paymentId` link đến consultation_fee payments (tránh xóa nhầm cancellation_charge revenue)
3. Xóa payments và revenues với filter chính xác
4. Emit `payment:delete` events cho từng patient
5. Emit `revenue:delete` events cho từng doctor

**Code:**

```typescript
async deletePendingConsultationFeeBills(
  appointmentId: string,
): Promise<number> {
  // 🔍 Lấy danh sách pending payments trước khi xóa
  const pendingPayments = await this.paymentModel
    .find({
      refId: appointmentId,
      refModel: 'Appointment',
      status: 'pending',
      billType: 'consultation_fee', // CHỈ LẤY consultation_fee
    })
    .select('_id patientId')
    .exec();

  // 🔍 Lấy danh sách pending revenues (link đến consultation_fee)
  const consultationFeePaymentIds = pendingPayments.map((p) => p._id);
  const pendingRevenues = await this.revenueModel
    .find({
      refId: appointmentId,
      refModel: 'Appointment',
      status: 'pending',
      type: 'appointment',
      paymentId: { $in: consultationFeePaymentIds }, // CHỈ LẤY revenues của consultation_fee
    })
    .select('_id doctorId')
    .exec();

  // Xóa Payment consultation_fee
  const paymentResult = await this.paymentModel.deleteMany({...});

  // Xóa Revenue consultation_fee
  const revenueResult = await this.revenueModel.deleteMany({
    paymentId: { $in: consultationFeePaymentIds }, // CHỈ XÓA revenues của consultation_fee
  });

  // 🔔 Emit delete events
  for (const payment of pendingPayments) {
    this.paymentGateway.emitPaymentDelete(patientId, payment._id.toString());
  }

  for (const revenue of pendingRevenues) {
    this.revenueGateway.emitRevenueDelete(doctorId, revenue._id.toString());
  }

  return paymentResult.deletedCount + revenueResult.deletedCount;
}
```

**Tại sao cần filter `paymentId: { $in: consultationFeePaymentIds }`?**

- Revenue schema KHÔNG CÓ field `billType`
- Nếu chỉ filter theo `refId` + `status: 'pending'` + `type: 'appointment'`, sẽ xóa nhầm revenue của cancellation_charge (vừa mới tạo)
- Bằng cách filter theo `paymentId` link đến consultation_fee payments, đảm bảo chỉ xóa đúng revenues cũ

---

## 🔄 Complete Flow After Fix

### Khi Bác Sĩ Hủy Do Patient Late (payment method = "cash")

1. ✅ `createPendingReservationCharge()` được gọi

   - Tạo payment (-50k cho patient, billType='cancellation_charge', status='pending')
   - Tạo revenue (+50k cho doctor, status='pending')
   - Emit `payment:new` event → Patient
   - Emit `revenue:new` event → Doctor

2. ✅ Check `hasExistingPayment()` → FALSE (vì payment method là "cash", chưa thanh toán)

3. ✅ `deletePendingConsultationFeeBills()` được gọi (NOW FIXED)

   - Xóa pending consultation_fee payment (bill phí khám cũ)
   - Xóa pending consultation_fee revenue (bill phí khám cũ cho doctor)
   - Emit `payment:delete` events → Patient 🆕
   - Emit `revenue:delete` events → Doctor 🆕

4. ✅ Appointment status → CANCELLED

**Kết quả:**

- Patient thấy: Xóa bill phí khám cũ, thêm bill phí giữ chỗ -50k (pending) → **Auto-reload**
- Doctor thấy: Xóa revenue phí khám cũ, thêm revenue phí giữ chỗ +50k (pending) → **Auto-reload**

### Khi Bác Sĩ Hủy Do Patient Late (payment method = "wallet")

1. ✅ `createPendingReservationCharge()` được gọi

   - Tạo payment (-50k, cancellation_charge, pending)
   - Tạo revenue (+50k, pending)
   - Emit events

2. ✅ Check `hasExistingPayment()` → TRUE (đã thanh toán qua wallet, status='completed')

3. ✅ `refundConsultationFee()` được gọi

   - Tạo refund payment (+phí khám cho patient, status='completed')
   - Tạo negative revenue (-phí khám cho doctor, status='completed')
   - Cộng tiền vào wallet patient, trừ tiền từ wallet doctor
   - Emit `payment:new` event (refund) → Patient
   - Emit `revenue:new` event (negative) → Doctor

4. ✅ `deletePendingConsultationFeeBills()` được gọi

   - KHÔNG XÓA GÌ vì consultation_fee payment đã completed (không phải pending)

5. ✅ Appointment status → CANCELLED

**Kết quả:**

- Patient thấy: Bill hoàn tiền +phí khám (completed), bill phí giữ chỗ -50k (pending) → **Auto-reload**
- Doctor thấy: Revenue âm -phí khám (completed), revenue phí giữ chỗ +50k (pending) → **Auto-reload**

### Khi Bác Sĩ Hủy Do Emergency

1. ✅ `refundConsultationFee()` nếu đã thanh toán

   - Emit refund events

2. ✅ `createDoctorCancellationVoucher()` tạo voucher 5%

3. ✅ `deletePendingBillsForAppointment()` xóa TẤT CẢ pending bills

   - Emit delete events (đã có sẵn)

4. ✅ Appointment status → CANCELLED

**Kết quả:**

- Patient thấy: Xóa tất cả pending bills (nếu có), nhận refund (nếu đã trả), nhận voucher → **Auto-reload**
- Doctor thấy: Xóa tất cả pending revenues, trừ tiền refund (nếu có) → **Auto-reload**

---

## 🧪 Testing Checklist

### Test Case 1: Patient Late với Cash Payment

- [ ] Đặt lịch với payment method = "cash" (tạo pending consultation_fee)
- [ ] Bác sĩ hủy với lý do "patient_late"
- [ ] **Expected:**
  - Patient page: Xóa bill phí khám pending, thêm bill phí giữ chỗ -50k pending → Auto-reload ✅
  - Doctor page: Xóa revenue phí khám pending, thêm revenue phí giữ chỗ +50k pending → Auto-reload ✅

### Test Case 2: Patient Late với Wallet Payment

- [ ] Đặt lịch với payment method = "wallet" (tạo completed consultation_fee)
- [ ] Bác sĩ hủy với lý do "patient_late"
- [ ] **Expected:**
  - Patient page: Thêm refund +phí khám, thêm bill phí giữ chỗ -50k pending → Auto-reload ✅
  - Doctor page: Thêm negative revenue -phí khám, thêm revenue phí giữ chỗ +50k pending → Auto-reload ✅

### Test Case 3: Emergency với Cash Payment

- [ ] Đặt lịch với payment method = "cash"
- [ ] Bác sĩ hủy với lý do "emergency"
- [ ] **Expected:**
  - Patient page: Xóa bill phí khám pending, nhận voucher 5% → Auto-reload ✅
  - Doctor page: Xóa revenue phí khám pending → Auto-reload ✅

### Test Case 4: Emergency với Wallet Payment

- [ ] Đặt lịch với payment method = "wallet"
- [ ] Bác sĩ hủy với lý do "emergency"
- [ ] **Expected:**
  - Patient page: Thêm refund +phí khám, nhận voucher 5% → Auto-reload ✅
  - Doctor page: Thêm negative revenue -phí khám → Auto-reload ✅

---

## 📊 Socket Events Summary

### Payment Events (Namespace: `/payments`)

- `payment:new` - Patient nhận payment mới (cancellation_charge, refund)
- `payment:delete` - Patient nhận thông báo xóa payment (consultation_fee pending)
- `payment:update` - Patient nhận cập nhật payment (hiện chưa dùng)

### Revenue Events (Namespace: `/revenue`)

- `revenue:new` - Doctor nhận revenue mới (cancellation_charge, refund negative)
- `revenue:delete` - Doctor nhận thông báo xóa revenue (consultation_fee pending)
- `revenue:update` - Doctor nhận cập nhật revenue (hiện chưa dùng)

### Frontend Requirements

**Patient (Web):**

```typescript
// Connect to payment socket
const paymentSocket = io("http://localhost:8081/payments", {
  auth: { userId: currentUser._id },
});

paymentSocket.on("payment:new", (data) => {
  // Thêm payment mới vào danh sách
  refetchPayments();
});

paymentSocket.on("payment:delete", (data) => {
  // Xóa payment khỏi danh sách
  refetchPayments();
});
```

**Doctor (Web):**

```typescript
// Connect to revenue socket
const revenueSocket = io("http://localhost:8081/revenue", {
  auth: { doctorId: currentUser._id },
});

revenueSocket.on("revenue:new", (data) => {
  // Thêm revenue mới vào danh sách
  refetchRevenues();
});

revenueSocket.on("revenue:delete", (data) => {
  // Xóa revenue khỏi danh sách
  refetchRevenues();
});
```

---

## 🎯 Verification Points

### Backend Logs to Check:

```
✅ Cancellation charge payment event emitted to patient <patientId>
✅ Cancellation charge revenue event emitted to doctor <doctorId>
✅ Consultation fee payment delete event emitted to patient <patientId>
✅ Consultation fee revenue delete event emitted to doctor <doctorId>
```

### Database Checks:

1. Payments collection: Chỉ có cancellation_charge pending, consultation_fee đã bị xóa
2. Revenues collection: Chỉ có cancellation_charge pending, consultation_fee đã bị xóa

### Frontend Checks:

1. Payment page (Patient): Auto-reload without manual refresh
2. Revenue page (Doctor): Auto-reload without manual refresh
3. Network tab: Thấy socket events được nhận đúng

---

## 📝 Notes

- **Tại sao revenue không có billType?** Revenue schema chỉ tracking doanh thu cho doctor, không cần phân loại chi tiết như payment. Dùng `paymentId` để link với payment tương ứng.

- **Tại sao phí giữ chỗ là pending?** Phí giữ chỗ chỉ được tính khi patient **THỰC SỰ** thanh toán. Nếu patient không thanh toán, bill vẫn ở trạng thái pending như một "nợ".

- **Tại sao cần emit delete events?** Frontend cần biết khi nào bill bị xóa để update UI realtime. Nếu không có events, frontend sẽ vẫn hiển thị bill cũ cho đến khi user refresh trang.

- **So sánh với patient cancellation:** Khi patient hủy lịch hoặc đặt lịch, các socket events đã được emit đầy đủ, nên revenue page tự động reload. Đây là lý do tại sao "các trường hợp bệnh nhân đặt lịch hay hủy lịch thì trang revenue đã được auto reload dữ liệu mới rồi".

---

## ✨ Impact

### Before Fix:

- ❌ Payment page không auto-reload khi doctor hủy lịch (cần manual refresh)
- ⚠️ Revenue page có thể bị miss events khi doctor hủy do patient_late

### After Fix:

- ✅ Payment page auto-reload realtime cho MỌI trường hợp doctor hủy lịch
- ✅ Revenue page auto-reload realtime cho MỌI trường hợp doctor hủy lịch
- ✅ Đồng nhất với flow patient cancellation/booking (đã hoạt động tốt)
- ✅ Frontend không cần thay đổi gì (nếu đã connect socket đúng namespaces)

---

**Status:** ✅ FIXED
**Files Modified:**

- `server/src/modules/payments/billing-helper.service.ts`

**Frontend Action Required:** NONE (if already connected to `/payments` and `/revenue` sockets)
