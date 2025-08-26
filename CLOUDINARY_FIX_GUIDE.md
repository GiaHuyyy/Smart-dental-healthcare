# 🔧 Hướng dẫn khắc phục lỗi Cloudinary

## 🚨 Vấn đề hiện tại
Lỗi "Invalid cloud_name smart-dental-healthcare" xảy ra vì cloud name không tồn tại hoặc thông tin cấu hình không chính xác.

## 🔍 Chẩn đoán
- ✅ API Key và API Secret đã được cấu hình
- ❌ Cloud name "smart-dental-healthcare" không tồn tại (lỗi 404)
- ❌ Cần tạo tài khoản Cloudinary mới hoặc lấy thông tin chính xác

## 🛠️ Cách khắc phục

### Phương án 1: Tạo tài khoản Cloudinary mới (Khuyến nghị)

#### Bước 1: Đăng ký tài khoản
1. Truy cập [https://cloudinary.com/](https://cloudinary.com/)
2. Click "Sign Up For Free"
3. Điền thông tin đăng ký
4. Xác nhận email

#### Bước 2: Lấy thông tin cấu hình
1. Đăng nhập vào [Cloudinary Console](https://cloudinary.com/console)
2. Trong Dashboard, bạn sẽ thấy:
   - **Cloud Name**: Ví dụ: `demo123`, `mycloud`, `testapp`
   - **API Key**: Dãy số dài
   - **API Secret**: Dãy ký tự bí mật

#### Bước 3: Cập nhật file .env
```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
CLOUDINARY_API_KEY=your-actual-api-key
CLOUDINARY_API_SECRET=your-actual-api-secret
```

#### Bước 4: Kiểm tra cấu hình
```bash
cd server
npm run check:cloudinary
```

### Phương án 2: Sử dụng tài khoản hiện có (nếu có)

#### Bước 1: Kiểm tra tài khoản hiện có
1. Đăng nhập vào [Cloudinary Console](https://cloudinary.com/console)
2. Kiểm tra xem có tài khoản nào đã tạo trước đó không
3. Lấy thông tin cấu hình chính xác

#### Bước 2: Cập nhật thông tin
Thay thế thông tin trong file `.env` với thông tin chính xác từ tài khoản hiện có.

## 📋 Ví dụ cấu hình đúng

### File .env
```bash
# Database
MONGODB_URI=mongodb+srv://21032471huy:app123@chat-app.5eyed.mongodb.net/smart_dental_healthcare?retryWrites=true&w=majority&appName=chat-app

# JWT Configuration
JWT_SECRET=DoAnTotNghiep2025

# Cloudinary Configuration (CẬP NHẬT THÔNG TIN NÀY)
CLOUDINARY_CLOUD_NAME=demo123
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123

# Other configurations...
PORT=8081
```

## 🧪 Kiểm tra sau khi cấu hình

### Bước 1: Chạy script kiểm tra
```bash
cd server
npm run check:cloudinary
```

### Bước 2: Kết quả mong đợi
```
🔍 Kiểm tra cấu hình Cloudinary...

📋 Thông tin cấu hình:
   Cloud Name: ✅ Đã cấu hình
   API Key: ✅ Đã cấu hình
   API Secret: ✅ Đã cấu hình

🔍 Giá trị cấu hình:
   Cloud Name: "demo123"
   API Key: 12345678...2345
   API Secret: abcdefgh...xyz123

🔗 Đang kiểm tra kết nối...

✅ Ping thành công!
   Status: ok

📊 Thông tin tài khoản:
   Cloud Name: demo123
   Plan: free
   Credits: 0/unlimited
   Media Library: unlimited items

🎉 Cấu hình Cloudinary hoàn tất!
💡 Bạn có thể sử dụng tính năng upload ảnh.
```

### Bước 3: Restart server
```bash
npm run start:dev
```

## 🚨 Lưu ý quan trọng

### 1. Cloud Name
- Cloud name thường ngắn gọn: `demo123`, `myapp`, `testcloud`
- Không có dấu gạch ngang dài như "smart-dental-healthcare"
- Cloud name phải tồn tại trong tài khoản Cloudinary

### 2. API Key & Secret
- API Key: Dãy số dài (thường 15-16 ký tự)
- API Secret: Dãy ký tự bí mật (thường 27 ký tự)
- Không chia sẻ API Secret với người khác

### 3. Bảo mật
- Không commit file .env lên git
- File .env đã được thêm vào .gitignore
- Chỉ chia sẻ thông tin API với người cần thiết

## 🔧 Troubleshooting

### Lỗi "Invalid cloud_name"
- Kiểm tra cloud name có đúng không
- Đảm bảo tài khoản Cloudinary đã được kích hoạt
- Thử tạo tài khoản mới

### Lỗi "Invalid API key"
- Kiểm tra API key có đúng không
- Tạo API key mới trong Dashboard nếu cần

### Lỗi "Invalid API secret"
- Kiểm tra API secret có đúng không
- Reset API secret trong Dashboard nếu cần

### Lỗi 401 (Unauthorized)
- Thông tin đăng nhập không chính xác
- Kiểm tra lại tất cả thông tin

### Lỗi 404 (Not Found)
- Cloud name không tồn tại
- Cần tạo tài khoản Cloudinary mới

## 📞 Hỗ trợ

Nếu vẫn gặp vấn đề:
1. Kiểm tra log server để xem thông báo lỗi chi tiết
2. Đảm bảo tài khoản Cloudinary còn hoạt động
3. Thử tạo tài khoản Cloudinary mới
4. Liên hệ quản trị viên để được hỗ trợ

## 🎯 Kết quả mong đợi

Sau khi cấu hình đúng:
- ✅ Upload ảnh X-ray thành công
- ✅ Phân tích AI hoạt động bình thường
- ✅ Hình ảnh hiển thị trong trang đặt lịch
- ✅ Không còn lỗi "Invalid cloud_name"
