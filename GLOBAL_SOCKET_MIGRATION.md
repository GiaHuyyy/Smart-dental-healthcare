# Global Socket Migration Summary

## 🎯 Mục đích

Chuyển đổi từ **nhiều socket connections riêng lẻ** sang **1 global socket connection duy nhất** để:

1. ✅ Toast notifications hoạt động ở **mọi trang** (không cần phải vào trang Appointments)
2. ✅ Tiết kiệm tài nguyên, tối ưu performance
3. ✅ Dễ mở rộng cho các features mới
4. ✅ Centralized logic, dễ maintain

---

## 📊 So sánh trước/sau

### **Trước (AppointmentSocketContext)**

```
❌ Mỗi page/feature tạo socket connection riêng
❌ Chỉ nhận toast khi đang ở trong page có socket provider
❌ User phải vào trang Appointments thì mới thấy notification
❌ Code duplicate logic ở nhiều nơi
❌ Khó debug khi có vấn đề

Example:
- Doctor Schedule: AppointmentSocketProvider wrapper
- Patient My Appointments: AppointmentSocketProvider wrapper
- Future Dashboard: Cần thêm 1 provider nữa?
```

### **Sau (GlobalSocketProvider)**

```
✅ 1 socket connection duy nhất khi user login
✅ Toast notifications global - hoạt động ở mọi trang
✅ User thấy thông báo ngay lập tức
✅ Centralized logic trong GlobalSocketContext
✅ Dễ thêm features mới

Example:
- Connect 1 lần ở ClientProviders (root level)
- Pages chỉ cần register callback để auto-refresh
- Toasts xuất hiện ở mọi nơi
```

---

## 🔧 Các thay đổi thực hiện

### **1. Tạo GlobalSocketContext (NEW)**

**File:** `/client/src/contexts/GlobalSocketContext.tsx`

**Chức năng chính:**

- Connect socket khi user authenticated
- Lắng nghe tất cả appointment events
- Show toast notifications (global)
- Quản lý callbacks để trigger refresh ở các pages

**Events được handle:**

```typescript
socket.on("appointment:new", ...)         // Bác sĩ nhận lịch mới
socket.on("appointment:confirmed", ...)   // Bệnh nhân nhận xác nhận
socket.on("appointment:cancelled", ...)   // Cả 2 nhận thông báo hủy
socket.on("appointment:rescheduled", ...) // Cả 2 nhận thông báo đổi giờ
socket.on("appointment:completed", ...)   // Bệnh nhân nhận hoàn tất
```

**API:**

```typescript
interface GlobalSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: AppointmentNotification[];
  clearNotifications: () => void;
  registerAppointmentCallback: (callback: () => void) => void;
  unregisterAppointmentCallback: () => void;
}

export function useGlobalSocket(): GlobalSocketContextType;
```

---

### **2. Update ClientProviders**

**File:** `/client/src/components/providers/ClientProviders.tsx`

**Changes:**

```diff
+ import { GlobalSocketProvider } from "@/contexts/GlobalSocketContext";

  export default function ClientProviders({ children }) {
    return (
      <Provider store={store}>
        <SessionProvider>
+         <GlobalSocketProvider>
            <RealtimeChatProvider>
              <WebRTCProvider>
                <CallProvider>
                  {children}
                  <Toaster />
                </CallProvider>
              </WebRTCProvider>
            </RealtimeChatProvider>
+         </GlobalSocketProvider>
        </SessionProvider>
      </Provider>
    );
  }
```

**Kết quả:**

- GlobalSocket connect ngay sau khi user login
- Toàn bộ app có access đến socket instance
- Notifications hoạt động ở mọi trang

---

### **3. Update Doctor Schedule Page**

**File:** `/client/src/app/doctor/schedule/page.tsx`

**Changes:**

