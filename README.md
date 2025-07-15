# Smart Dental Healthcare System

Hệ thống chăm sóc sức khỏe răng miệng thông minh với NextJS và NestJS.

## Cấu trúc dự án

```
Smart-fental-healthcare/
├── frontend/          # NextJS Application
├── backend/           # NestJS API
├── shared/           # Shared types and utilities
└── docker-compose.yml # Docker configuration
```

## Yêu cầu hệ thống

- Node.js 18+
- npm hoặc yarn
- PostgreSQL
- Docker (optional)

## Cài đặt

### Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

### Frontend (NextJS)

```bash
cd frontend
npm install
npm run dev
```

## Tính năng chính

- Quản lý bệnh nhân
- Đặt lịch khám
- Theo dõi điều trị
- Hồ sơ sức khỏe răng miệng
- Nhắc nhở chăm sóc
- Dashboard cho nha sĩ
