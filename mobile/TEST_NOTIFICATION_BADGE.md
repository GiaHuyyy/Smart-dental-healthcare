# 🔔 TEST NOTIFICATION BADGE - TĂNG DẦN

## 🎯 Mục Đích
Test tính năng badge số trên chuông thông báo:
- ✅ Hiển thị số thông báo chưa đọc
- ✅ Tự động tăng khi có thông báo mới (1, 2, 3...)
- ✅ Giảm khi đánh dấu đã đọc
- ✅ Biến mất khi đọc hết

## 🚀 Bước 1: Khởi động Server

```bash
cd d:\A.N4K2\DATN\beta\v7\Smart-dental-healthcare\server
npm run start:dev
```

✅ Server chạy tại: http://localhost:8081

## 📱 Bước 2: Khởi động Mobile App

```bash
cd d:\A.N4K2\DATN\beta\v7\Smart-dental-healthcare\mobile
npm start
```

Chọn platform:
- **a** - Android
- **w** - Web (nhanh nhất để test)
- **i** - iOS

## 🔐 Bước 3: Đăng nhập

```
Email: patient.test@gmail.com
Password: 123456
```

## 🧪 Bước 4: Kiểm Tra Badge Ban Đầu

Sau khi đăng nhập:
- ✅ Badge trên chuông sẽ hiển thị số **5** (5 thông báo chưa đọc)
- ✅ Xem console logs:
  ```
  🔔 Loading notifications for user: 690b8a93d4c0edec6dbd522e
  ✅ Notifications loaded: 8 total
  📊 Unread notifications: 5
  🔔 AppHeader - Unread count from context: 5
  📱 AppHeader - Display count: 5
  ```

## ➕ Bước 5: Test Thêm Notification Mới

Mở terminal mới và chạy:

```bash
cd d:\A.N4K2\DATN\beta\v7\Smart-dental-healthcare\server\scripts
node add-new-notification.js
```

Kết quả:
```
✅ Created new notification: "🆕 Thông báo mới"
📈 New unread count: 6

📊 Updated Summary:
   - Total notifications: 9
   - Unread: 6
   - Read: 3

💡 Badge should now show: 6
```

### Làm mới app để thấy badge tăng lên

**Option 1**: Pull to refresh (kéo xuống để làm mới)

**Option 2**: Đăng xuất và đăng nhập lại

**Option 3**: Mở modal notification và đóng lại

✅ Badge bây giờ sẽ hiển thị **6** thay vì **5**

## 🔄 Bước 6: Test Thêm Nhiều Notification

Chạy lại script nhiều lần:

```bash
# Lần 1
node add-new-notification.js
# Badge: 6 → 7

# Lần 2
node add-new-notification.js
# Badge: 7 → 8

# Lần 3
node add-new-notification.js
# Badge: 8 → 9

# Lần 4
node add-new-notification.js
# Badge: 9 → 9+ (hiển thị "9+" khi > 9)
```

Refresh app sau mỗi lần để thấy badge tăng!

## ✅ Bước 7: Test Đánh Dấu Đã Đọc

### Test 1: Đánh dấu 1 notification
1. Click chuông → Modal mở
2. Click vào 1 notification
3. Badge giảm xuống (9+ → 9 → 8 → 7...)

### Test 2: Đánh dấu tất cả
1. Click chuông → Modal mở
2. Click "Đánh dấu tất cả đã đọc"
3. Badge biến mất (số = 0)

## 🔄 Bước 8: Test Auto Refresh

### Tự động refresh khi mark as read
1. Click chuông → Modal mở
2. Click vào 1 notification
3. Modal tự động refresh
4. Badge tự động giảm
5. Không cần đóng modal

### Test mark all as read
1. Click "Đánh dấu tất cả đã đọc"
2. Tất cả notifications → màu xám nhạt
3. Badge → 0 (ẩn)
4. Tab "Chưa đọc" → Empty state

## 📊 Console Logs Để Debug

Mở DevTools console để xem:

```javascript
// Khi load notifications
🔔 Loading notifications for user: 690b8a93d4c0edec6dbd522e
✅ Notifications loaded: 9 total
📊 Unread notifications: 6

// Khi AppHeader render
🔔 AppHeader - Unread count from context: 6
📱 AppHeader - Display count: 6

// Khi mark as read
🔄 Marking notification as read: 690b8b2ed4c0edec6dbd5245
✅ Marked as read successfully
🔔 Loading notifications for user: 690b8a93d4c0edec6dbd522e
✅ Notifications loaded: 9 total
📊 Unread notifications: 5
```

## 🎯 Expected Behavior

### Scenario 1: Login lần đầu
- Badge hiển thị **5** (từ sample data)

### Scenario 2: Thêm 1 notification mới
- Chạy `add-new-notification.js`
- Refresh app
- Badge tăng lên **6**

### Scenario 3: Thêm nhiều notifications
- Chạy script nhiều lần
- Refresh app mỗi lần
- Badge tăng: 6 → 7 → 8 → 9 → 9+

### Scenario 4: Mark as read
- Click vào notification
- Badge giảm: 9+ → 9 → 8 → 7...

### Scenario 5: Mark all as read
- Click "Đánh dấu tất cả đã đọc"
- Badge biến mất (0)

## 🐛 Troubleshooting

### Badge không hiển thị?
1. Check console logs
2. Verify đã đăng nhập
3. Check server đang chạy
4. Run `node create-sample-notifications.js`

### Badge không tăng sau khi add notification?
1. Verify script chạy thành công
2. Pull to refresh trong app
3. Hoặc đăng xuất/đăng nhập lại
4. Check console logs

### Badge hiển thị số lạ?
1. Check database: `node get-users.js`
2. Xóa hết và tạo lại: `node create-sample-notifications.js`
3. Restart app

## 🧹 Reset Data

Để reset về trạng thái ban đầu:

```bash
cd server/scripts
node create-sample-notifications.js
```

Sẽ xóa tất cả notifications cũ và tạo lại 8 notifications (5 unread, 3 read)

## ✅ Checklist

Test các tình huống sau:

- [ ] Login → Badge hiển thị 5
- [ ] Add notification → Badge tăng lên 6
- [ ] Add nhiều → Badge tăng 7, 8, 9, 9+
- [ ] Click notification → Badge giảm
- [ ] Mark all → Badge = 0
- [ ] Logout → Badge ẩn
- [ ] Login lại → Badge hiển thị lại số đúng
- [ ] Pull to refresh → Badge update
- [ ] Console logs hiển thị đúng số

## 🎉 Success Criteria

✅ Badge hiển thị số thông báo chưa đọc  
✅ Badge tự động tăng khi có notification mới  
✅ Badge tự động giảm khi mark as read  
✅ Badge ẩn khi số = 0  
✅ Badge hiển thị "9+" khi > 9  
✅ Real-time update không cần reload app  

---

**Ready to Test!** 🚀