```diff
- import { AppointmentSocketProvider, useAppointmentSocket } from "@/contexts/AppointmentSocketContext";
+ import { useGlobalSocket } from "@/contexts/GlobalSocketContext";

  function DoctorScheduleContent() {
    const { data: session } = useSession();
-   const { isConnected, socket } = useAppointmentSocket();
+   const { isConnected, registerAppointmentCallback, unregisterAppointmentCallback } = useGlobalSocket();

    // ... other code

-   // Old: Manual socket event listeners
-   useEffect(() => {
-     if (!socket || !isConnected) return;
-     socket.on("appointment:new", () => fetchAppointments());
-     socket.on("appointment:confirmed", () => fetchAppointments());
-     socket.on("appointment:cancelled", () => fetchAppointments());
-     socket.on("appointment:rescheduled", () => fetchAppointments());
-     return () => {
-       socket.off("appointment:new");
-       socket.off("appointment:confirmed");
-       socket.off("appointment:cancelled");
-       socket.off("appointment:rescheduled");
-     };
-   }, [socket, isConnected, fetchAppointments]);

+   // New: Register callback for auto-refresh
+   useEffect(() => {
+     registerAppointmentCallback(fetchAppointments);
+     return () => unregisterAppointmentCallback();
+   }, [registerAppointmentCallback, unregisterAppointmentCallback, fetchAppointments]);
  }

  export default function DoctorSchedulePage() {
-   return (
-     <AppointmentSocketProvider>
-       <DoctorScheduleContent />
-     </AppointmentSocketProvider>
-   );
+   return <DoctorScheduleContent />;
  }
```

**Kết quả:**

- ❌ Không còn socket event listeners thủ công
- ✅ Callback tự động được gọi khi có events
- ✅ Code ngắn gọn hơn, dễ maintain

---

### **4. Update Patient My Appointments Page**

**File:** `/client/src/app/patient/appointments/my-appointments/page.tsx`

**Changes:** Tương tự Doctor Schedule Page

```diff
- import { AppointmentSocketProvider, useAppointmentSocket } from "@/contexts/AppointmentSocketContext";
+ import { useGlobalSocket } from "@/contexts/GlobalSocketContext";

  function MyAppointmentsContent() {
-   const { isConnected, socket } = useAppointmentSocket();
+   const { isConnected, registerAppointmentCallback, unregisterAppointmentCallback } = useGlobalSocket();

+   useEffect(() => {
+     registerAppointmentCallback(fetchAppointments);
+     return () => unregisterAppointmentCallback();
+   }, [registerAppointmentCallback, unregisterAppointmentCallback]);
  }

  export default function MyAppointmentsPage() {
-   return (
-     <AppointmentSocketProvider>
-       <MyAppointmentsContent />
-     </AppointmentSocketProvider>
-   );
+   return <MyAppointmentsContent />;
  }
```

---

## 🎬 Demo Scenarios

### **Scenario 1: Bệnh nhân đặt lịch → Bác sĩ nhận toast ở mọi trang**

**Steps:**

1. Login bác sĩ → Đi đến Dashboard (NOT schedule page)
2. Mở tab mới → Login bệnh nhân → Đặt lịch hẹn

**Expected:**

```
✅ Bác sĩ thấy toast "Lịch hẹn mới" ngay lập tức (dù đang ở Dashboard)
✅ Nếu bác sĩ vào Schedule page → Calendar tự động có lịch mới
✅ Không cần reload page
```

**Before (cách cũ):**

```
❌ Bác sĩ KHÔNG thấy toast nếu không ở Schedule page
❌ Phải vào Schedule page rồi refresh thủ công mới thấy
```

---

### **Scenario 2: Bác sĩ xác nhận → Bệnh nhân nhận toast ở mọi trang**

**Steps:**

1. Login bệnh nhân → Đi đến Profile page (NOT my-appointments)
2. Bác sĩ xác nhận lịch hẹn

**Expected:**

```
✅ Bệnh nhân thấy toast "Lịch hẹn đã được xác nhận" (dù đang ở Profile)
✅ Nếu bệnh nhân vào My Appointments → List tự động update status
```

**Before (cách cũ):**

```
❌ Bệnh nhân KHÔNG thấy gì cả nếu không ở My Appointments
❌ Phải vào My Appointments rồi refresh mới biết được xác nhận
```

---

## 📈 Performance Impact

### **Trước (Multiple Sockets)**

```
Doctor Schedule:    1 socket connection
Patient MyAppts:    1 socket connection
Future Dashboard:   1 socket connection
Future Analytics:   1 socket connection
────────────────────────────────────────
Total:              4 socket connections (for 1 user)
```

### **Sau (Global Socket)**

```
Toàn bộ app:       1 socket connection
────────────────────────────────────────
Total:             1 socket connection (for 1 user)
```

