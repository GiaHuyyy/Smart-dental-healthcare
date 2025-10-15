# Migration Guide: GlobalSocketContext → AppointmentContext

## Vấn đề
Sau khi refactor socket architecture, một số functions đã được di chuyển từ `GlobalSocketContext` sang `AppointmentContext`:

- ✅ `registerAppointmentCallback`
- ✅ `unregisterAppointmentCallback`

## Cách sửa lỗi

### Lỗi thường gặp:
```
TypeError: registerAppointmentCallback is not a function
```

### Old Code (❌ Sai):
```typescript
import { useGlobalSocket } from "@/contexts/GlobalSocketContext";

function MyComponent() {
  const { isConnected, registerAppointmentCallback, unregisterAppointmentCallback } = useGlobalSocket();
  
  useEffect(() => {
    registerAppointmentCallback(fetchData);
    return () => unregisterAppointmentCallback();
  }, [registerAppointmentCallback, unregisterAppointmentCallback]);
}
```

### New Code (✅ Đúng):
```typescript
import { useGlobalSocket } from "@/contexts/GlobalSocketContext";
import { useAppointment } from "@/contexts/AppointmentContext";

function MyComponent() {
  const { isConnected } = useGlobalSocket();
  const { registerAppointmentCallback, unregisterAppointmentCallback } = useAppointment();
  
  useEffect(() => {
    registerAppointmentCallback(fetchData);
    return () => unregisterAppointmentCallback();
  }, [registerAppointmentCallback, unregisterAppointmentCallback]);
}
```

## API Reference

### GlobalSocketContext (chỉ connection)
```typescript
interface GlobalSocketContextType {
  socket: Socket | null;      // ✅ Socket instance được share
  isConnected: boolean;        // ✅ Connection status
}
```

### AppointmentContext (appointment logic)
```typescript
interface AppointmentContextType {
  isConnected: boolean;                              // ✅ Connection status (từ GlobalSocket)
  notifications: AppointmentNotification[];          // ✅ Local appointment notifications
  clearNotifications: () => void;                    // ✅ Clear notifications array
  registerAppointmentCallback: (cb: () => void) => void;   // ✅ Register refresh callback
  unregisterAppointmentCallback: () => void;         // ✅ Unregister callback
}
```

## Files đã được sửa

✅ `client/src/app/doctor/schedule/page.tsx`
✅ `client/src/app/patient/appointments/my-appointments/page.tsx`

## Checklist để migrate file khác

Nếu file của bạn có lỗi `registerAppointmentCallback is not a function`:

1. [ ] Thêm import: `import { useAppointment } from "@/contexts/AppointmentContext"`
2. [ ] Tách hook: 
   - `const { isConnected } = useGlobalSocket()`
   - `const { registerAppointmentCallback, unregisterAppointmentCallback } = useAppointment()`
3. [ ] Kiểm tra không có lỗi TypeScript
4. [ ] Test callback có được gọi khi có appointment event

## Use Cases

### Use Case 1: Calendar/Schedule Pages
Cần auto-refresh khi có appointment event mới.

```typescript
const { registerAppointmentCallback, unregisterAppointmentCallback } = useAppointment();

useEffect(() => {
  registerAppointmentCallback(fetchAppointments);
  return () => unregisterAppointmentCallback();
}, [registerAppointmentCallback, unregisterAppointmentCallback]);
```

### Use Case 2: Appointment List Pages
Cần update danh sách khi có thay đổi.

```typescript
const { registerAppointmentCallback } = useAppointment();

useEffect(() => {
  registerAppointmentCallback(() => {
    console.log("Appointment updated, refreshing list...");
    fetchAppointmentList();
  });
}, [registerAppointmentCallback]);
```

### Use Case 3: Dashboard với Appointment Stats
Cần refresh statistics khi có appointment mới/cancel.

```typescript
const { registerAppointmentCallback } = useAppointment();

const refreshStats = useCallback(async () => {
  const stats = await appointmentService.getStats();
  setStats(stats);
}, []);

useEffect(() => {
  registerAppointmentCallback(refreshStats);
}, [registerAppointmentCallback, refreshStats]);
```

## Backward Compatibility

AppointmentContext exports cả 2 tên để tương thích ngược:

```typescript
// New name (khuyên dùng)
export { useAppointment };

// Old name (tương thích)
export { useAppointment as useAppointmentSocket };
```

Nếu muốn giữ nguyên code cũ, có thể dùng:
```typescript
import { useAppointmentSocket } from "@/contexts/AppointmentContext";
const { registerAppointmentCallback } = useAppointmentSocket();
```

## Notes

- ⚠️ **Không** import `registerAppointmentCallback` từ `GlobalSocketContext` nữa
- ✅ **Luôn** import từ `AppointmentContext` 
- 🔄 Mỗi page chỉ nên register **1 callback** (sẽ override callback cũ)
- 🧹 Luôn nhớ **unregister** trong cleanup function
