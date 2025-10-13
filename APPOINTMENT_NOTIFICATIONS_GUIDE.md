# Hướng Dẫn Thông Báo Lịch Hẹn Real-time

## Tổng quan

Hệ thống thông báo lịch hẹn sử dụng Socket.IO và Email để cung cấp thông báo real-time cho cả bác sĩ và bệnh nhân.

## Kiến trúc

### 1. Server-side Components

#### A. AppointmentNotificationGateway (`appointment-notification.gateway.ts`)

- **Namespace**: `/appointments`
- **Chức năng**: Quản lý kết nối WebSocket và gửi thông báo real-time
- **Events phát ra**:
  - `appointment:new` - Lịch hẹn mới được tạo (gửi cho bác sĩ)
  - `appointment:confirmed` - Lịch hẹn được xác nhận (gửi cho bệnh nhân)
  - `appointment:cancelled` - Lịch hẹn bị hủy
  - `appointment:rescheduled` - Lịch hẹn được dời lịch

**Connection Authentication**:

```typescript
handshake.auth: {
  userId: string,
  userRole: 'doctor' | 'patient',
  token: string
}
```

#### B. AppointmentEmailService (`appointment-email.service.ts`)

- **Chức năng**: Gửi email thông báo với template HTML
- **Methods**:
  - `sendNewAppointmentEmailToDoctor()` - Email khi có lịch hẹn mới
  - `sendCancellationEmail()` - Email khi hủy lịch hẹn

**Email Templates**:

- `appointment-new.hbs` - Template cho lịch hẹn mới
- `appointment-cancelled.hbs` - Template cho hủy lịch

#### C. AppointmentsService Integration

**create() method**:

```typescript
// 1. Tạo appointment
// 2. Populate doctor và patient info
// 3. Gửi Socket notification
await this.notificationGateway.notifyDoctorNewAppointment(doctorId, appointment);
// 4. Gửi email (fire-and-forget)
void this.emailService.sendNewAppointmentEmailToDoctor(appointment, doctor, patient);
```

**cancel() method**:

```typescript
// 1. Populate trước khi delete
// 2. Lưu appointment data
// 3. Delete document
// 4. Gửi notifications cho doctor
await this.notificationGateway.notifyAppointmentCancelled(doctorId, appointment, "patient");
void this.emailService.sendCancellationEmail(appointment, doctor, patient, "patient", reason);
```

### 2. Client-side Components

#### A. AppointmentSocketContext (`contexts/AppointmentSocketContext.tsx`)

**Provider**: Wrap ứng dụng để cung cấp socket connection

**Features**:

- Auto-connect khi user login
- Authentication với userId, userRole, token
- Event listeners cho tất cả appointment events
- Toast notifications tự động
- Reconnection logic

**Hook**: `useAppointmentSocket()`

```typescript
const { socket, isConnected, notifications, clearNotifications } = useAppointmentSocket();
```

#### B. Integration trong Patient Appointments

**File**: `patient/appointments/my-appointments/page.tsx`

**Features đã implement**:

- Wrap với `AppointmentSocketProvider`
- Socket status indicator (badge hiển thị trạng thái kết nối)
- Auto-refresh appointment list khi nhận notification
- Toast notifications cho appointment:confirmed, appointment:cancelled, appointment:rescheduled

**Socket Event Handlers**:

```typescript
socket.on("appointment:confirmed", handleRefresh);
socket.on("appointment:cancelled", handleRefresh);
socket.on("appointment:rescheduled", handleRefresh);
```

## Cách Test Hệ Thống

### Test 1: New Appointment Notification

**Mục tiêu**: Khi bệnh nhân đặt lịch, bác sĩ nhận thông báo real-time và email

**Steps**:

1. **Khởi động server**:

```bash
cd server
npm run start:dev
```

2. **Khởi động client**:

```bash
cd client
npm run dev
```

3. **Login as Doctor** (Tab 1):

   - Mở http://localhost:3000/auth/signin
   - Login với tài khoản bác sĩ
   - Vào trang `/doctor/schedule`
   - Mở Developer Console (F12) để xem logs

4. **Login as Patient** (Tab 2):

   - Mở http://localhost:3000/auth/signin (tab mới)
   - Login với tài khoản bệnh nhân
   - Vào trang đặt lịch `/patient/appointments`

5. **Đặt lịch hẹn**:

   - Chọn bác sĩ (cùng bác sĩ đã login ở Tab 1)
   - Điền thông tin: ngày, giờ, loại khám, triệu chứng
   - Click "Đặt lịch"

