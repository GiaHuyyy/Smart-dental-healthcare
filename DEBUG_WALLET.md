# Debug Wallet Top-Up Flow

## Vấn đề
Thanh toán thành công nhưng số dư không cập nhật.

## Cách test

### Step 1: Check Console Logs
1. Mở Developer Console (F12)
2. Vào tab Console
3. Click "Nạp tiền" và điền số tiền
4. Click "Nạp tiền"
5. Thanh toán trên MoMo
6. Quay về trang wallet

Bạn sẽ thấy các log:
- 🔍 URL params: `{ status: 'success', orderId: '...' }`
- 📦 SessionStorage keys: `['momo_payment_WALLET_...']`
- ✅ Processing callback for orderId: `WALLET_...`
- 👤 User info: `{ userId: '...', hasAccessToken: true }`
- 💰 Payment info from storage
- 📞 Calling test-callback with: `{ userId, amount, orderId }`
- 📡 Response status: `200`
- 📦 Response data: `{ success: true }`

### Step 2: Check Backend Logs
Trong terminal backend, bạn sẽ thấy:
```
🔔 ========== WALLET MOMO CALLBACK RECEIVED ==========
📦 Full callback data: {...}
✅ Wallet top-up successful!
💾 Transaction created: ...
💰 Wallet balance updated: ...
```

### Step 3: Manual Test
Nếu auto không hoạt động, click button **"🧪 Test Callback"** để test thủ công.

## Common Issues

### Issue 1: No orderId in URL
- Problem: URL chỉ có `?status=success` không có `&orderId=...`
- Fix: Check `returnUrl` trong wallet.service.ts

### Issue 2: Payment info not in sessionStorage
- Problem: `sessionStorage.getItem('momo_payment_...')` return null
- Fix: Check khi nào sessionStorage được set

### Issue 3: Session expired
- Problem: userId hoặc accessToken null
- Fix: Đăng nhập lại

## Solution
Đã thêm extensive logging để debug. Check console để xem exact error.

