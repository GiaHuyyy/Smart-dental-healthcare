# 📦 Cài đặt Dependencies cho Schedule Screen

## ⚠️ Quan trọng

Schedule screen cần thư viện `react-native-calendars` để hiển thị calendar view.

## 🔧 Cài đặt

### Bước 1: Mở terminal tại thư mục mobile
```bash
cd mobile
```

### Bước 2: Cài đặt thư viện
```bash
npx expo install react-native-calendars
```

### Bước 3: Restart development server
```bash
# Stop server hiện tại (Ctrl+C)
# Sau đó start lại:
npm start
```

## ✅ Sau khi cài đặt

1. Lỗi "Cannot find module 'react-native-calendars'" sẽ biến mất
2. Calendar sẽ hiển thị đầy đủ với:
   - Multi-dot marking
   - Date selection
   - Vietnamese format

## 📝 Kiểm tra cài đặt thành công

Mở file `mobile/package.json` và kiểm tra xem có dòng này không:
```json
"react-native-calendars": "^1.xxx.x"
```

## 🎯 Tính năng sử dụng Calendar

- **Calendar View**: Toggle từ list view
- **Multi-dot marking**: Hiển thị dots theo status của appointments
- **Date selection**: Click vào ngày để filter appointments
- **Marked dates**: Ngày có appointments sẽ được đánh dấu

---

**Lưu ý**: Đây là dependency bắt buộc. Nếu không cài, app sẽ báo lỗi compile.
