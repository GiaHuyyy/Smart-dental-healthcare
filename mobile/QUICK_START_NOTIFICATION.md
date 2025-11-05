# 🚀 Quick Start - Test Notification Modal

## Bước 1: Khởi động Backend Server

```bash
cd d:\A.N4K2\DATN\beta\v7\Smart-dental-healthcare\server
npm run start:dev
```

Server sẽ chạy tại: `http://localhost:8081`

## Bước 2: Khởi động Mobile App

```bash
cd d:\A.N4K2\DATN\beta\v7\Smart-dental-healthcare\mobile
npm start
```

Sau đó chọn:
- **a** - Chạy trên Android
- **i** - Chạy trên iOS
- **w** - Chạy trên Web

## Bước 3: Đăng nhập

Sử dụng tài khoản test đã tạo:

```
Email: patient.test@gmail.com
Password: 123456
```

## Bước 4: Test Notification Modal

### ✅ Kiểm tra Badge
- Badge đỏ trên icon chuông sẽ hiển thị số **5**
- Số này là số notifications chưa đọc

### ✅ Mở Modal
- Click vào icon chuông 🔔
- Modal dropdown sẽ hiện từ góc trên bên phải
- Hiển thị danh sách 8 notifications

### ✅ Test Filter
- Tab "Tất cả" → Hiển thị 8 notifications
- Tab "Chưa đọc (5)" → Chỉ hiển thị 5 notifications chưa đọc

### ✅ Test Mark as Read
- Click vào 1 notification → Đánh dấu đã đọc
- Badge số giảm xuống
- Notification chuyển sang màu xám nhạt

### ✅ Test Mark All as Read
- Click nút "Đánh dấu tất cả đã đọc"
- Tất cả notifications chuyển sang đã đọc
- Badge biến mất (số = 0)

### ✅ Đóng Modal
- Click vào backdrop (vùng tối bên ngoài)
- Click vào nút X
- Modal đóng lại

## 📊 Dữ Liệu Test

Database đã có:
- ✅ 1 user: `patient.test@gmail.com` / `123456`
- ✅ 8 notifications:
  - 2 appointment (1 chưa đọc, 1 đã đọc)
  - 2 payment (2 chưa đọc)
  - 2 reminder (2 chưa đọc)
  - 2 system (2 đã đọc)

## 🔧 Scripts Hữu Ích

### Tạo lại notifications test
```bash
cd d:\A.N4K2\DATN\beta\v7\Smart-dental-healthcare\server\scripts
node create-sample-notifications.js
```

### Xem danh sách users
```bash
cd d:\A.N4K2\DATN\beta\v7\Smart-dental-healthcare\server\scripts
node get-users.js
```

### Test API trực tiếp
```bash
cd d:\A.N4K2\DATN\beta\v7\Smart-dental-healthcare\server\scripts
node test-notifications-api.js
```

## 🎯 Features Đã Tích Hợp

1. **NotificationModal Component** ✅
   - Dropdown modal thay vì full-page
   - Positioned góc trên phải
   - Auto-sync với NotificationContext

2. **Badge Count Display** ✅
   - Real-time update
   - Lấy từ NotificationContext
   - Hiển thị max 9+

3. **Mark as Read** ✅
   - Single notification
   - Mark all notifications
   - Auto refresh badge

4. **Filter Tabs** ✅
   - Tất cả
   - Chưa đọc (X)

5. **AppHeader Integration** ✅
   - Tất cả tab screens có modal
   - Click chuông → Modal mở
   - Click backdrop → Modal đóng

## 🐛 Troubleshooting

### Badge không hiển thị?
1. Kiểm tra server đã chạy chưa
2. Kiểm tra đã đăng nhập đúng user chưa
3. Chạy lại script tạo notifications

### Modal không mở?
1. Check console logs
2. Verify NotificationContext đã load
3. Check AppHeader có showNotification={true}

### API lỗi?
1. Verify server chạy tại port 8081
2. Check MongoDB đã kết nối
3. Verify user đã tồn tại trong database

## 📱 Testing Checklist

- [ ] Server đang chạy (port 8081)
- [ ] Mobile app đã khởi động
- [ ] Đăng nhập thành công
- [ ] Badge hiển thị số 5
- [ ] Click chuông → Modal mở
- [ ] Modal hiển thị 8 notifications
- [ ] Tab filter hoạt động
- [ ] Click notification → đánh dấu đã đọc
- [ ] Badge số giảm xuống
- [ ] Mark all as read → Badge = 0
- [ ] Click backdrop → Modal đóng

## 🎉 Next Steps

Sau khi test thành công, bạn có thể:

1. **Customize UI**: Thay đổi màu sắc, font, spacing
2. **Add Features**: 
   - Swipe to delete
   - Long press menu
   - Push notifications
   - Real-time updates via WebSocket
3. **Production Ready**:
   - Remove test user
   - Add pagination
   - Add error handling
   - Add loading states

---

**Status**: ✅ Ready to test
**Last Updated**: November 6, 2025
