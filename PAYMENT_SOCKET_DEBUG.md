# Payment Socket Connection Debug Guide

**Date:** November 9, 2025
**Issue:** Payment socket không connect (không thấy `✅ Payment socket connected`)

---

## 🔍 Current Status

**Working:**

- ✅ Revenue socket (doctor) - connecting successfully
- ✅ Backend PaymentGateway đã setup
- ✅ Backend emit events đã có

**Not Working:**

- ❌ Payment socket (patient) - không connect được

---

## 🐛 Enhanced Debug Logs

Đã thêm detailed logging vào:

### 1. Frontend Hook (`usePaymentSocket.ts`)

**New logs sẽ show:**

```
⚠️ Payment socket: Not authenticated yet
🔍 Payment socket connection attempt: {userId, hasToken, tokenPreview}
🔌 Connecting to payment socket... {userId, backendUrl, namespace}
✅ Payment socket connected successfully
❌ Failed to connect payment socket: {error details}
```

### 2. Frontend Service (`realtimeBillingService.ts`)

**New logs sẽ show:**

```
[Payment Socket] Starting connection...
[Payment Socket] User ID: <userId>
[Payment Socket] Token: Bearer ey...
[Payment Socket] Backend URL: http://localhost:8081
[Payment Socket] Connecting to: http://localhost:8081/payments
[Payment Socket] Auth config: {hasToken: true, hasUserId: true}
✅ Payment socket connected successfully!
   - Socket ID: <socketId>
   - User ID: <userId>
```

**Error logs:**

```
❌ Payment socket connection error: <error>
Error details: {message, type, userId, url}
⚠️ Payment socket disconnected: <reason>
🔄 Payment socket reconnect attempt <number>
❌ Payment socket reconnection failed
```

---

## 🧪 Debug Steps

### Step 1: Check Console Logs

1. Open patient payment page: `/patient/payments`
2. Open browser console (F12)
3. Look for logs in order:

**Expected flow:**

```
🔍 Payment socket connection attempt: {...}
[Payment Socket] Starting connection...
[Payment Socket] User ID: 673e5...
[Payment Socket] Token: Bearer eyJhbG...
[Payment Socket] Backend URL: http://localhost:8081
[Payment Socket] Connecting to: http://localhost:8081/payments
✅ Payment socket connected successfully!
```

**If connection fails, you'll see:**

```
❌ Payment socket connection error: {...}
Error details: {message: "...", type: "...", userId: "...", url: "..."}
```

### Step 2: Common Issues & Solutions

#### Issue 1: No Logs at All

**Symptom:** Không thấy bất kỳ log nào về payment socket

**Possible causes:**

- Hook không được gọi
- Component chưa mount
- Session chưa load

**Debug:**

```javascript
// Check if hook is called
console.log("Payment page mounted");
const { isConnected } = usePaymentSocket();
console.log("Hook called, isConnected:", isConnected);
```

#### Issue 2: "Not authenticated yet"

**Symptom:** Thấy log `⚠️ Payment socket: Not authenticated yet`

**Possible causes:**

- Session chưa load xong
- User chưa login
- Session expired

**Solution:**

- Wait for session to load
- Check `session.user` có tồn tại không
- Re-login nếu cần

#### Issue 3: "No access token available"

**Symptom:** `❌ No access token available for payment socket`

**Possible causes:**

- Session không có `access_token` field
- Token format sai
- NextAuth callback không set token đúng

**Debug:**

```javascript
console.log("Session:", session);
console.log("Access token:", session?.access_token);
```

**Solution:**

- Check `auth.ts` callbacks
- Verify token được lưu vào session
- Check token expiry

#### Issue 4: Connection Error

**Symptom:** `❌ Payment socket connection error`

**Common errors:**

**A. CORS Error**

```
Error: Cross-Origin Request Blocked
```

**Solution:** Check backend CORS settings

```typescript
// server/src/modules/payments/payment.gateway.ts
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',  // ← Must include frontend URL
      'http://localhost:8082',
    ],
    credentials: true,
  },
  namespace: '/payments',
})
```

