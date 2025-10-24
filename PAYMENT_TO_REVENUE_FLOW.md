# 💰 LUỒNG THANH TOÁN → DOANH THU BÁC SĨ

## 📋 TỔNG QUAN LUỒNG

```
BỆNH NHÂN                    BACKEND                    BÁC SĨ
   |                            |                         |
   |--1. Đặt lịch------------>  |                         |
   |                            |                         |
   |<--2. Tạo appointment----   |                         |
   |    (pending_payment)       |                         |
   |                            |                         |
   |--3. Tạo payment-------->   |                         |
   |                            |                         |
   |<--4. MoMo payment URL--    |                         |
   |                            |                         |
   |--5. Thanh toán MoMo--->    |                         |
   |                            |                         |
   |                       MoMo |                         |
   |                            |                         |
   |                            |<--6. Callback MoMo---   |
   |                            |                         |
   |                            |--7. Update payment-->   |
   |                            |    (completed)          |
   |                            |                         |
   |                            |--8. Create revenue-->   |
   |                            |                         |
   |                            |--9. Send notification-->|
   |                            |                         |
   |                            |--10. Emit socket------->|--Revenue realtime
   |                            |        (revenue:new)    |
   |<--11. Payment result---    |                         |
   |    (redirect)              |                         |
   |                            |                         |
```

---

## 🔄 CHI TIẾT TỪNG BƯỚC

### **1. Bệnh nhân đặt lịch** 
📍 `/patient/appointments`

**Frontend:**
```typescript
// Tạo appointment với status: pending_payment
const appointmentResponse = await appointmentService.create({
  doctorId,
  patientId,
  appointmentDate,
  startTime,
  consultType,
  status: "pending_payment",  // ⚠️ CHÚ Ý: pending_payment
  paymentStatus: "unpaid",
  consultationFee
});
```

**Backend:**
```typescript
// AppointmentsController.create()
POST /api/v1/appointments
```

---

### **2. Tạo payment & redirect MoMo**
📍 `/patient/appointments`

**Frontend:**
```typescript
// Tạo MoMo payment URL
const paymentResponse = await paymentService.createMoMoPayment({
  appointmentId: appointment._id,
  patientId: session.user._id,
  doctorId: selectedDoctor._id,
  amount: consultationFee,
  orderInfo: `Thanh toán lịch khám #${appointment._id}`
});

// Redirect sang MoMo app/website
window.location.href = paymentResponse.data.payUrl;
```

**Backend:**
```typescript
// PaymentsController.createMomoPayment()
POST /api/v1/payments/momo

// Tạo payment record với status: pending
const payment = await this.paymentModel.create({
  patientId,
  doctorId,
  amount,
  status: 'pending',  // ⚠️ CHÚ Ý: pending
  type: 'appointment',
  refId: appointmentId,
  refModel: 'Appointment',
  paymentMethod: 'momo',
  transactionId: orderId
});

// Gọi MoMo API
const momoResponse = await this.momoService.createPayment({
  orderId,
  amount,
  returnUrl: 'http://localhost:3000/patient/appointments/payment-result',
  notifyUrl: 'http://localhost:8081/api/v1/payments/momo/callback'
});
```

---

### **3. Bệnh nhân thanh toán trên MoMo**
📍 MoMo App/Website

- Bệnh nhân nhập thông tin thanh toán
- MoMo xử lý giao dịch
- MoMo gửi callback về backend

---

### **4. MoMo gửi callback về Backend**
📍 Backend receives callback

**Backend:**
```typescript
// PaymentsController.handleMomoCallback()
POST /api/v1/payments/momo/callback