6. **Verify Notifications**:
   - **Tab Doctor**:
     - Console log: "New appointment notification:"
     - Toast xuất hiện: "Lịch hẹn mới từ [Tên bệnh nhân]"
     - Click "Xem" để đến trang schedule
   - **Email Doctor**:
     - Check inbox của doctor
     - Email với tiêu đề "Lịch Hẹn Mới"
     - Click nút "Xem Chi Tiết Lịch Hẹn"

### Test 2: Cancel Appointment Notification

**Mục tiêu**: Khi bệnh nhân hủy lịch, bác sĩ nhận thông báo

**Steps**:

1. **Patient cancels appointment**:

   - Ở tab Patient, vào `/patient/appointments/my-appointments`
   - Tìm appointment vừa tạo (status: pending)
   - Click menu 3 chấm → "Hủy lịch"
   - Nhập lý do hủy
   - Confirm

2. **Verify Doctor receives notification**:
   - **Tab Doctor**: Toast "Lịch hẹn đã bị hủy"
   - **Email Doctor**: Email thông báo hủy lịch với lý do

### Test 3: Socket Connection Status

**Mục tiêu**: Kiểm tra trạng thái kết nối real-time

**Steps**:

1. **Login as Patient**:

   - Vào `/patient/appointments/my-appointments`
   - Quan sát badge ở góc trên phải
   - **Badge xanh + "Đang kết nối"**: Socket connected
   - **Badge xám + "Ngoại tuyến"**: Socket disconnected

2. **Test reconnection**:
   - Stop server (Ctrl+C)
   - Badge chuyển sang "Ngoại tuyến"
   - Start server lại: `npm run start:dev`
   - Sau vài giây badge chuyển lại "Đang kết nối"

### Test 4: Auto-refresh Appointments

**Mục tiêu**: List appointments tự động refresh khi có thay đổi

**Steps**:

1. **Setup 2 browser windows**:

   - Window 1: Patient logged in, mở `/patient/appointments/my-appointments`
   - Window 2: Doctor logged in, mở `/doctor/schedule`

2. **Doctor confirms appointment** (Window 2):

   - Tìm appointment với status "pending"
   - Click "Xác nhận" (nếu UI có)
   - Hoặc gọi API confirm

3. **Patient sees update immediately** (Window 1):
   - Toast "Lịch hẹn đã được xác nhận"
   - Appointment status tự động chuyển từ "pending" → "confirmed"
   - Không cần F5 refresh

## Console Logs để Debug

### Client-side Logs:

```javascript
// Socket connection
"Connected to appointment socket";
"Disconnected from appointment socket";

// Events received
"New appointment notification:" + data;
"Appointment confirmed:" + data;
"Appointment cancelled:" + data;

// Auto-refresh
("Refreshing appointments due to socket event");
```

### Server-side Logs:

```typescript
// Gateway connections
"Client connected to appointments namespace: [socketId]";
"Client disconnected from appointments namespace: [socketId]";

// Notifications sent
"Notifying doctor [doctorId] of new appointment";
"Notifying user [userId] of cancellation";
```

## Troubleshooting

### Issue 1: Socket không connect

**Symptoms**: Badge luôn "Ngoại tuyến", không nhận toast

**Check**:

1. Server có đang chạy không? (port 8081)
2. `NEXT_PUBLIC_API_URL` trong `.env.local` đúng chưa?
3. Console có lỗi CORS không?
4. User đã login chưa? (socket cần accessToken)

**Fix**:

```bash
# Check server
cd server
npm run start:dev

# Check client env
cat client/.env.local
# Phải có: NEXT_PUBLIC_API_URL=http://localhost:8081
```

### Issue 2: Nhận toast nhưng không refresh list

**Symptoms**: Toast xuất hiện nhưng appointment list không update

**Check**:

1. Console log có "Refreshing appointments due to socket event" không?
2. API call fetchAppointments() có lỗi không?

**Debug**:

```typescript
// Thêm log trong useEffect
useEffect(() => {
  if (!socket) {
    console.log("Socket not available");
    return;
  }

  const handleRefresh = () => {
    console.log("Socket event received, fetching appointments");
    fetchAppointments();
  };

  socket.on("appointment:confirmed", handleRefresh);
  // ...
}, [socket]);
```

### Issue 3: Email không gửi

**Symptoms**: Socket hoạt động nhưng không nhận email

**Check**:

1. Server logs có lỗi từ MailerService không?
2. SMTP config trong `server/.env` đúng chưa?
3. Email template files có tồn tại không?

