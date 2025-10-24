# Hướng dẫn khởi động Server

## Vấn đề hiện tại
Trang doanh thu đang gặp lỗi 404 vì server chưa được khởi động.

## Cách khởi động server

### Bước 1: Mở terminal và di chuyển đến thư mục server
```bash
cd Smart-dental-healthcare/server
```

### Bước 2: Cài đặt dependencies (nếu chưa có)
```bash
npm install
```

### Bước 3: Tạo file .env từ template
```bash
cp env.example .env
```

### Bước 4: Cấu hình .env file
Mở file `.env` và đảm bảo có các biến môi trường cần thiết:
```env
MONGODB_URI=mongodb://localhost:27017/smart_dental_healthcare
PORT=8081
CORS_ORIGIN=http://localhost:3000,http://localhost:8082
```

### Bước 5: Khởi động MongoDB (nếu chưa có)
```bash
# Trên Windows (nếu đã cài MongoDB)
net start MongoDB

# Hoặc sử dụng Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Bước 6: Khởi động server
```bash
npm run dev
```

## Kiểm tra server đã chạy

Mở browser và truy cập:
- http://localhost:8081/api/v1 (API base)
- http://localhost:8081/api/v1/revenue/doctor/test (Test revenue endpoint)

## Troubleshooting

### Lỗi 404 vẫn xuất hiện
1. Kiểm tra server có đang chạy trên port 8081 không
2. Kiểm tra MongoDB có đang chạy không
3. Kiểm tra file .env có đúng cấu hình không

### Lỗi kết nối database
1. Đảm bảo MongoDB đang chạy
2. Kiểm tra MONGODB_URI trong .env
3. Thử kết nối MongoDB bằng MongoDB Compass

### Lỗi CORS
1. Kiểm tra CORS_ORIGIN trong .env
2. Đảm bảo frontend đang chạy trên port 3000