async handleMomoCallback(callbackData: MoMoCallbackData) {
  // 1. Verify signature
  const isValid = this.momoService.verifyCallbackSignature(callbackData);
  
  // 2. Update payment status
  const status = callbackData.resultCode === 0 ? 'completed' : 'failed';
  
  await this.paymentModel.findByIdAndUpdate(paymentId, {
    status,  // ⚠️ CHÚ Ý: completed
    paymentDate: new Date(),
    transactionId: callbackData.transId
  });
  
  // 3. 💰 TẠO REVENUE (QUAN TRỌNG!)
  if (status === 'completed') {
    const revenueResult = await this.revenueService.createRevenueFromPayment(paymentId);
    
    // 4. 🔔 GỬI THÔNG BÁO CHO BÁC SĨ
    if (revenueResult.success) {
      await this.notificationGateway.sendNotificationToUser(
        doctorId,
        {
          title: '💰 Doanh thu mới',
          message: `Bạn đã nhận được ${formattedAmount} từ thanh toán của ${patientName}`,
          type: 'revenue',
          linkTo: '/doctor/revenue'
        }
      );
    }
  }
  
  // 5. Update appointment status
  if (status === 'completed') {
    await this.appointmentModel.findByIdAndUpdate(appointmentId, {
      status: 'confirmed',  // ⚠️ CHÚ Ý: confirmed
      paymentStatus: 'paid',
      paymentId
    });
  }
}
```

---

### **5. Tạo Revenue từ Payment**
📍 `RevenueService.createRevenueFromPayment()`

**Backend:**
```typescript
async createRevenueFromPayment(paymentId: string) {
  // 1. Lấy payment info
  const payment = await this.paymentModel
    .findById(paymentId)
    .populate('doctorId')
    .populate('patientId')
    .exec();
  
  // 2. Tính phí nền tảng (5%)
  const platformFeeRate = 0.05;
  const platformFee = Math.round(payment.amount * platformFeeRate);
  const netAmount = payment.amount - platformFee;
  
  // 3. Tạo revenue record
  const revenue = await this.revenueModel.create({
    doctorId: payment.doctorId,
    paymentId: payment._id,
    patientId: payment.patientId,
    amount: payment.amount,          // Tổng tiền
    platformFee,                     // Phí 5%
    netAmount,                       // Tiền thực nhận
    revenueDate: payment.paymentDate || new Date(),
    status: 'completed',
    refId: payment.refId,
    refModel: payment.refModel,
    type: payment.type
  });
  
  // 4. 🔔 EMIT SOCKET EVENT (REALTIME)
  const populatedRevenue = await this.revenueModel
    .findById(revenue._id)
    .populate('patientId', 'fullName email phone')
    .populate('paymentId', 'transactionId paymentMethod')
    .exec();
  
  this.revenueGateway.emitNewRevenue(doctorId, populatedRevenue);
  
  return { success: true, data: populatedRevenue };
}
```

**Log trong console:**
```
💰 Creating revenue for completed payment...
✅ Revenue created successfully: { revenueId: xxx, doctorId: yyy, amount: 500000, netAmount: 475000 }
🔔 Emitted realtime revenue update to doctor: yyy
```

---

### **6. Gửi thông báo cho bác sĩ**
📍 `NotificationGateway.sendNotificationToUser()`

**Backend:**
```typescript
// 1. Lưu vào database
const notification = await this.notificationModel.create({
  userId: doctorId,
  title: '💰 Doanh thu mới',
  message: `Bạn đã nhận được 500.000 ₫ từ thanh toán của Nguyễn Văn A`,
  type: 'revenue',
  data: {
    revenueId,
    paymentId,
    appointmentId,
    amount: 500000,
    netAmount: 475000,
    platformFee: 25000
  },
  linkTo: '/doctor/revenue',
  icon: 'wallet',
  isRead: false
});

// 2. Emit socket event (realtime)
this.server.to(`user_${doctorId}`).emit('notification:new', notification);
```

**Log trong console:**
```
✅ Notification sent to doctor: xxx
Sent notification to user xxx: revenue
```

---

### **7. Bác sĩ nhận thông báo realtime**
📍 `/doctor/revenue` & Notification Component

**Frontend - Notification Socket:**
```typescript
// NotificationButton.tsx hoặc NotificationsContent.tsx
useEffect(() => {
  if (!socket) return;
  
  socket.on('notification:new', (notification) => {
    console.log('🔔 New notification:', notification);
    
    // Update notification list
    setNotifications(prev => [notification, ...prev]);
    
    // Update unread count
    setUnreadCount(prev => prev + 1);
    
    // Show toast (optional)
    toast.info(notification.title, {
      description: notification.message
    });
  });
}, [socket]);
```

**Frontend - Revenue Socket:**
```typescript
// useRevenueSocket.ts
useEffect(() => {
  if (!revenueSocket.isConnected) return;
  
  revenueSocket.onNewRevenue((data) => {
    console.log('💰 New revenue received:', data);
    
    // Reload revenue data
    loadRevenueData();
    
    // Show console log
    const amount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(data.revenue?.amount || 0);
    console.log(`🎉 Doanh thu mới: ${amount}`);
  });
}, [revenueSocket.isConnected]);
```

---

### **8. Bệnh nhân được redirect về kết quả**
📍 `/patient/appointments/payment-result?orderId=xxx&resultCode=0`

**Frontend:**
```typescript
// payment-result/page.tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  const resultCode = params.get('resultCode');
  
  // resultCode = 0: Success
  if (resultCode === '0') {
    setPaymentStatus('success');
    toast.success('Thanh toán thành công!');
  } else {
    setPaymentStatus('failed');
    toast.error('Thanh toán thất bại');
  }
  
  // Query backend để lấy payment info mới nhất
  const result = await paymentService.queryMoMoPayment(orderId);
  setPaymentInfo(result.data);
}, []);
```

---

## 🎯 QUAN HỆ GIỮA CÁC BẢNG

### **Payment → Revenue**
```typescript
Payment {
  _id: '67xxx',
  patientId: 'patient_123',
  doctorId: 'doctor_456',
  amount: 500000,
  status: 'completed',
  paymentDate: '2025-10-24T10:30:00Z',
  type: 'appointment',
  refId: 'appointment_789'
}

