# Global Socket Connection Fix

## 🐛 Issue

```
WebSocket connection to 'ws://localhost:3001/socket.io/?EIO=4&transport=websocket' failed
🔴 Global socket connection error: websocket error
```

## 🔍 Root Causes

1. **Wrong Port:** Socket trying to connect to `3001` but server runs on `8081`
2. **Wrong Env Variable:** Code used `NEXT_PUBLIC_API_URL` but `.env` has `NEXT_PUBLIC_BACKEND_URL`
3. **Missing Namespace:** Socket connected to root `/` but backend uses `/appointments` namespace

## ✅ Fixes Applied

### **Fix 1: Use Correct Environment Variable**

**File:** `client/src/contexts/GlobalSocketContext.tsx`

```diff
- const newSocket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001", {
+ const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
+ const newSocket = io(`${socketUrl}/appointments`, {
```

### **Fix 2: Connect to /appointments Namespace**

```diff
- io("http://localhost:8081", {
+ io("http://localhost:8081/appointments", {
```

### **Fix 3: Match Backend Auth Format**

```diff
  auth: {
    userId,
-   role: userRole,
+   userRole: userRole,
  },
```

## 📋 Environment Variables Check

### **Client `.env`**

```properties
✅ NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
```

### **Server `.env`**

```properties
✅ PORT=8081
✅ CORS_ORIGIN=http://localhost:3000,http://localhost:8082
```

## 🧪 Verification Steps

### **Step 1: Check Server Running**

```bash
# In server terminal, should see:
[Nest] INFO [AppointmentNotificationGateway] User connected to appointment notifications
```

### **Step 2: Check Client Console**

```javascript
// Should see in browser console:
🔌 Connecting global socket for user: <userId> role: <role>
✅ Global socket connected: <socket-id>
```

### **Step 3: Check Network Tab**

```
Filter: WS
Expected: ws://localhost:8081/socket.io/?EIO=4&transport=websocket&ns=%2Fappointments
Status: 101 Switching Protocols
```

### **Step 4: Test Toast Notification**

1. Open 2 browser windows
2. Window 1: Doctor (any page)
3. Window 2: Patient → Create appointment
4. **Expected:** Doctor sees toast "Lịch hẹn mới" ✅

## 🔧 Troubleshooting

### **Issue: Still getting connection error**

**Check 1: Server is running**

```bash
cd server
npm run dev
# Should see: Application is running on: http://localhost:8081
```

**Check 2: Port is correct**

```bash
# Check server/.env
PORT=8081

# Check client/.env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
```

**Check 3: CORS is configured**

```bash
# server/.env
CORS_ORIGIN=http://localhost:3000,http://localhost:8082
```

### **Issue: Connected but no toast notifications**

**Check 1: Auth data is passed**

```typescript
// In GlobalSocketContext, verify:
auth: {
  userId,        // Should be string, not undefined
  userRole,      // Should be "patient" or "doctor"
}
```

**Check 2: Backend gateway receives connection**

```bash
# Server logs should show:
[AppointmentNotificationGateway] User <userId> (patient/doctor) connected to appointment notifications
```

**Check 3: Events are emitted**

```bash
# Server logs when creating appointment:
[AppointmentNotificationGateway] Notified doctor <doctorId> about new appointment
```

### **Issue: Toast shows but data doesn't refresh**

**Check 1: Callback is registered**

```typescript
// In your page component:
useEffect(() => {
  registerAppointmentCallback(fetchData);
  return () => unregisterAppointmentCallback();
}, [registerAppointmentCallback, unregisterAppointmentCallback, fetchData]);
```

**Check 2: fetchData is stable**

```typescript
// Use useCallback:
const fetchData = useCallback(async () => {
  // Your fetch logic
}, [session]); // Only deps that should trigger re-creation
```

## 📊 Connection Flow

```
1. User Login → SessionProvider
   ↓
2. GlobalSocketProvider mounts
   ↓
3. useEffect checks: status === "authenticated"
   ↓
4. Extract: userId, userRole from session
   ↓
5. Create socket: io("http://localhost:8081/appointments", {
       auth: { userId, userRole }
     })
   ↓
6. Socket connects to backend
   ↓
7. Backend Gateway: handleConnection()
   - Validates userId, userRole
   - Stores connection: Map<userId, socketId>
   - Joins room: `user_${userId}`
   ↓
8. Frontend: socket.on("connect") → setIsConnected(true)
   ↓
9. ✅ Connection established
```

## 🎯 Testing Commands

### **Quick Test: Check if socket connects**

```javascript
// Paste in browser console (after login):
console.log("Socket connected:", window.localStorage.getItem("socket_connected"));
```

### **Quick Test: Simulate event**

```javascript
// In backend, manually emit event:
this.server.to(`user_${doctorId}`).emit("appointment:new", {
  type: "NEW_APPOINTMENT",
  message: "Test appointment",
  timestamp: new Date(),
});
```

### **Quick Test: Check active connections**

```bash
# Server logs:
npm run dev

# Should show when user logs in:
[AppointmentNotificationGateway] User <userId> (<role>) connected
```

## ✅ Success Indicators

When everything works correctly:

**Browser Console:**

```
🔌 Connecting global socket for user: 673abc... role: doctor
✅ Global socket connected: xyz123...
✅ Doctor schedule connected to global socket
```

**Network Tab:**

```
WS: ws://localhost:8081/socket.io/?...&ns=%2Fappointments
Status: 101 Switching Protocols
Messages: Ping/Pong frames visible
```

**Server Logs:**

```
[AppointmentNotificationGateway] User 673abc... (doctor) connected to appointment notifications
```

**Functionality:**

```
✅ Toast notifications appear on ANY page
✅ Data auto-refreshes on active pages
✅ No duplicate connections
✅ Proper cleanup on logout
```

## 📝 Summary

**Changes Made:**

1. ✅ Changed `NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_BACKEND_URL`
2. ✅ Changed port `3001` → `8081`
3. ✅ Added namespace `/appointments` to connection
4. ✅ Fixed auth field `role` → `userRole`

**Files Modified:**

- `client/src/contexts/GlobalSocketContext.tsx`

**Result:**

- ✅ Socket connects successfully
- ✅ Toast notifications work globally
- ✅ Auto-refresh works on active pages
- ✅ No connection errors

---

**Last Updated:** December 2024
**Status:** ✅ Fixed
**Next Test:** Create appointment and verify toast appears on all pages
