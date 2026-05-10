# Smart Dental Healthcare

Hệ thống chăm sóc sức khỏe răng miệng thông minh theo mô hình **Web + Mobile + Backend**:

- **Web app** (Next.js) dành cho bệnh nhân/bác sĩ
- **Mobile app** (Expo/React Native) dành cho bệnh nhân/bác sĩ
- **Backend API** (NestJS + MongoDB) cung cấp REST + realtime (Socket.IO)

---

## Cấu trúc dự án

```
Smart-dental-healthcare/
├── client/   # Web (Next.js)
├── mobile/   # Mobile (Expo / React Native)
└── server/   # API (NestJS)
```

---

## Công nghệ nổi bật

### Web (client)

- Next.js 15 (App Router, Turbopack) + React 19 + TypeScript
- TailwindCSS + Radix UI, Redux Toolkit
- NextAuth (beta) cho xác thực/phiên đăng nhập
- Socket.IO client (realtime), WebRTC (simple-peer)
- Recharts (dashboard), Mapbox/MapLibre (bản đồ)

### Mobile (mobile)

- Expo 54 + Expo Router, React Native 0.81 + TypeScript
- NativeWind (Tailwind cho RN)
- Socket.IO client (realtime), WebRTC (react-native-webrtc)
- AsyncStorage, Calendar, Charts

### Backend (server)

- NestJS 11 + MongoDB (Mongoose)
- REST API + WebSocket Gateways (Socket.IO)
- Auth: JWT + Passport
- Mailer: SendGrid/Nodemailer, Notifications
- Cloudinary (upload media), Multer
- Gemini AI (Google Generative AI) cho các luồng AI

---

## Chức năng chính sơ bộ (kèm ảnh minh hoạ)

> Bạn thêm ảnh sau: đặt ảnh vào `docs/screenshots/...` và đổi đúng tên file theo placeholders bên dưới.

### Web app (client)

#### 1) Xác thực & hồ sơ người dùng

![Web - Auth 01](docs/screenshots/web/auth-01.png)
![Web - Auth 02](docs/screenshots/web/auth-02.png)

#### 2) Đặt lịch khám & quản lý lịch hẹn

![Web - Appointments 01](docs/screenshots/web/appointments-01.png)
![Web - Appointments 02](docs/screenshots/web/appointments-02.png)

#### 3) Theo dõi tái khám (Follow-ups)

![Web - Followups 01](docs/screenshots/web/followups-01.png)
![Web - Followups 02](docs/screenshots/web/followups-02.png)

#### 4) Chat realtime & hỗ trợ AI

![Web - Chat 01](docs/screenshots/web/chat-01.png)
![Web - Chat 02](docs/screenshots/web/chat-02.png)

#### 5) Thanh toán, ví & hoá đơn

![Web - Payments 01](docs/screenshots/web/payments-01.png)
![Web - Payments 02](docs/screenshots/web/payments-02.png)

#### 6) Dashboard/Thống kê

![Web - Dashboard 01](docs/screenshots/web/dashboard-01.png)
![Web - Dashboard 02](docs/screenshots/web/dashboard-02.png)

---

### Mobile app (mobile)

#### 1) Đăng nhập/Đăng ký & hồ sơ

![Mobile - Auth 01](docs/screenshots/mobile/auth-01.png)
![Mobile - Auth 02](docs/screenshots/mobile/auth-02.png)

#### 2) Đặt lịch & theo dõi lịch hẹn

![Mobile - Appointments 01](docs/screenshots/mobile/appointments-01.png)
![Mobile - Appointments 02](docs/screenshots/mobile/appointments-02.png)

#### 3) Chat realtime

![Mobile - Chat 01](docs/screenshots/mobile/chat-01.png)
![Mobile - Chat 02](docs/screenshots/mobile/chat-02.png)

#### 4) Gọi video/Telehealth (WebRTC)

![Mobile - Call 01](docs/screenshots/mobile/call-01.png)
![Mobile - Call 02](docs/screenshots/mobile/call-02.png)

#### 5) Thông báo & hồ sơ bệnh án

![Mobile - Notifications 01](docs/screenshots/mobile/notifications-01.png)
![Mobile - Records 01](docs/screenshots/mobile/records-01.png)

---

## Backend/API nổi bật (server)

- Appointments, doctor schedule, follow-ups
- Realtime: chat, notifications; namespace Socket.IO phục vụ payment/revenue
- Payments (MoMo test), Wallet, Revenue
- Medical records, prescriptions, medications
- Upload media: Cloudinary; AI modules: chat/history/feedback, image analysis