↓ createRevenueFromPayment()

Revenue {
  _id: '68xxx',
  doctorId: 'doctor_456',
  paymentId: '67xxx',  // ← Link đến Payment
  patientId: 'patient_123',
  amount: 500000,      // Tổng tiền
  platformFee: 25000,  // 5% phí
  netAmount: 475000,   // Tiền thực nhận (95%)
  revenueDate: '2025-10-24T10:30:00Z',
  status: 'completed',
  type: 'appointment',
  refId: 'appointment_789'
}
```

### **Revenue → Notification**
```typescript
Revenue Created
   ↓
Notification {
  _id: '69xxx',
  userId: 'doctor_456',  // Bác sĩ nhận thông báo
  title: '💰 Doanh thu mới',
  message: 'Bạn đã nhận được 500.000 ₫ từ thanh toán của Nguyễn Văn A',
  type: 'revenue',
  data: {
    revenueId: '68xxx',
    paymentId: '67xxx',
    appointmentId: 'appointment_789',
    amount: 500000,
    netAmount: 475000
  },
  linkTo: '/doctor/revenue',
  isRead: false
}
```

---

## 🔌 SOCKET CONNECTIONS

### **1. Notification Socket** (namespace: `/notifications`)
```typescript
// Backend: NotificationGateway
@WebSocketGateway({ namespace: '/notifications' })

// Client connect with userId
socket = io('http://localhost:8081/notifications', {
  auth: { userId: session.user._id }
});

// Events:
- notification:new → Thông báo mới
- notification:read → Đánh dấu đã đọc
- notification:allRead → Đánh dấu tất cả đã đọc
```

### **2. Revenue Socket** (namespace: `/revenue`)
```typescript
// Backend: RevenueGateway
@WebSocketGateway({ namespace: '/revenue' })

// Client connect with doctorId
socket = io('http://localhost:8081/revenue', {
  auth: { doctorId: session.user._id }
});

// Events:
- revenue:new → Doanh thu mới
- revenue:updated → Doanh thu cập nhật
- revenue:summaryUpdated → Tổng quan cập nhật
```

---

## 📊 DỮ LIỆU HIỂN THỊ Ở BÁC SĨ

### **Trang Revenue (`/doctor/revenue`)**

**Summary Cards:**
```
┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│ Tổng doanh thu      │ Phí nền tảng        │ Thực nhận           │ Tăng trưởng         │
│ 500.000 ₫          │ -25.000 ₫          │ 475.000 ₫          │ +10%                │
│ 1 giao dịch        │ 5% mỗi giao dịch   │ Sau khi trừ phí    │ So với tháng trước  │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

**Revenue List:**
```
┌────────────┬──────────────┬─────────┬───────────┬─────────┬───────────┬────────────┬──────────────┐
│ Ngày       │ Bệnh nhân    │ Loại    │ Tổng tiền │ Phí     │ Thực nhận │ Trạng thái │ Giao dịch    │
├────────────┼──────────────┼─────────┼───────────┼─────────┼───────────┼────────────┼──────────────┤
│ 24/10/2025 │ Nguyễn Văn A │ Lịch khám│ 500.000 ₫│ 25.000 ₫│ 475.000 ₫│ Hoàn thành │ APT_xxx_xxx  │
└────────────┴──────────────┴─────────┴───────────┴─────────┴───────────┴────────────┴──────────────┘
```

**Charts:**
- Biểu đồ xu hướng theo tháng
- Biểu đồ phân loại theo loại dịch vụ

