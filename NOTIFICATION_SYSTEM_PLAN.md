# 🔔 Hệ Thống Thông Báo - Smart Dental Healthcare

## 📋 Tổng Quan

Hệ thống thông báo thời gian thực cho bác sĩ và bệnh nhân về các sự kiện liên quan đến lịch hẹn, lịch khám, tin nhắn, và các hoạt động quan trọng khác.

---

## 🎯 Mục Tiêu

- ✅ Thông báo thời gian thực qua Socket.IO (đã có GlobalSocketContext)
- ✅ Hiển thị danh sách thông báo trong dropdown
- ✅ Đếm số lượng thông báo chưa đọc
- ✅ Đánh dấu đã đọc/chưa đọc
- ✅ Lưu trữ thông báo trong database
- ✅ Phân loại thông báo theo loại sự kiện
- ✅ Link trực tiếp đến trang liên quan

---

## 📊 Các Loại Thông Báo

### 1. **Lịch Hẹn (Appointment)**

#### Cho Bác Sĩ:

- 🟢 `APPOINTMENT_NEW` - Có lịch hẹn mới từ bệnh nhân
- 🔴 `APPOINTMENT_CANCELLED_BY_PATIENT` - Bệnh nhân hủy lịch hẹn
- ✅ `APPOINTMENT_CONFIRMED` - Bệnh nhân xác nhận lịch (nếu cần)

#### Cho Bệnh Nhân:

- ✅ `APPOINTMENT_CONFIRMED` - Bác sĩ xác nhận lịch hẹn
- 🔴 `APPOINTMENT_CANCELLED_BY_DOCTOR` - Bác sĩ hủy lịch hẹn
- ✅ `APPOINTMENT_COMPLETED` - Lịch hẹn hoàn thành
- ⏰ `APPOINTMENT_REMINDER` - Nhắc nhở lịch hẹn sắp tới (1 giờ/1 ngày trước)

### 2. **Tin Nhắn (Chat)**

- 💬 `MESSAGE_NEW` - Có tin nhắn mới
- 💬 `MESSAGE_UNREAD` - Có tin nhắn chưa đọc

### 3. **Điều Trị (Treatment)**

#### Cho Bệnh Nhân:

- 📋 `TREATMENT_PLAN_NEW` - Kế hoạch điều trị mới
- 💊 `PRESCRIPTION_NEW` - Đơn thuốc mới
- 📝 `MEDICAL_RECORD_UPDATED` - Hồ sơ điều trị được cập nhật

### 4. **Theo Dõi (Follow-up)**

- 🔔 `FOLLOWUP_REMINDER` - Nhắc tái khám
- 📅 `FOLLOWUP_DUE` - Đến hạn tái khám

### 5. **Hệ Thống (System)**

- ⚙️ `SYSTEM_MAINTENANCE` - Bảo trì hệ thống
- 🎉 `SYSTEM_UPDATE` - Cập nhật tính năng mới

---

## 🗄️ Database Schema

### Notification Model (MongoDB)

```typescript
{
  _id: ObjectId,
  userId: ObjectId, // ref: User
  type: String, // enum: ['appointment', 'message', 'treatment', 'followup', 'system']
  event: String, // enum: loại sự kiện cụ thể (xem trên)
  title: String, // Tiêu đề ngắn gọn
  message: String, // Nội dung chi tiết
  relatedId: ObjectId, // ID của appointment/chat/treatment liên quan
  relatedModel: String, // 'Appointment', 'Message', 'Treatment', etc.
  link: String, // URL để navigate
  isRead: Boolean, // default: false
  priority: String, // enum: ['low', 'normal', 'high', 'urgent']
  metadata: Object, // Thông tin thêm (tên bác sĩ, bệnh nhân, ngày giờ, v.v)
  createdAt: Date,
  readAt: Date,
}
```

### Indexes

```javascript
// Tìm nhanh notifications của user
{ userId: 1, createdAt: -1 }

// Đếm unread
{ userId: 1, isRead: 1 }

// Tìm theo type
{ userId: 1, type: 1, createdAt: -1 }
```

---

## 🏗️ Backend Architecture

### 1. Notification Service (`notifications.service.ts`)

```typescript
class NotificationService {
  // Create notification
  async create(data: CreateNotificationDto): Promise<Notification>;

  // Get user notifications (paginated)
  async findByUser(userId: string, query: NotificationQuery): Promise<NotificationList>;

  // Mark as read
  async markAsRead(notificationId: string): Promise<void>;

  // Mark all as read
  async markAllAsRead(userId: string): Promise<void>;

  // Delete notification
  async delete(notificationId: string): Promise<void>;

  // Get unread count
  async getUnreadCount(userId: string): Promise<number>;

  // Cleanup old notifications (cron job)
  async cleanup(olderThanDays: number): Promise<void>;
}
```