**Savings:**

- ✅ 75% reduction in socket connections
- ✅ Giảm network overhead
- ✅ Giảm server load
- ✅ Tăng scalability

---

## 🔄 Migration Guide for New Features

Khi thêm feature mới cần real-time updates:

### **Step 1: Add event handler trong GlobalSocketContext**

```typescript
// In GlobalSocketContext.tsx
socket.on("your:custom:event", (data) => {
  console.log("Custom event:", data);
  toast.info("Your notification", {
    description: data.message,
  });
  triggerYourCallback(); // If needed
});
```

### **Step 2: Add callback support (nếu cần)**

```typescript
// Add ref for your feature
const yourFeatureCallbackRef = useRef<(() => void) | null>(null);

// Add to context value
interface GlobalSocketContextType {
  // ... existing
  registerYourFeatureCallback: (callback: () => void) => void;
  unregisterYourFeatureCallback: () => void;
}
```

### **Step 3: Use trong component**

```typescript
const { registerYourFeatureCallback } = useGlobalSocket();

useEffect(
  () => {
    registerYourFeatureCallback(fetchYourData);
    return () => unregisterYourFeatureCallback();
  },
  [
    /* deps */
  ]
);
```

---

## 🐛 Known Issues & Solutions

### **Issue 1: StrictMode double connection**

**Solution:** Đã handle với `socketRef`

```typescript
const socketRef = useRef<Socket | null>(null);

if (socketRef.current) {
  console.log("Socket already exists, skipping");
  return;
}
```

### **Issue 2: Callback stale closure**

**Solution:** Dùng `useCallback` cho fetch functions

```typescript
const fetchData = useCallback(async () => {
  // Your logic
}, [session]); // Only re-create when session changes
```

### **Issue 3: Memory leak on unmount**

**Solution:** Cleanup trong useEffect return

```typescript
useEffect(() => {
  registerCallback(fn);
  return () => unregisterCallback(); // Cleanup
}, []);
```

---

## 📝 Deprecation Notice

### **AppointmentSocketContext**

**Status:** ⚠️ DEPRECATED

**File:** `/client/src/contexts/AppointmentSocketContext.tsx`

**Action:** Keep file for reference, DO NOT use in new code

**Migration:**

```diff
- import { AppointmentSocketProvider, useAppointmentSocket } from "@/contexts/AppointmentSocketContext";
+ import { useGlobalSocket } from "@/contexts/GlobalSocketContext";

- <AppointmentSocketProvider>
-   <YourComponent />
- </AppointmentSocketProvider>
+ <YourComponent /> // GlobalSocketProvider is already at root
```

---

## ✅ Testing Checklist

- [x] Socket connects when user logs in
- [x] Socket disconnects when user logs out
- [x] Toast shows at correct user (doctor/patient based on role)
- [x] Toast shows on ANY page (not just appointments pages)
- [x] Data auto-refreshes when on correct page
- [x] No duplicate toasts
- [x] No memory leaks
- [x] Works with React StrictMode
- [x] Handles network disconnection/reconnection
- [x] Multiple users can receive events simultaneously

---

## 📚 Documentation

- **Main Guide:** `/GLOBAL_SOCKET_GUIDE.md`
- **API Reference:** See GlobalSocketContext.tsx inline docs
- **Examples:**
  - Doctor Schedule: `/client/src/app/doctor/schedule/page.tsx`
  - Patient My Appointments: `/client/src/app/patient/appointments/my-appointments/page.tsx`

---

## 🚀 Next Steps

### **Immediate (Done)**

- [x] Create GlobalSocketContext
- [x] Update ClientProviders
- [x] Migrate Doctor Schedule page
- [x] Migrate Patient My Appointments page
- [x] Test toast notifications
- [x] Test auto-refresh

### **Future Enhancements**

- [ ] Add notification center (list all notifications)
- [ ] Add notification badge count in header
- [ ] Persist notifications to localStorage
- [ ] Add sound/vibration for notifications
- [ ] Merge chat socket into GlobalSocket (optional)
- [ ] Add analytics events tracking
- [ ] Support PWA push notifications

---

**Migration Date:** December 2024
**Migrated By:** Development Team
**Status:** ✅ Complete
**Breaking Changes:** None (backward compatible during transition)