**B. Backend Not Running**

```
Error: connect ECONNREFUSED
```

**Solution:**

- Start backend server: `cd server && npm run dev`
- Check port 8081 is accessible

**C. Wrong URL**

```
Error: Invalid URL
```

**Solution:**

- Check `.env`: `NEXT_PUBLIC_BACKEND_URL=http://localhost:8081`
- Restart frontend after changing .env

**D. Auth Error**

```
Error: Unauthorized / Invalid token
```

**Solution:**

- Check token format (must have "Bearer " prefix)
- Verify backend JWT validation
- Check token hasn't expired

### Step 3: Compare with Revenue Socket

Revenue socket (doctor) đã hoạt động. So sánh:

**Revenue socket:**

```typescript
// Hook
const token = (session as { access_token?: string }).access_token;
realtimeBillingService.connectRevenueSocket(token, doctorId);

// Backend
client.handshake.auth?.doctorId
client.join(`doctor_${doctorId}`);
this.server.to(`doctor_${doctorId}`).emit('revenue:new', {...});
```

**Payment socket (should be similar):**

```typescript
// Hook
const token = (session as { access_token?: string }).access_token;
realtimeBillingService.connectPaymentSocket(token, userId);

// Backend
client.handshake.auth?.userId
client.join(`user_${userId}`);
this.server.to(`user_${userId}`).emit('payment:new', {...});
```

---

## 🔧 Backend Verification

### Check PaymentGateway Logs

When patient connects, backend should show:

```
✅ PaymentGateway WebSocket server initialized
   - Namespace: /payments
User <userId> connected to payment updates (socket: <socketId>)
```

**If NOT showing:**

- PaymentGateway might not be initialized
- Check `payments.module.ts` exports PaymentGateway
- Check main.ts includes all modules

### Check Event Emission

When doctor cancels appointment:

```
🗑️ Deleted X pending consultation_fee payment bills
✅ Consultation fee payment delete event emitted to patient <patientId>
```

**If NOT showing:**

- Events không được emit
- Check `billing-helper.service.ts` có gọi `paymentGateway.emitPaymentDelete()`

---

## 📋 Checklist

Run through this checklist:

- [ ] Frontend runs on port 3000
- [ ] Backend runs on port 8081
- [ ] `.env` has `NEXT_PUBLIC_BACKEND_URL=http://localhost:8081`
- [ ] User is logged in (session exists)
- [ ] Session has `access_token` field
- [ ] Session has `user._id` field
- [ ] Browser console shows payment socket logs
- [ ] Backend shows payment socket connection logs
- [ ] No CORS errors in console
- [ ] No 401/403 errors in Network tab

---

## 🚀 Test Flow

1. **Login as Patient**
2. **Go to `/patient/payments`**
3. **Check Console** - Should see:

   ```
   🔍 Payment socket connection attempt
   [Payment Socket] Starting connection...
   ✅ Payment socket connected successfully!
   ```

4. **As Doctor, cancel an appointment** (with patient_late reason)

5. **Check Patient Console** - Should see:

   ```
   [Payment Socket] Event received: payment:delete
   🔔 Payment deleted: <paymentId>
   ```

6. **Check Patient Page** - Payment should disappear (auto-reload)

---

## 📁 Files Modified

1. ✅ `client/src/hooks/usePaymentSocket.ts` - Added detailed logging
2. ✅ `client/src/services/realtimeBillingService.ts` - Added connection debugging

---

## 🆘 Next Steps

**If still not working after adding logs:**

1. **Copy ALL console logs** (từ khi load page đến khi lỗi)
2. **Copy backend server logs** (tìm lines có "Payment" hoặc "socket")
3. **Screenshot Network tab** - Filter: WS hoặc websocket
4. **Check:**
   - Session object: `console.log(session)`
   - Socket instance: `console.log(realtimeBillingService.paymentSocket)`
   - Backend running: Visit `http://localhost:8081/api/v1/health`

Send all above information để tôi có thể debug chính xác hơn.