### **Notification Bell**
```
🔔 (1)  ← Badge hiển thị số thông báo chưa đọc

Click vào bell:
┌─────────────────────────────────────────────┐
│ Thông báo                                    │
├─────────────────────────────────────────────┤
│ 💰 Doanh thu mới                     10:30  │
│ Bạn đã nhận được 500.000 ₫ từ...           │
│ [Xem chi tiết →]                            │
├─────────────────────────────────────────────┤
│ 📅 Lịch hẹn mới                      09:15  │
│ Nguyễn Văn A đã đặt lịch khám...           │
└─────────────────────────────────────────────┘
```

---

## ⏱️ THỜI GIAN REALTIME

```
Payment Completed (MoMo callback)
   ↓ < 100ms
Revenue Created
   ↓ < 100ms
Socket Event Emitted
   ↓ < 200ms
Frontend Receives Event
   ↓ < 100ms
UI Updates
───────────────
TỔNG: < 500ms (< 0.5 giây)
```

---

## 🧪 CÁCH TEST ĐẦY ĐỦ

### **Setup:**
1. Start Backend: `cd server && npm run start:dev`
2. Start Frontend: `cd client && npm run dev`
3. Mở 2 trình duyệt/tab

### **Test Flow:**

**Tab 1 - Bác sĩ:**
```
1. Login với tài khoản bác sĩ
2. Mở /doctor/revenue
3. Mở Console (F12)
4. Check logs:
   ✅ Connected to revenue socket
   ✅ Subscribing to revenue updates
5. Giữ trang này mở
```

**Tab 2 - Bệnh nhân:**
```
1. Login với tài khoản bệnh nhân
2. Mở /patient/appointments
3. Đặt lịch với bác sĩ ở Tab 1
4. Chọn thanh toán MoMo
5. Thanh toán thành công
6. Redirect về /patient/appointments/payment-result
```

**Quan sát Tab 1 - Bác sĩ:**
```
Console logs:
💰 New revenue received: {...}
🎉 Doanh thu mới: 500.000 ₫

UI changes:
✅ Tổng doanh thu: 500.000 ₫ (cập nhật)
✅ Thực nhận: 475.000 ₫ (cập nhật)
✅ Danh sách có record mới
✅ Biểu đồ cập nhật
✅ Notification bell có badge (1)
```

**Click Notification Bell:**
```
✅ Thông báo "💰 Doanh thu mới" hiển thị
✅ Click "Xem chi tiết" → Navigate to /doctor/revenue
```

---

## 🐛 TROUBLESHOOTING

### **Revenue không tự động cập nhật:**

**Check 1: Socket Connection**
```typescript
// Console should show:
🔌 Connecting to revenue socket... doctor_xxx
✅ Connected to revenue socket
📡 Subscribing to revenue updates...
```
→ Nếu không thấy: Kiểm tra `useRevenueSocket` hook

**Check 2: Backend Logs**
```
🔔 ========== MOMO CALLBACK RECEIVED ==========
💰 Creating revenue for completed payment...
✅ Revenue created successfully
🔔 Emitted realtime revenue update to doctor: xxx
```
→ Nếu không thấy: Kiểm tra MoMo callback URL

**Check 3: Payment Status**
```typescript
// Database check
db.payments.findOne({ transactionId: 'APT_xxx' })
// Should show: status: 'completed'
```
→ Nếu vẫn pending: MoMo callback chưa chạy

**Check 4: Revenue Creation**
```typescript
// Database check
db.revenues.find({ doctorId: 'doctor_xxx' }).sort({ createdAt: -1 })
// Should show revenue record mới
```
→ Nếu không có: Check logs createRevenueFromPayment

### **Thông báo không hiển thị:**

**Check 1: Notification Socket**
```typescript
// Check user connected
Backend log: "User xxx connected to notifications"
```

**Check 2: Notification Created**
```typescript
// Database check
db.notifications.find({ userId: 'doctor_xxx' }).sort({ createdAt: -1 })
```

**Check 3: Frontend Listening**
```typescript
// Check NotificationButton/NotificationsContent
socket.on('notification:new', callback) registered
```

---

## ✅ SUCCESS INDICATORS

Khi mọi thứ hoạt động đúng:

1. ✅ Payment status = 'completed'
2. ✅ Appointment status = 'confirmed'
3. ✅ Revenue record được tạo
4. ✅ Notification được tạo và emit
5. ✅ Frontend console shows "💰 New revenue received"
6. ✅ Revenue page tự động reload
7. ✅ Notification bell có badge mới
8. ✅ Click notification navigate đúng trang

---

**Tất cả đã sẵn sàng! Hãy test theo hướng dẫn trên để xác nhận.**
