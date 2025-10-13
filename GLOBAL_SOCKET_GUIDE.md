# Global Socket Integration Guide

## 📌 Tổng quan

Thay vì tạo nhiều socket connections riêng lẻ cho từng feature, hệ thống giờ sử dụng **GlobalSocketProvider** để:

- ✅ **Kết nối 1 lần duy nhất** khi user login
- ✅ **Toast notifications hoạt động ở mọi trang** (không cần phải vào trang Appointments)
- ✅ **Tự động cập nhật data** khi có sự kiện mới
- ✅ **Dễ mở rộng** cho các features khác (notifications, live updates, v.v.)

---

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────┐
│           ClientProviders (Root)                │
│  ┌───────────────────────────────────────────┐  │
│  │      GlobalSocketProvider                 │  │
│  │  • Connect khi user login                 │  │
│  │  • Toast notifications (global)           │  │
│  │  • Quản lý callbacks từ các pages         │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────┐      ┌──────────────┐         │
│  │ Doctor Pages │      │ Patient Pages│         │
│  │  • Schedule  │      │  • Booking   │         │
│  │  • Dashboard │      │  • MyAppts   │         │
│  └──────────────┘      └──────────────┘         │
│         ↓                      ↓                 │
│    registerCallback()    registerCallback()     │
│         ↓                      ↓                 │
│  ┌─────────────────────────────────────┐        │
│  │  Socket Events (appointment:*)      │        │
│  │  → Trigger all registered callbacks │        │
│  └─────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

---

## 📂 Files Structure

### 1. **GlobalSocketContext.tsx** (NEW)

```tsx
/client/crs / contexts / GlobalSocketContext.tsx;
```

**Chức năng:**

- Tạo single socket connection khi user authenticated
- Lắng nghe tất cả appointment events
- Hiển thị toast notifications (global, ở mọi trang)
- Quản lý callbacks để trigger refresh data ở các pages cụ thể

**Events được lắng nghe:**

- `appointment:new` → Bác sĩ nhận lịch hẹn mới
- `appointment:confirmed` → Bệnh nhân nhận xác nhận
- `appointment:cancelled` → Cả 2 nhận thông báo hủy
- `appointment:rescheduled` → Cả 2 nhận thông báo đổi giờ
- `appointment:completed` → Bệnh nhân nhận thông báo hoàn tất

### 2. **ClientProviders.tsx** (UPDATED)

```tsx
/client/crs / components / providers / ClientProviders.tsx;
```

**Thay đổi:**

- Thêm `GlobalSocketProvider` bọc toàn bộ app
- Socket connect ngay sau khi user login (trong SessionProvider)

### 3. **Doctor Schedule Page** (UPDATED)

```tsx
/client/crs / app / doctor / schedule / page.tsx;
```

**Thay đổi:**

- ❌ Xóa: `AppointmentSocketProvider` wrapper
- ❌ Xóa: `useAppointmentSocket` hook
- ✅ Thêm: `useGlobalSocket` hook
- ✅ Thêm: `registerAppointmentCallback(fetchAppointments)`

**Cách hoạt động:**

```typescript
const { registerAppointmentCallback, unregisterAppointmentCallback } = useGlobalSocket();

// Register callback to refresh appointments when socket events occur
useEffect(() => {
  registerAppointmentCallback(fetchAppointments);
  return () => unregisterAppointmentCallback();
}, [registerAppointmentCallback, unregisterAppointmentCallback, fetchAppointments]);
```

### 4. **Patient My Appointments Page** (UPDATED)

```tsx
/client/crs / app / patient / appointments / my - appointments / page.tsx;
```

**Tương tự Doctor Schedule:**

- ✅ Dùng `useGlobalSocket` thay vì `useAppointmentSocket`
- ✅ Register callback để auto-refresh khi có events

---

## 🔄 Luồng hoạt động chi tiết

### **Scenario 1: Bệnh nhân đặt lịch hẹn mới**

```
1. Patient: Đặt lịch (/patient/appointments) → API createAppointment()
   ↓
2. Backend: Lưu appointment vào DB + Emit socket event
   {
     event: "appointment:new",
     data: { appointment, message }
   }
   ↓
3. GlobalSocketProvider: Nhận event
   ↓
4. Actions:
   a) Show toast (nếu user là doctor):
      toast.success("Lịch hẹn mới", { description: "..." })

   b) Trigger callbacks:
      - Doctor Schedule page: fetchAppointments() → Calendar refresh
      - Doctor Dashboard: fetchStats() (nếu có register)
   ↓
5. Result:
   ✅ Doctor thấy toast notification ngay lập tức (dù đang ở trang nào)
   ✅ Nếu doctor đang xem calendar → Tự động refresh
```

### **Scenario 2: Bác sĩ xác nhận lịch hẹn**

```
1. Doctor: Click "Xác nhận" → API confirmAppointment()
   ↓
2. Backend: Cập nhật status + Emit socket event
   {
     event: "appointment:confirmed",
     data: { appointment, message }
   }
   ↓
3. GlobalSocketProvider: Nhận event
   ↓
4. Actions:
   a) Show toast (nếu user là patient):
      toast.success("Lịch hẹn đã được xác nhận", { description: "..." })

   b) Trigger callbacks:
      - Patient My Appointments: fetchAppointments() → List refresh
      - Doctor Schedule: fetchAppointments() → Calendar refresh (update color)
   ↓
5. Result:
   ✅ Patient thấy toast notification (dù đang ở trang nào)
   ✅ Cả 2 bên đều auto-refresh data nếu đang xem trang tương ứng
```

---

## 🎯 Ưu điểm so với cách cũ

### **Cách cũ (AppointmentSocketContext)**

