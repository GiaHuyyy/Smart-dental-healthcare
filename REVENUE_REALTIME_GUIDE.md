# 🚀 HƯỚNG DẪN TEST HỆ THỐNG DOANH THU REALTIME

## ✅ Các thay đổi đã thực hiện:

### 1. **Backend (Server)**

#### a. PaymentsModule
- ✅ Import `NotificationsModule`
- ✅ Inject `NotificationGateway` vào `PaymentsService`

#### b. PaymentsService  
- ✅ Gửi thông báo cho bác sĩ khi payment completed
- ✅ Thông báo bao gồm: tiền, tên bệnh nhân, link đến trang revenue
- ✅ Emit socket event đồng thời với tạo revenue

#### c. RevenueModule
- ✅ Tạo `RevenueGateway` mới (namespace: `/revenue`)
- ✅ Export `RevenueGateway` để các module khác sử dụng

#### d. RevenueService
- ✅ Inject `RevenueGateway`
- ✅ Emit socket event `revenue:new` khi tạo revenue mới
- ✅ Populate revenue data trước khi emit

#### e. RevenueGateway (Mới)
- ✅ WebSocket namespace: `/revenue`
- ✅ Manage doctor connections
- ✅ Events: `revenue:new`, `revenue:updated`, `revenue:summaryUpdated`

### 2. **Frontend (Client)**

#### a. useRevenueSocket Hook (Mới)
- ✅ Connect đến `/revenue` namespace
- ✅ Auth với `doctorId`
- ✅ Subscribe vào các events: `revenue:new`, `revenue:updated`, `revenue:summaryUpdated`
- ✅ Auto reconnect

#### b. DoctorRevenuePage
- ✅ Import và sử dụng `useRevenueSocket`
- ✅ Subscribe vào revenue updates
- ✅ Auto reload data khi có revenue mới
- ✅ Show console log cho debug

---

## 🧪 CÁCH TEST

### **Bước 1: Khởi động Backend**
```bash
cd server
npm run start:dev
```

### **Bước 2: Khởi động Frontend**
```bash
cd client
npm run dev
```

### **Bước 3: Mở 2 trình duyệt**

#### **Trình duyệt 1: Bác sĩ**
1. Đăng nhập với tài khoản bác sĩ
2. Mở trang `/doctor/revenue`
3. Mở Console (F12) để xem logs
4. Kiểm tra logs:
   ```
   🔌 Connecting to revenue socket... <doctorId>
   ✅ Connected to revenue socket
   📡 Subscribing to revenue updates...
   ```

#### **Trình duyệt 2: Bệnh nhân**
1. Đăng nhập với tài khoản bệnh nhân
2. Tạo appointment với bác sĩ ở trình duyệt 1
3. Thanh toán appointment qua MoMo

### **Bước 4: Quan sát kết quả**

#### **Backend Console (Server)**
Sẽ thấy logs:
```
🔔 ========== MOMO CALLBACK RECEIVED ==========
✅ ========== PAYMENT UPDATED ==========
💰 Creating revenue for completed payment...
✅ Revenue created successfully
🔔 Emitted realtime revenue update to doctor: <doctorId>
✅ Notification sent to doctor: <doctorId>
```

#### **Frontend Console (Trình duyệt 1 - Bác sĩ)**
Sẽ thấy logs:
```
💰 New revenue received: { revenue: {...}, timestamp: ... }
💰 New revenue notification: ...
🎉 Doanh thu mới: 500.000 ₫
```

#### **Frontend UI (Trình duyệt 1 - Bác sĩ)**
- ✅ Trang revenue tự động reload
- ✅ Summary cards update với số liệu mới
- ✅ Bảng danh sách hiển thị revenue mới
- ✅ Biểu đồ cập nhật
- ✅ **Thông báo mới xuất hiện** (click icon 🔔 ở header)

---

## 🔍 DEBUG CHECKLIST

### **Nếu revenue không tự động cập nhật:**

1. **Kiểm tra Backend Socket Connection:**
   ```
   Tìm log: "Doctor <doctorId> connected to revenue updates"
   ```

2. **Kiểm tra Frontend Socket Connection:**
   ```
   Mở Console, tìm: "✅ Connected to revenue socket"
   ```

3. **Kiểm tra Payment Callback:**
   ```
   Backend log: "🔔 ========== MOMO CALLBACK RECEIVED =========="
   Backend log: "💰 Creating revenue for completed payment..."
   ```

