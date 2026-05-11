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

## Chức năng chính (kèm ảnh minh hoạ)

> Ảnh demo hiện nằm trong `docs/screenshots/web` và `docs/screenshots/mobile`.

### Web app (client)

#### Landing / giới thiệu

![Web - Landing](docs/screenshots/web/p1-0.png)

#### Dành cho bệnh nhân

##### 1) Tổng quan sức khoẻ răng miệng, nhắc nhở chăm sóc

![Web - Patient Dashboard](docs/screenshots/web/p1-1.png)

##### 2) Tìm kiếm bác sĩ & đặt lịch (bản đồ / danh sách)

![Web - Book Appointment Map](docs/screenshots/web/p1-2.png)

##### 3) Xem thông tin bác sĩ / phòng khám

![Web - Doctor Profile](docs/screenshots/web/p1-3.png)
![Web - Clinic Gallery](docs/screenshots/web/p1-4.png)

##### 4) Hồ sơ điều trị

![Web - Treatment Records](docs/screenshots/web/p1-6.png)

##### 5) Thanh toán, ví & lịch sử giao dịch

![Web - Payments](docs/screenshots/web/p1-7.png)

##### 6) Thông báo

![Web - Notifications](docs/screenshots/web/p1-8.png)

##### 7) Chat AI (tư vấn + phân tích ảnh)

![Web - AI Chat](docs/screenshots/web/p1-5.png)

#### Dành cho bác sĩ

##### 1) Dashboard tổng quan

![Web - Doctor Overview](docs/screenshots/web/p1-9.png)

##### 2) Quản lý lịch hẹn

![Web - Doctor Schedule](docs/screenshots/web/p1-10.png)

##### 3) Quản lý bệnh nhân

![Web - Patient Management](docs/screenshots/web/p1-11.png)

##### 4) Chat tư vấn & gọi video (telehealth)

![Web - Chat & Calls](docs/screenshots/web/p1-12.png)
![Web - Video Call](docs/screenshots/web/p1-26.png)

##### 5) Doanh thu

![Web - Revenue](docs/screenshots/web/p1-13.png)

---

### Mobile app (mobile)

#### Dành cho bệnh nhân

##### 1) Tổng quan

![Mobile - Patient Overview](docs/screenshots/mobile/p1-14.jpg)

##### 2) Đặt lịch & xem lịch hẹn

![Mobile - Appointment Booking](docs/screenshots/mobile/p1-15.jpg)

##### 3) Smart Dental AI (tư vấn)

![Mobile - Smart Dental AI](docs/screenshots/mobile/p1-16.jpg)

##### 4) Hồ sơ bệnh án

![Mobile - Medical Records](docs/screenshots/mobile/p1-17.jpg)

##### 5) Thanh toán & ví

![Mobile - Payments](docs/screenshots/mobile/p1-18.jpg)

##### 6) Cài đặt

![Mobile - Settings](docs/screenshots/mobile/p1-19.jpg)

#### Dành cho bác sĩ

##### 1) Tổng quan

![Mobile - Doctor Overview](docs/screenshots/mobile/p1-20.jpg)

##### 2) Lịch khám

![Mobile - Doctor Schedule](docs/screenshots/mobile/p1-21.jpg)

##### 3) Danh sách bệnh nhân

![Mobile - Patients](docs/screenshots/mobile/p1-22.jpg)

##### 4) Chat & lịch sử cuộc gọi

![Mobile - Chat & Calls](docs/screenshots/mobile/p1-23.jpg)

##### 5) Doanh thu

![Mobile - Revenue](docs/screenshots/mobile/p1-24.jpg)

##### 6) Thông tin cá nhân

![Mobile - Profile](docs/screenshots/mobile/p1-25.jpg)

---

## Backend/API nổi bật (server)

- Appointments, doctor schedule, follow-ups
- Realtime: chat, notifications; namespace Socket.IO phục vụ payment/revenue
- Payments (MoMo test), Wallet, Revenue
- Medical records, prescriptions, medications
- Upload media: Cloudinary; AI modules: chat/history/feedback, image analysis
