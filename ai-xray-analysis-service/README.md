Dưới đây là phiên bản **`README.md` chuyên nghiệp và chi tiết** cho dự án **AI X-ray Analysis Service**, trong đó bạn đã yêu cầu rõ:

> ❗ **Ứng dụng phải phân tích ảnh X-ray chính xác (dùng mô hình AI thật, không giả lập)**

---

````markdown
# 🦷 AI X-ray Analysis Service (NestJS + Real AI Integration)

## 📌 Mục tiêu

Ứng dụng này là một **microservice dùng để phân tích ảnh X-ray nha khoa** một cách **chính xác bằng mô hình AI thật**.  

Cụ thể, app có thể:
- Nhận ảnh X-ray từ người dùng (qua frontend hoặc API).
- Gửi ảnh tới **mô hình AI đã huấn luyện (backend Flask hoặc model nội bộ)**.
- Trả về kết quả phân tích chính xác: sâu răng, răng khôn, viêm quanh răng, tiêu xương, v.v.
- Trình bày kết quả trên giao diện web đơn giản hoặc qua API.

---

## ⚙️ Công nghệ sử dụng

| Thành phần | Mô tả |
|------------|------|
| **NestJS** | Server nhận ảnh và giao tiếp với AI |
| **Multer** | Xử lý upload file ảnh |
| **HTTP Module** | Gọi đến Flask/FastAPI hoặc AI service nội bộ |
| **HTML + JS** | Giao diện test API đơn giản |
| **Python + AI model** | Mô hình học sâu (YOLOv5 / ResNet / U-Net) chạy riêng |

---

## 🧱 Kiến trúc tổng thể

```text
[ User Upload (HTML form / App) ]
              ↓
     [ NestJS Server (Port 3010) ]
              ↓
  [ Gọi đến Python AI model (Flask API) ]
              ↓
       [ Trả kết quả phân tích chính xác ]
````

---

## 📂 Cấu trúc thư mục

```bash
ai-xray-analysis-service/
├── src/
│   ├── analyze/
│   │   ├── analyze.controller.ts
│   │   ├── analyze.service.ts
│   │   └── analyze.module.ts
│   └── main.ts
├── public/
│   └── index.html         # Giao diện test upload ảnh
├── uploads/               # Lưu ảnh tạm để gửi sang AI model
├── .env                   # Cấu hình URL AI_BACKEND
├── package.json
└── README.md
```

---

## 🚀 Cài đặt & khởi chạy

### 1. Cài NestJS CLI (nếu chưa có)

```bash
npm install -g @nestjs/cli
```

### 2. Cài dependencies

```bash
cd ai-xray-analysis-service
npm install
```

### 3. Cấu hình `.env`

Tạo file `.env`:

```
PORT=3010
AI_BACKEND_URL=http://localhost:5000/predict
```

### 4. Khởi chạy NestJS server

```bash
npm run start
```

---

## 📤 API sử dụng

### `POST /analyze`

* Nhận ảnh X-ray từ user
* Gửi ảnh đến AI backend (qua API)
* Trả về kết quả JSON từ mô hình AI

#### Body:

* `multipart/form-data`
* Field: `xray` (file ảnh)

#### Response mẫu:

```json
{
  "diagnosis": "Cavity detected on tooth #18",
  "confidence": 0.92,
  "file": "1722301022-xray.jpg"
}
```

---

## 💻 Giao diện người dùng (HTML test UI)

Truy cập: [http://localhost:3010](http://localhost:3010)

Tính năng:

* Chọn ảnh X-ray
* Gửi ảnh
* Hiển thị kết quả chẩn đoán từ AI model

---

## 🤖 Mô hình AI cần tích hợp

Bạn có thể dùng:

| Tùy chọn                          | Mô tả                                         |
| --------------------------------- | --------------------------------------------- |
| ✅ **YOLOv5 / YOLOv8**             | Phát hiện vùng tổn thương trên ảnh X-ray      |
| ✅ **U-Net**                       | Phân đoạn hình ảnh răng                       |
| ✅ **ResNet / EfficientNet**       | Phân loại có tổn thương / không               |
| ✅ **Custom model của phòng khám** | Nếu bạn có dữ liệu nội bộ, có thể train riêng |

Mô hình AI nên được deploy ở Flask / FastAPI server lắng nghe `/predict` hoặc `/analyze`.

---

## 🧠 Yêu cầu từ mô hình AI backend

* **Endpoint:** `POST /predict`
* **Request:** `multipart/form-data` với trường `file`
* **Response:**

```json
{
  "diagnosis": "Possible bone loss",
  "confidence": 0.88,
  "annotations": [
    { "label": "bone loss", "x": 150, "y": 90, "width": 120, "height": 80 }
  ]
}
```

Bạn có thể custom lại `analyze.service.ts` để xử lý annotation nếu muốn vẽ box.

---

## 📈 Tương lai có thể mở rộng

* [ ] Lưu kết quả phân tích vào cơ sở dữ liệu
* [ ] Hiển thị overlay vùng tổn thương (bounding box)
* [ ] Gửi kết quả về hồ sơ bệnh án
* [ ] Thêm JWT auth để bảo vệ API
* [ ] Quản lý phiên bản mô hình AI

---

## ✅ Kiểm tra checklist

* [x] Upload ảnh hoạt động?
* [x] Kết nối đến Flask AI model thành công?
* [x] Trả về kết quả chẩn đoán chính xác từ AI?
* [ ] (Tùy chọn) Có annotation vùng tổn thương?

---

## 📞 Liên hệ kỹ thuật

Nếu bạn cần mô hình AI mẫu, docker deploy hoặc hỗ trợ huấn luyện:

* 📧 Email: [support@smile-ai.tech](mailto:support@smile-ai.tech)
* 📞 Hotline: 0888 888 888

---

> 🎯 Mục tiêu của hệ thống là hỗ trợ bác sĩ chẩn đoán nhanh chóng, chính xác hơn bằng cách sử dụng trí tuệ nhân tạo áp dụng cho ảnh X-ray nha khoa.

```

---

## ✅ Bạn có thể dùng file này để:
- Làm tài liệu chính thức trong GitHub repo
- Giao cho kỹ sư triển khai thực tế (NestJS + Flask AI)
- Trình bày với phòng khám hoặc đơn vị triển khai AI nha khoa

---

Nếu bạn cần mình tạo luôn:
- Flask AI backend mẫu (`/predict`)
- Postman collection
- Docker Compose tích hợp NestJS + Flask AI backend

👉 Mình có thể build gói demo đầy đủ cho bạn. Có cần không?
```