4. **Kiểm tra Revenue Creation:**
   ```
   Backend log: "✅ Revenue created successfully"
   Backend log: "🔔 Emitted realtime revenue update to doctor"
   ```

5. **Kiểm tra Notification:**
   ```
   Backend log: "✅ Notification sent to doctor"
   ```

### **Nếu thông báo không hiển thị:**

1. **Kiểm tra Notification Socket:**
   ```
   Backend: "User <userId> connected to notifications"
   ```

2. **Kiểm tra Notification Creation:**
   ```
   Backend: "Sent notification to user <userId>: revenue"
   ```

3. **Kiểm tra Frontend Notification Component:**
   - Mở trang `/doctor`
   - Click icon 🔔 ở header
   - Kiểm tra có thông báo mới không

---

## 🎯 EXPECTED BEHAVIOR

### **Khi Payment Completed:**

1. ✅ Revenue record được tạo trong database
2. ✅ Socket event `revenue:new` được emit đến bác sĩ
3. ✅ Notification được tạo và gửi đến bác sĩ
4. ✅ Frontend tự động:
   - Reload danh sách revenue
   - Update summary cards
   - Update charts
   - Show notification badge

### **Thời gian realtime:**
- ⚡ < 1 giây sau khi payment callback completed

---

## 🐛 COMMON ISSUES & SOLUTIONS

### **Issue 1: Socket không connect**
**Solution:**
- Kiểm tra `NEXT_PUBLIC_BACKEND_URL` trong `.env.local`
- Đảm bảo backend đang chạy
- Kiểm tra CORS settings trong gateway

### **Issue 2: Revenue không tạo**
**Solution:**
- Kiểm tra payment status = 'completed'
- Kiểm tra doctorId có trong payment
- Xem backend logs để tìm error

### **Issue 3: Notification không gửi**
**Solution:**
- Kiểm tra NotificationGateway đã được inject
- Kiểm tra userId đúng format
- Xem notification logs

### **Issue 4: Frontend không reload**
**Solution:**
- Kiểm tra useRevenueSocket hook đã được gọi
- Kiểm tra callback đã được register
- Mở Console xem có log "💰 New revenue received" không

---

## 📊 TEST SCENARIOS

### **Scenario 1: Single Payment**
1. Bác sĩ mở trang revenue
2. Bệnh nhân thanh toán 1 appointment
3. ✅ Revenue page tự động update

### **Scenario 2: Multiple Payments**
1. Bác sĩ mở trang revenue
2. Nhiều bệnh nhân thanh toán cùng lúc
3. ✅ Mỗi payment đều trigger update
4. ✅ Danh sách hiển thị tất cả revenues mới

### **Scenario 3: Offline -> Online**
1. Bác sĩ đóng tab revenue
2. Bệnh nhân thanh toán
3. Bác sĩ mở lại tab revenue
4. ✅ Danh sách revenue đã có payment mới
5. ✅ Notification badge hiển thị số thông báo chưa đọc

### **Scenario 4: Payment Failed**
1. Bác sĩ mở trang revenue
2. Bệnh nhân hủy thanh toán MoMo
3. ✅ Không có revenue mới được tạo
4. ✅ Không có notification gửi đến bác sĩ

---

## ✅ VERIFICATION CHECKLIST

- [ ] Backend khởi động thành công
- [ ] Frontend khởi động thành công
- [ ] Bác sĩ đăng nhập thành công
- [ ] Trang revenue hiển thị đúng
- [ ] Socket revenue connected (check console)
- [ ] Socket notification connected (check console)
- [ ] Tạo appointment thành công
- [ ] Thanh toán MoMo thành công
- [ ] Backend log shows revenue created
- [ ] Backend log shows notification sent
- [ ] Frontend console shows "💰 New revenue received"
- [ ] Revenue page tự động reload
- [ ] Summary cards update
- [ ] Danh sách revenue có record mới
- [ ] Notification bell có badge mới
- [ ] Click notification bell hiển thị thông báo mới

---

## 📞 SUPPORT

Nếu gặp vấn đề, kiểm tra:
1. Backend logs trong terminal
2. Frontend console logs
3. Network tab (WebSocket connections)
4. Database (kiểm tra revenue collection)

All logs should be prefixed with emojis for easy identification:
- 🔌 = Socket connection
- 💰 = Revenue operations
- 🔔 = Notifications
- ✅ = Success
- ❌ = Error