```
❌ Mỗi page tạo socket connection riêng
❌ Chỉ nhận toast khi đang ở trong page có socket provider
❌ User phải vào trang Appointments thì mới thấy notification
❌ Khó maintain khi có nhiều features dùng socket
❌ Tốn tài nguyên (nhiều connections đồng thời)
```

### **Cách mới (GlobalSocketProvider)**

```
✅ 1 socket connection duy nhất cho toàn bộ app
✅ Toast notifications hoạt động ở mọi trang
✅ User thấy thông báo ngay lập tức, không cần vào trang cụ thể
✅ Dễ thêm features mới (chat, notifications, live updates, v.v.)
✅ Tiết kiệm tài nguyên, tối ưu performance
✅ Centralized logic, dễ maintain
```

---

## 🔌 Cách sử dụng trong pages mới

### **Step 1: Import hook**

```typescript
import { useGlobalSocket } from "@/contexts/GlobalSocketContext";
```

### **Step 2: Get socket instance và callbacks**

```typescript
function MyComponent() {
  const { socket, isConnected, registerAppointmentCallback, unregisterAppointmentCallback } = useGlobalSocket();

  // Your data fetching function
  const fetchData = async () => {
    // Fetch your data
  };

  // Register callback for auto-refresh
  useEffect(() => {
    registerAppointmentCallback(fetchData);
    return () => unregisterAppointmentCallback();
  }, [registerAppointmentCallback, unregisterAppointmentCallback, fetchData]);

  return (
    <div>
      {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
      {/* Your UI */}
    </div>
  );
}
```

### **Step 3: (Optional) Listen to custom events**

```typescript
useEffect(() => {
  if (!socket) return;

  socket.on("custom:event", (data) => {
    console.log("Custom event received:", data);
    // Handle your custom logic
  });

  return () => {
    socket.off("custom:event");
  };
}, [socket]);
```

---

## 🚀 Testing

### **Test 1: Toast notifications ở mọi trang**

1. Login bác sĩ → Đi đến trang bất kỳ (NOT schedule page)
2. Mở tab mới → Login bệnh nhân → Đặt lịch hẹn mới
3. **Expected**: Bác sĩ thấy toast "Lịch hẹn mới" ngay lập tức (dù không ở trang schedule)

### **Test 2: Auto-refresh khi ở đúng trang**

1. Login bác sĩ → Vào trang Schedule → Xem calendar
2. Mở tab mới → Login bệnh nhân → Đặt lịch hẹn mới
3. **Expected**:
   - Bác sĩ thấy toast
   - Calendar tự động refresh và hiện lịch hẹn mới (không cần reload)

### **Test 3: Bidirectional updates**

1. Doctor xác nhận lịch hẹn
2. **Expected**:
   - Patient thấy toast "Lịch hẹn đã được xác nhận"
   - Nếu patient đang xem My Appointments → Auto-refresh list

### **Test 4: Multiple users simultaneously**

1. 2 doctors, 3 patients cùng online
2. Patients đặt lịch với các doctors khác nhau
3. **Expected**:
   - Mỗi doctor chỉ nhận toast cho lịch hẹn của mình
   - Không có duplicate notifications
   - Performance ổn định

---

## 📝 Notes

### **Backend requirements**

Backend phải emit đúng events với format:

```typescript
// Example: appointment.service.ts
socket.to(doctorSocketId).emit("appointment:new", {
  type: "appointment:new",
  appointment: appointmentData,
  message: "Bạn có lịch hẹn mới từ bệnh nhân",
  timestamp: new Date(),
});
```

### **Future improvements**

- [ ] Thêm notification center (list all notifications)
- [ ] Thêm sound/vibration cho notifications
- [ ] Persist notifications vào localStorage
- [ ] Thêm badge count ở header/navbar
- [ ] Support push notifications (PWA)

### **Chat socket**

Hiện tại chat vẫn dùng socket riêng ở `/chat` namespace. Có thể merge vào GlobalSocket trong tương lai nếu cần, nhưng hiện tại giữ riêng cho đơn giản.

---

## 🐛 Troubleshooting

### **Issue: Toast không hiện**

```typescript
// Check connection status
const { isConnected } = useGlobalSocket();
console.log("Socket connected:", isConnected);

// Check browser console for socket logs
// Should see: "✅ Global socket connected: <socket-id>"
```

### **Issue: Data không auto-refresh**

```typescript
// Make sure callback is registered
useEffect(() => {
  console.log("Registering callback");
  registerAppointmentCallback(fetchData);
  return () => {
    console.log("Unregistering callback");
    unregisterAppointmentCallback();
  };
}, [registerAppointmentCallback, unregisterAppointmentCallback, fetchData]);

// Check if fetchData has stable reference (use useCallback)
const fetchData = useCallback(
  async () => {
    // Your logic
  },
  [
    /* dependencies */
  ]
);
```

### **Issue: Multiple toast duplicates**

```typescript
// GlobalSocketProvider prevents double connection with socketRef
// If still seeing duplicates, check:
// 1. React StrictMode is handled correctly
// 2. No manual socket connections in components
// 3. Backend only emits once per event
```

---

## 📚 Related Files

- `/client/src/contexts/GlobalSocketContext.tsx` - Main provider
- `/client/src/contexts/AppointmentSocketContext.tsx` - **DEPRECATED** (keep for reference only)
- `/client/src/components/providers/ClientProviders.tsx` - Root providers
- `/client/src/app/doctor/schedule/page.tsx` - Example usage (doctor)
- `/client/src/app/patient/appointments/my-appointments/page.tsx` - Example usage (patient)

---

**Last updated:** December 2024
**Version:** 1.0
**Status:** ✅ Production Ready