### 2. Notification Gateway (`notifications.gateway.ts`)

```typescript
@WebSocketGateway()
class NotificationGateway {
  // Send real-time notification
  sendNotification(userId: string, notification: Notification): void;

  // Send to multiple users
  sendToMultiple(userIds: string[], notification: Notification): void;

  // Broadcast to role (all doctors/patients)
  broadcastToRole(role: "doctor" | "patient", notification: Notification): void;
}
```

### 3. Integration với Appointment Service

```typescript
// Trong appointments.service.ts

// Khi tạo appointment mới
async create(dto: CreateAppointmentDto) {
  // ... create appointment

  // Create notification for doctor
  await this.notificationService.create({
    userId: appointment.doctorId,
    type: 'appointment',
    event: 'APPOINTMENT_NEW',
    title: 'Lịch hẹn mới',
    message: `${patientName} đã đặt lịch khám vào ${date} lúc ${time}`,
    relatedId: appointment._id,
    relatedModel: 'Appointment',
    link: `/doctor/schedule`,
    priority: 'high',
    metadata: {
      patientName,
      appointmentDate: date,
      startTime: time,
    }
  });

  // Send real-time via socket
  this.notificationGateway.sendNotification(doctorId, notification);
}

// Khi doctor hủy appointment
async cancel(id: string, reason: string, cancelledBy: 'doctor') {
  // ... update appointment

  // Create notification for patient
  await this.notificationService.create({
    userId: appointment.patientId,
    type: 'appointment',
    event: 'APPOINTMENT_CANCELLED_BY_DOCTOR',
    title: 'Lịch hẹn bị hủy',
    message: `BS. ${doctorName} đã hủy lịch hẹn vào ${date}. Lý do: ${reason}`,
    relatedId: appointment._id,
    relatedModel: 'Appointment',
    link: `/patient/appointments/my-appointments`,
    priority: 'urgent',
    metadata: {
      doctorName,
      appointmentDate: date,
      cancelReason: reason,
    }
  });

  this.notificationGateway.sendNotification(patientId, notification);
}
```

---

## 🎨 Frontend Architecture

### 1. Notification Context (`NotificationContext.tsx`)

```typescript
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useGlobalSocket();

  // Listen to real-time notifications
  useEffect(() => {
    if (!socket) return;

    socket.on("notification:new", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      // Show toast
      toast.info(notification.title);
    });

    return () => {
      socket.off("notification:new");
    };
  }, [socket]);

  // ... implement methods

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
```

### 2. Notification Button Component

Cập nhật trong `Header.tsx`:

```tsx
// Replace the static bell button
<NotificationButton />
```

### 3. NotificationButton Component (`NotificationButton.tsx`)

```tsx
export default function NotificationButton() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          onClose={() => setOpen(false)}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      )}
    </div>
  );
}
```

### 4. NotificationDropdown Component

```tsx
export default function NotificationDropdown({ notifications, onClose, onMarkAsRead, onMarkAllAsRead }) {
  const router = useRouter();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    onClose();
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900">Thông báo</h3>
        <button onClick={onMarkAllAsRead} className="text-sm text-primary hover:underline">
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Không có thông báo mới</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t text-center">
        <Link href="/notifications" className="text-sm text-primary hover:underline">
          Xem tất cả thông báo
        </Link>
      </div>
    </div>
  );
}
```

### 5. NotificationItem Component

```tsx
function NotificationItem({ notification, onClick }) {
  const getIcon = () => {
    switch (notification.type) {
      case "appointment":
        return <Calendar className="w-5 h-5" />;
      case "message":
        return <MessageSquare className="w-5 h-5" />;
      case "treatment":
        return <FileText className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case "urgent":
        return "text-red-600 bg-red-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-primary bg-blue-50";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.isRead ? "bg-blue-50/50" : ""
      }`}
    >
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getPriorityColor()}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-medium text-sm ${!notification.isRead ? "text-gray-900" : "text-gray-600"}`}>
              {notification.title}
            </h4>
            {!notification.isRead && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></span>}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔄 Flow Hoạt Động

### Kịch Bản: Bệnh Nhân Đặt Lịch Mới

```
1. Patient tạo appointment qua frontend
   ↓
