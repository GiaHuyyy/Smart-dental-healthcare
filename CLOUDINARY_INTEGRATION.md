# Cloudinary Integration Guide

## 🎯 Tổng quan
Đã tích hợp Cloudinary vào tất cả các dịch vụ liên quan đến hình ảnh trong hệ thống Smart Dental Healthcare.

## 📋 Thông tin Cloudinary
- **Cloud Name**: smart-dental-healthcare
- **API Key**: 861288181392687
- **API Secret**: bWiSaoYG4YbTp2SUssh1hdzS24s

## 🏗️ Cấu trúc tích hợp

### 1. **Server (Main Backend)**
```
server/src/modules/cloudinary/
├── cloudinary.service.ts    # Cloudinary service
└── cloudinary.module.ts     # Cloudinary module
```

**Tích hợp vào:**
- `image-analysis` module: Upload hình ảnh phân tích
- `ai-chat` module: Xử lý hình ảnh trong chat

### 2. **AI X-ray Analysis Service**
```
ai-xray-analysis-service/src/cloudinary/
├── cloudinary.service.ts    # Cloudinary service
└── cloudinary.module.ts     # Cloudinary module
```

**Tích hợp vào:**
- `analyze` module: Upload và phân tích ảnh X-quang

### 3. **Chatbot Service**
```
chatbot-service/src/cloudinary/
├── cloudinary.service.ts    # Cloudinary service
└── cloudinary.module.ts     # Cloudinary module
```

**Tích hợp vào:**
- `chatbot` module: Xử lý hình ảnh trong chatbot

## 🔧 Cấu hình Environment Variables

### Server (.env)
```env
CLOUDINARY_CLOUD_NAME=smart-dental-healthcare
CLOUDINARY_API_KEY=861288181392687
CLOUDINARY_API_SECRET=bWiSaoYG4YbTp2SUssh1hdzS24s
CLOUDINARY_UPLOAD_PRESET=ml_default
```

### AI X-ray Analysis Service (.env)
```env
CLOUDINARY_CLOUD_NAME=smart-dental-healthcare
CLOUDINARY_API_KEY=861288181392687
CLOUDINARY_API_SECRET=bWiSaoYG4YbTp2SUssh1hdzS24s
CLOUDINARY_UPLOAD_PRESET=ml_default
```

### Chatbot Service (.env)
```env
CLOUDINARY_CLOUD_NAME=smart-dental-healthcare
CLOUDINARY_API_KEY=861288181392687
CLOUDINARY_API_SECRET=bWiSaoYG4YbTp2SUssh1hdzS24s
CLOUDINARY_UPLOAD_PRESET=ml_default
```

## 📁 Folder Structure trên Cloudinary

### 1. **Main Backend**
- Folder: `smart-dental-healthcare/`
- Chứa: Hình ảnh từ image analysis và AI chat

### 2. **AI X-ray Analysis Service**
- Folder: `smart-dental-healthcare/xray-analysis/`
- Chứa: Ảnh X-quang và kết quả phân tích

### 3. **Chatbot Service**
- Folder: `smart-dental-healthcare/chatbot/`
- Chứa: Hình ảnh từ chatbot conversations

## 🚀 Tính năng Cloudinary

### 1. **Upload Image**
```typescript
// Upload từ file buffer
const result = await cloudinaryService.uploadImage(file);

// Upload từ file path
const result = await cloudinaryService.uploadImage(filePath, filename);
```

### 2. **Image Transformations**
- **Resize**: Tự động resize về 800x600
- **Quality**: Tự động tối ưu chất lượng
- **Format**: Tự động chuyển đổi format phù hợp

### 3. **Delete Image**
```typescript
await cloudinaryService.deleteImage(public_id);
```

### 4. **Get Image URL**
```typescript
const url = await cloudinaryService.getImageUrl(public_id, options);
```

## 📊 Workflow tích hợp

### 1. **Image Analysis Workflow**
```
User upload image → Multer (memory storage) → Cloudinary upload → AI analysis → Return result with Cloudinary URL
```

### 2. **AI X-ray Analysis Workflow**
```
User upload X-ray → Multer (disk storage) → Cloudinary upload → AI analysis → Return result with Cloudinary URL
```

### 3. **Chatbot Workflow**
```
User send image → Multer (disk storage) → Cloudinary upload → AI analysis → Return response with Cloudinary URL
```

## 🔒 Bảo mật

### 1. **API Keys**
- API Secret chỉ được sử dụng ở backend
- API Key có thể được sử dụng ở frontend (public)
- Tất cả keys được lưu trong environment variables

### 2. **Upload Security**
- Chỉ chấp nhận file hình ảnh (jpg, jpeg, png, gif)
- Giới hạn kích thước file: 10MB
- Tự động validate file type

### 3. **Folder Organization**
- Mỗi service có folder riêng
- Tự động tạo public_id unique
- Dễ dàng quản lý và backup

## 📈 Lợi ích

### ✅ **Performance**
- CDN toàn cầu của Cloudinary
- Tự động optimize hình ảnh
- Lazy loading và caching

### ✅ **Scalability**
- Không cần quản lý storage server
- Tự động scale theo traffic
- Backup và redundancy tự động

### ✅ **Cost Effective**
- Pay-as-you-go pricing
- Không cần đầu tư infrastructure
- Tối ưu bandwidth usage

### ✅ **Developer Experience**
- API đơn giản và dễ sử dụng
- SDK cho nhiều ngôn ngữ
- Documentation chi tiết

## 🧪 Testing

### Test Upload
```bash
# Test image analysis
curl -X POST http://localhost:3001/api/v1/image-analysis/upload \
  -F "image=@test-image.jpg"

# Test AI X-ray analysis
curl -X POST http://localhost:3010/analyze \
  -F "xray=@test-xray.jpg"

# Test chatbot
curl -X POST http://localhost:3002/chat/upload \
  -F "image=@test-image.jpg"
```

## 📚 Documentation

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)

## 🎉 Kết luận

Cloudinary đã được tích hợp thành công vào tất cả các dịch vụ hình ảnh. Hệ thống giờ đây có:

1. **Centralized Image Management** - Tất cả hình ảnh được lưu trữ tập trung
2. **Automatic Optimization** - Tự động tối ưu chất lượng và kích thước
3. **Global CDN** - Phân phối hình ảnh nhanh toàn cầu
4. **Scalable Infrastructure** - Không cần quản lý storage server
5. **Cost Effective** - Chỉ trả tiền cho những gì sử dụng

Tất cả hình ảnh từ chatbot, AI analysis, và X-ray analysis đều được lưu trữ an toàn trên Cloudinary! 🚀
