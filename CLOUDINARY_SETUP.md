# Hướng dẫn cấu hình Cloudinary

## Lỗi hiện tại
Lỗi "Invalid cloud_name smart-dental-healthcare" xảy ra do Cloudinary chưa được cấu hình đúng cách.

## Cách khắc phục

### 1. Tạo tài khoản Cloudinary
1. Truy cập [https://cloudinary.com/](https://cloudinary.com/)
2. Đăng ký tài khoản miễn phí
3. Sau khi đăng ký, bạn sẽ nhận được thông tin cấu hình

### 2. Lấy thông tin cấu hình
Trong Dashboard Cloudinary, bạn sẽ thấy:
- **Cloud Name**: Tên cloud của bạn
- **API Key**: Khóa API
- **API Secret**: Bí mật API

### 3. Cấu hình trong project

#### Tạo file .env trong thư mục server:
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/smart_dental_healthcare

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
CLOUDINARY_API_KEY=your-actual-api-key
CLOUDINARY_API_SECRET=your-actual-api-secret

PORT=3001
NODE_ENV=development
```

#### Thay thế các giá trị:
- `your-actual-cloud-name`: Cloud name từ Cloudinary dashboard
- `your-actual-api-key`: API key từ Cloudinary dashboard  
- `your-actual-api-secret`: API secret từ Cloudinary dashboard

### 4. Kiểm tra cấu hình
Chạy script kiểm tra để đảm bảo cấu hình đúng:
```bash
cd server
npm run check:cloudinary
```

Script sẽ hiển thị:
- ✅ Thông tin cấu hình
- ✅ Kết nối Cloudinary
- ✅ Thông tin tài khoản

### 5. Restart server
Sau khi cấu hình thành công, restart server:
```bash
cd server
npm run start:dev
```

Server sẽ log thông báo:
- ✅ "Cloudinary configured successfully" - nếu cấu hình đúng
- ❌ "Cloudinary configuration missing" - nếu thiếu thông tin

## Lưu ý bảo mật
- Không commit file .env lên git
- File .env đã được thêm vào .gitignore
- Chỉ chia sẻ thông tin API với người cần thiết

## Troubleshooting

### Lỗi "Invalid cloud_name"
- Kiểm tra CLOUDINARY_CLOUD_NAME có đúng không
- Đảm bảo không có khoảng trắng thừa
- Cloud name thường ngắn gọn: `demo123`, `myapp`, `testcloud`
- Không có dấu gạch ngang dài như "smart-dental-healthcare"

### Lỗi "Invalid API key"
- Kiểm tra CLOUDINARY_API_KEY có đúng không
- Đảm bảo API key chưa bị vô hiệu hóa
- Tạo API key mới trong Dashboard nếu cần

### Lỗi "Invalid API secret"
- Kiểm tra CLOUDINARY_API_SECRET có đúng không
- Đảm bảo API secret chưa bị thay đổi
- Reset API secret trong Dashboard nếu cần

### Lỗi 404 (Not Found)
- Cloud name không tồn tại
- Cần tạo tài khoản Cloudinary mới
- Xem file `CLOUDINARY_FIX_GUIDE.md` để biết chi tiết

## Scripts hỗ trợ

### Kiểm tra cấu hình cơ bản
```bash
npm run check:cloudinary
```

### Debug chi tiết
```bash
npm run debug:cloudinary
```

### Test các cloud name khác nhau
```bash
npm run test:cloudinary
```

## Hỗ trợ
Nếu vẫn gặp lỗi, vui lòng:
1. Chạy script debug để xem thông tin chi tiết
2. Xem file `CLOUDINARY_FIX_GUIDE.md` để biết cách khắc phục
3. Đảm bảo tài khoản Cloudinary còn hoạt động
4. Liên hệ quản trị viên để được hỗ trợ