2. Backend: appointments.service.create()
   ↓
3. Save appointment vào DB
   ↓
4. notifications.service.create() - Tạo notification cho doctor
   ↓
5. Save notification vào DB
   ↓
6. notificationGateway.sendNotification() - Gửi qua Socket
   ↓
7. Doctor's browser nhận notification qua socket
   ↓
8. Frontend: NotificationContext cập nhật state
   ↓
9. UI: Badge số lượng thông báo tăng lên
   ↓
10. Toast notification hiện ra
    ↓
11. Doctor click vào notification
    ↓
12. Navigate đến /doctor/schedule
    ↓
13. API call markAsRead
```

---

## 📱 Responsive & UX

### Desktop

- Dropdown từ bell icon
- Width 384px (w-96)
- Max height 384px với scroll

### Mobile

- Full screen modal/sheet
- Swipe to dismiss
- Pull to refresh

### Features

- ✅ Real-time updates
- ✅ Badge counter
- ✅ Toast notifications
- ✅ Sound (optional)
- ✅ Browser notifications (optional)
- ✅ Mark as read on click
- ✅ Relative time display
- ✅ Priority indicators
- ✅ Direct links to related pages

---

## 🚀 Implementation Steps

### Phase 1: Backend Foundation

1. ✅ Create Notification schema
2. ✅ Create NotificationService
3. ✅ Create NotificationGateway
4. ✅ Integrate với AppointmentService
5. ✅ Add API endpoints (REST)

### Phase 2: Frontend Core

1. ✅ Create NotificationContext
2. ✅ Create NotificationButton
3. ✅ Create NotificationDropdown
4. ✅ Integrate với GlobalSocketContext
5. ✅ Add to Header component

### Phase 3: Features

1. ✅ Mark as read functionality
2. ✅ Filter by type
3. ✅ Search notifications
4. ✅ Delete notifications
5. ✅ Notification settings page

### Phase 4: Advanced

1. ✅ Browser push notifications
2. ✅ Sound alerts
3. ✅ Email digest (daily summary)
4. ✅ SMS notifications (critical only)
5. ✅ Analytics & tracking

---

## 🎯 API Endpoints

```
GET    /api/notifications              - Get user's notifications
GET    /api/notifications/unread-count - Get unread count
GET    /api/notifications/:id          - Get single notification
PATCH  /api/notifications/:id/read     - Mark as read
PATCH  /api/notifications/read-all     - Mark all as read
DELETE /api/notifications/:id          - Delete notification
POST   /api/notifications/settings     - Update user notification settings
```

---

## 🧪 Testing

### Unit Tests

- NotificationService methods
- NotificationGateway events
- React components

### Integration Tests

- End-to-end notification flow
- Socket connection & events
- API endpoints

### E2E Tests

- User creates appointment → Doctor receives notification
- Doctor cancels → Patient receives notification
- Mark as read functionality

---

## 📈 Monitoring & Analytics

### Metrics to Track

- Average notification delivery time
- Notification open rate
- Most common notification types
- Peak notification times
- User engagement with notifications

### Alerts

- Socket connection failures
- Notification delivery failures
- High unread notification count (> 50)

---

## 🔒 Security & Privacy

- ✅ Only show user's own notifications
- ✅ Validate socket authentication
- ✅ Rate limiting on notification creation
- ✅ Sanitize notification content
- ✅ HTTPS for browser push notifications

---

## 📚 Dependencies

### Backend

```json
{
  "@nestjs/websockets": "^10.0.0",
  "socket.io": "^4.6.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1"
}
```

### Frontend

```json
{
  "socket.io-client": "^4.6.0",
  "date-fns": "^2.30.0",
  "react-hot-toast": "^2.4.1" (or sonner)
}
```

---

## 🎨 Design Tokens

```scss
// Colors
$notification-unread-bg: #eff6ff;
$notification-urgent: #ef4444;
$notification-high: #f59e0b;
$notification-normal: #00a6f4;
$notification-low: #6b7280;

// Timing
$notification-toast-duration: 4000ms;
$notification-fade-in: 200ms;
$notification-slide-in: 300ms;
```

---

## 📝 Notes

- Sử dụng GlobalSocketContext đã có sẵn
- Tích hợp với AppointmentGateway hiện tại
- Giữ tương thích với notification hiện tại
- Cleanup notifications cũ sau 30 ngày
- Cache unread count ở Redis cho performance

---

**Last Updated**: January 2025
**Status**: Planning Phase
**Next Step**: Create Notification Schema & Service