**Files required**:

- `server/src/mail/templates/appointment-new.hbs`
- `server/src/mail/templates/appointment-cancelled.hbs`

### Issue 4: Wrong user receives notification

**Symptoms**: Bệnh nhân A đặt lịch nhưng Bác sĩ B nhận thông báo

**Check**:

1. Appointment có đúng doctorId không?
2. Gateway có join đúng room không? (`user_${userId}`)
3. Multiple tabs cùng user có can thiệp không?

**Debug server-side**:

```typescript
// Trong appointment-notification.gateway.ts
async notifyDoctorNewAppointment(doctorId: string, appointment: any) {
  console.log(`Sending to room: user_${doctorId}`);
  console.log(`Socket rooms:`, this.server.sockets.adapter.rooms);
  // ...
}
```

## URL Structure (Important!)

### Doctor Routes:

- **Schedule page**: `/doctor/schedule`
- **Email link**: `/doctor/schedule?appointmentId=${id}`
- ❌ **NOT**: `/doctor/appointments` (route không tồn tại)

### Patient Routes:

- **My appointments**: `/patient/appointments/my-appointments`

## Next Steps

### Features chưa implement:

1. **Doctor-initiated cancellation**:

   - Doctor hủy lịch → gửi email/socket cho patient
   - Cần UI cancel button trong doctor schedule

2. **Appointment confirmation flow**:

   - Doctor xác nhận pending appointment
   - Email template mới: `appointment-confirmed.hbs`
   - Socket event patient nhận được

3. **Reschedule notifications**:

   - UI để doctor/patient dời lịch
   - Gateway method đã có: `notifyAppointmentRescheduled()`
   - Chỉ cần integrate API call

4. **Sound notifications** (optional):

   - Browser notification API
   - Play sound khi nhận appointment:new

5. **Notification history panel**:
   - UI hiển thị list notifications
   - Sử dụng `notifications` array từ context
   - Mark as read functionality

## File Structure Summary

```
server/
├── src/
│   ├── appointments/
│   │   ├── appointment-notification.gateway.ts  ✅
│   │   ├── appointment-email.service.ts         ✅
│   │   ├── appointments.service.ts              ✅ (modified)
│   │   └── appointments.module.ts               ✅ (modified)
│   └── mail/
│       └── templates/
│           ├── appointment-new.hbs              ✅
│           └── appointment-cancelled.hbs        ✅

client/
├── src/
│   ├── contexts/
│   │   └── AppointmentSocketContext.tsx         ✅
│   ├── app/
│   │   └── patient/
│   │       └── appointments/
│   │           └── my-appointments/
│   │               └── page.tsx                 ✅ (modified)
│   └── types/
│       └── appointment.ts                       ✅ (modified)
```

## API Endpoints Used

- `POST /api/v1/appointments` - Tạo lịch hẹn mới
- `GET /api/v1/appointments/patient/:patientId` - Lấy danh sách lịch hẹn
- `DELETE /api/v1/appointments/:id/cancel` - Hủy lịch hẹn

## Environment Variables

### Server (.env):

```env
PORT=8081
MONGODB_URI=mongodb://localhost:27017/dental-healthcare
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM="Smart Dental Healthcare <noreply@dental.com>"
```

### Client (.env.local):

```env
NEXT_PUBLIC_API_URL=http://localhost:8081
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
```

## Testing Checklist

- [ ] Server starts without errors (port 8081)
- [ ] Client starts without errors (port 3000)
- [ ] Doctor login successful
- [ ] Patient login successful
- [ ] Socket connects (badge "Đang kết nối")
- [ ] Create appointment triggers toast on doctor side
- [ ] Doctor receives email for new appointment
- [ ] Email link navigates to correct schedule page
- [ ] Cancel appointment shows dialog with reason field
- [ ] Cancel triggers notification and email to doctor
- [ ] Appointment list auto-refreshes without F5
- [ ] Socket reconnects after server restart
- [ ] Console logs show proper event flow

## Performance Notes

- **Fire-and-forget emails**: `void this.emailService.sendNewAppointmentEmailToDoctor()` không block request
- **Socket rooms**: Mỗi user join room `user_${userId}` cho targeted notifications
- **Auto-refresh**: Chỉ refresh khi có event liên quan, không poll liên tục
- **Toast duration**: 10 seconds với action button

---

**Tác giả**: GitHub Copilot
**Ngày tạo**: 2024
**Phiên bản**: 1.0
