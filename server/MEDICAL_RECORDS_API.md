# API Hồ Sơ Bệnh Án (Medical Records)

## 📋 Tổng Quan

API này cung cấp các endpoint để quản lý hồ sơ bệnh án, bao gồm tạo, đọc, cập nhật và xóa hồ sơ.

Base URL: `http://localhost:8081/api/v1/medical-records`

---

## 🔍 Các Endpoint Chính

### 1. Lấy Danh Sách Hồ Sơ Của Bệnh Nhân

```http
GET /api/v1/medical-records/patient/records?patientId={patientId}
```

**Parameters:**
- `patientId` (required): ID của bệnh nhân
- `limit` (optional): Số lượng hồ sơ trả về (default: 10)
- `page` (optional): Trang (default: 1)

**Response:**
```json
{
  "data": [
    {
      "_id": "68f112b70d51c90ec778aede",
      "patientId": "...",
      "doctorId": {
        "_id": "...",
        "fullName": "BS. Nguyễn Văn A",
        "email": "doctor@example.com",
        "specialty": "Nha khoa tổng quát"
      },
      "recordDate": "2024-01-15T10:30:00.000Z",
      "chiefComplaint": "Đau răng hàm dưới bên trái",
      "diagnosis": "Sâu răng độ 3, đã ảnh hưởng đến tủy răng",
      "treatmentPlan": "Điều trị tủy răng, sau đó bọc sứ để bảo vệ răng",
      "status": "active",
      "isFollowUpRequired": true,
      "followUpDate": "2024-02-15T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Lấy Chi Tiết Hồ Sơ

```http
GET /api/v1/medical-records/:id
```

**Response:** Trả về đầy đủ thông tin hồ sơ bao gồm:
- Thông tin bệnh nhân và bác sĩ
- Lý do khám, chẩn đoán, kế hoạch điều trị
- Thuốc, thủ thuật, sơ đồ răng
- Lịch tái khám

---

### 3. Cập Nhật Hồ Sơ (Thêm/Sửa Chẩn Đoán)

```http
PATCH /api/v1/medical-records/:id
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "diagnosis": "Viêm nha chu mức độ trung bình, cần điều trị nha chu và hướng dẫn vệ sinh răng miệng",
  "treatmentPlan": "Cạo vôi răng, đánh bóng, hướng dẫn chải răng đúng cách. Tái khám sau 1 tháng.",
  "notes": "Bệnh nhân cần chú ý vệ sinh răng miệng hàng ngày"
}
```

**Các trường có thể cập nhật:**
- `chiefComplaint`: Lý do khám
- `diagnosis`: Chẩn đoán ⭐
- `treatmentPlan`: Kế hoạch điều trị
- `status`: Trạng thái (active, completed, pending)
- `notes`: Ghi chú
- `medications`: Danh sách thuốc (array)
- `detailedMedications`: Thuốc chi tiết (array)

**Response:**
```json
{
  "message": "Cập nhật hồ sơ bệnh án thành công",
  "data": { ... }
}
```

---

### 4. Thêm Thủ Thuật

```http
POST /api/v1/medical-records/:id/procedures
```

**Body:**
```json
{
  "name": "Trám răng composite",
  "description": "Trám răng hàm lớn số 6 bằng vật liệu composite",
  "date": "2024-01-15T10:30:00.000Z",
  "cost": 500000,
  "status": "completed"
}
```

---

### 5. Cập Nhật Sơ Đồ Răng

```http
PATCH /api/v1/medical-records/:id/dental-chart
```

**Body:**
```json
{
  "toothNumber": 6,
  "condition": "Sâu răng",
  "treatment": "Trám composite",
  "notes": "Răng hàm lớn dưới bên phải"
}
```

---

### 6. Đặt Lịch Tái Khám

```http
PATCH /api/v1/medical-records/:id/follow-up
```

**Body:**
```json
{
  "followUpDate": "2024-02-15T00:00:00.000Z",
  "followUpTime": "09:00",
  "isFollowUpRequired": true
}
```

---

### 7. Lấy Hồ Sơ Theo Appointment

```http
GET /api/v1/medical-records/appointment/:appointmentId
```

Dùng để lấy hồ sơ bệnh án liên quan đến một lịch hẹn cụ thể.

---

## 📱 Sử dụng Trong Mobile App

### Ví dụ: Fetch hồ sơ bệnh nhân

```typescript
import { apiRequest } from '@/utils/api';

// Lấy danh sách hồ sơ
const response = await apiRequest<MedicalRecord[]>(
  `/api/v1/medical-records/patient/records?patientId=${patientId}`,
  { token }
);

const records = response.data;
```

### Ví dụ: Cập nhật chẩn đoán

```typescript
// Cập nhật chẩn đoán cho hồ sơ
const updateResponse = await apiRequest(
  `/api/v1/medical-records/${recordId}`,
  {
    method: 'PATCH',
    token,
    body: {
      diagnosis: 'Sâu răng độ 2, cần trám composite',
      treatmentPlan: 'Trám răng composite, tái khám sau 6 tháng'
    }
  }
);
```

---

## 🧪 Script Đã Tạo

### 1. Thêm chẩn đoán tự động
```bash
cd server
node scripts/add-diagnosis-to-records.js
```

Script này sẽ:
- Tìm các hồ sơ chưa có chẩn đoán
- Thêm chẩn đoán mẫu ngẫu nhiên
- Hiển thị kết quả

### 2. Test API cập nhật
```bash
node scripts/test-update-diagnosis-api.js
```

Hiển thị tài liệu API và ví dụ sử dụng.

---

## ✅ Kết Quả

Sau khi chạy script:
- ✅ **16 hồ sơ** đã được thêm chẩn đoán
- ✅ Mobile app hiển thị đầy đủ:
  - Lý do khám (chiefComplaint)
  - Chẩn đoán (diagnosis) ⭐
  - Kế hoạch điều trị (treatmentPlan)
- ✅ Các hồ sơ chưa có chẩn đoán hiển thị "Chưa có chẩn đoán" màu đỏ

---

## 🔗 Liên Kết

- Controller: `server/src/modules/medical-records/medical-records.controller.ts`
- Service: `server/src/modules/medical-records/medical-records.service.ts`
- Schema: `server/src/modules/medical-records/schemas/medical-record.schemas.ts`
- Mobile Component: `mobile/app/(tabs)/records.tsx`
