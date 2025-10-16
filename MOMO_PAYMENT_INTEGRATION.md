# 💳 MoMo Payment Integration Guide

## 📋 Tổng quan

Hệ thống Smart Dental Healthcare đã tích hợp thanh toán MoMo để cho phép bệnh nhân thanh toán phí khám trực tuyến một cách tiện lợi và an toàn.

### Tính năng chính:
- ✅ Tạo payment link MoMo cho appointment
- ✅ Redirect đến MoMo app/web để thanh toán
- ✅ Nhận callback (IPN) từ MoMo
- ✅ Verify signature để đảm bảo tính bảo mật
- ✅ Query payment status
- ✅ Payment result page với UI thân thiện
- ✅ Lưu trữ payment history

---

## 🏗️ Kiến trúc

### Flow Diagram:

```
Patient                    Frontend                Backend                 MoMo
   │                          │                       │                      │
   │ 1. Đặt lịch thành công   │                       │                      │
   ├─────────────────────────>│                       │                      │
   │                          │                       │                      │
   │ 2. Click "Thanh toán MoMo"│                      │                      │
   ├─────────────────────────>│                       │                      │
   │                          │ 3. POST /momo/create  │                      │
   │                          ├──────────────────────>│                      │
   │                          │                       │ 4. Create payment    │
   │                          │                       ├─────────────────────>│
   │                          │                       │ 5. Return payUrl     │
   │                          │                       │<─────────────────────┤
   │                          │ 6. Return payUrl      │                      │
   │                          │<──────────────────────┤                      │
   │ 7. Redirect to payUrl    │                       │                      │
   │<─────────────────────────┤                       │                      │
   │                          │                       │                      │
   │ 8. Pay on MoMo           │                       │                      │
   ├──────────────────────────────────────────────────────────────────────>│
   │                          │                       │ 9. IPN callback      │
   │                          │                       │<─────────────────────┤
   │                          │                       │ 10. Update payment   │
   │                          │                       │ 11. Return 200 OK    │
   │                          │                       ├─────────────────────>│
   │ 12. Redirect to result   │                       │                      │
   │<─────────────────────────────────────────────────────────────────────┤
   │                          │                       │                      │
```

---

## 🔧 Backend Implementation

### 1. MoMo Service

**File**: `server/src/modules/payments/services/momo.service.ts`

#### Các method chính:

```typescript
class MoMoService {
  // Tạo payment request
  async createPayment(request: MoMoPaymentRequest): Promise<MoMoPaymentResponse>
  
  // Verify callback signature
  verifyCallbackSignature(callbackData: MoMoCallbackData): boolean
  
  // Query transaction status
  async queryTransaction(orderId: string, requestId: string): Promise<any>
}
```

#### Signature Generation:

```typescript
const rawSignature = 
  `accessKey=${accessKey}` +
  `&amount=${amount}` +
  `&extraData=${extraData}` +
  `&ipnUrl=${ipnUrl}` +
  `&orderId=${orderId}` +
  `&orderInfo=${orderInfo}` +
  `&partnerCode=${partnerCode}` +
  `&redirectUrl=${redirectUrl}` +
  `&requestId=${requestId}` +
  `&requestType=captureWallet`;

const signature = crypto
  .createHmac('sha256', secretKey)
  .update(rawSignature)
  .digest('hex');
```

### 2. Payment Service

**File**: `server/src/modules/payments/payments.service.ts`

#### Create MoMo Payment:

```typescript
async createMomoPayment(payload: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  orderInfo: string;
}) {
  // 1. Generate unique orderId
  const orderId = `APT_${appointmentId}_${Date.now()}`;
  
  // 2. Save payment record (status = pending)
  const payment = await this.paymentModel.create({...});
  
  // 3. Create MoMo payment request
  const momoResponse = await this.momoService.createPayment({
    orderId,
    amount,
    orderInfo,
    returnUrl: `${frontendUrl}/patient/appointments/payment-result`,
    notifyUrl: `${backendUrl}/api/v1/payments/momo/callback`,
    extraData: JSON.stringify({ paymentId, appointmentId })
  });
  
  // 4. Return payUrl to frontend
  return { payUrl: momoResponse.payUrl };
}
```

#### Handle Callback (IPN):

```typescript
async handleMomoCallback(callbackData: MoMoCallbackData) {
  // 1. Verify signature
  const isValid = this.momoService.verifyCallbackSignature(callbackData);
  if (!isValid) throw new Error('Invalid signature');
  
  // 2. Parse extraData
  const { paymentId, appointmentId } = JSON.parse(callbackData.extraData);
  
  // 3. Update payment status
  const status = callbackData.resultCode === 0 ? 'completed' : 'failed';
  await this.paymentModel.findByIdAndUpdate(paymentId, {
    status,
    paymentDate: new Date(),
    transactionId: callbackData.transId,
  });
  
  // 4. Send notification (TODO)
  // 5. Update appointment status (TODO)
}
```

### 3. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/momo/create` | Tạo payment link |
| POST | `/api/v1/payments/momo/callback` | IPN callback từ MoMo |
| GET | `/api/v1/payments/momo/query/:orderId` | Query payment status |
| GET | `/api/v1/payments/:id` | Get payment by ID |
| GET | `/api/v1/payments/patient/:patientId` | Get payments by patient |

---

## 💻 Frontend Implementation

### 1. Payment Service

**File**: `client/src/services/paymentService.ts`

```typescript
const paymentService = {
  // Tạo MoMo payment
  async createMoMoPayment(request: CreateMoMoPaymentRequest, accessToken?: string): Promise<MoMoPaymentResponse>
  
  // Query payment status
  async queryMoMoPayment(orderId: string, accessToken?: string): Promise<any>
  
  // Get payment by ID
  async getPaymentById(paymentId: string, accessToken?: string): Promise<any>
  
  // Get payments by patient
  async getPaymentsByPatient(patientId: string, accessToken?: string): Promise<any>
}
```

### 2. MoMo Payment Button

**File**: `client/src/components/appointments/MoMoPaymentButton.tsx`

```tsx
<MoMoPaymentButton
  appointmentId={appointmentId}
  patientId={patientId}
  doctorId={doctorId}
  amount={50000}
  orderInfo="Thanh toán lịch khám"
  accessToken={session?.access_token}
  onSuccess={() => console.log('Payment initiated')}
  onError={(error) => console.error(error)}
/>
```

### 3. Payment Result Page

**File**: `client/src/app/patient/appointments/payment-result/page.tsx`

- Parse URL parameters từ MoMo redirect
- Query payment status từ backend
- Hiển thị kết quả thanh toán (success/failed)
- Actions: Xem lịch hẹn, Xem lịch sử thanh toán, Thử lại

### 4. Integration vào Appointment Confirmation

**File**: `client/src/components/appointments/AppointmentConfirmation.tsx`

```tsx
<AppointmentConfirmationComponent
  confirmation={confirmation}
  onClose={handleClose}
  // Payment options
  enablePayment={true}
  paymentAmount={50000}
  patientId={session?.user?._id}
  accessToken={session?.access_token}
/>
```

---

## 🔐 Security

### 1. Signature Verification

**Backend** verify mọi callback từ MoMo:

```typescript
verifyCallbackSignature(callbackData) {
  const rawSignature = 
    `accessKey=${accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&message=${message}` +
    `&orderId=${orderId}` +
    // ... other fields
    
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');
    
  return expectedSignature === callbackData.signature;
}
```

### 2. HTTPS Only

- Production endpoint: `https://payment.momo.vn`
- Test endpoint: `https://test-payment.momo.vn`

### 3. IPN (Instant Payment Notification)

- Backend nhận callback từ MoMo **trước khi** user được redirect
- Đảm bảo payment status được cập nhật kể cả khi user đóng browser

---

## ⚙️ Configuration

### Backend Environment Variables

```env
# MoMo Payment Gateway
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn

# URLs
BACKEND_URL=http://localhost:8081
FRONTEND_URL=http://localhost:3000
```

### Test Credentials

**⚠️ Chỉ dùng cho development/testing:**

- **Partner Code**: `MOMO`
- **Access Key**: `F8BBA842ECF85`
- **Secret Key**: `K951B6PE1waDMi640xX08PD3vg6EkVlz`

### Production Credentials

Để lấy production credentials, liên hệ MoMo tại: https://business.momo.vn/

---

## 🧪 Testing

### 1. Test Flow (Development)

```bash
# 1. Start backend
cd server
npm run dev

# 2. Start frontend
cd client
npm run dev

# 3. Test steps:
# - Login as patient
# - Create appointment
# - Click "Thanh toán với MoMo"
# - Should redirect to MoMo test page
# - Use test payment info from MoMo docs
# - Complete payment
# - Should redirect back to payment-result page
```

### 2. Test Credentials (MoMo Test Environment)

Theo tài liệu MoMo, test environment có thể:
- Tạo payment link thành công
- Simulate payment success/failure
- Nhận callback

### 3. Manual Testing Checklist

- [ ] Tạo payment link thành công
- [ ] payUrl được trả về
- [ ] Redirect đến MoMo test page
- [ ] Callback được nhận và xử lý đúng
- [ ] Payment status được cập nhật trong DB
- [ ] Redirect về payment-result page
- [ ] Payment result hiển thị đúng thông tin
- [ ] Payment history được lưu

---

## 🚀 Deployment

### 1. Update Environment Variables

```bash
# Production .env
MOMO_PARTNER_CODE=<your-partner-code>
MOMO_ACCESS_KEY=<your-access-key>
MOMO_SECRET_KEY=<your-secret-key>
MOMO_ENDPOINT=https://payment.momo.vn

BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### 2. Whitelist IPN URL

Đảm bảo MoMo có thể gọi đến IPN URL của bạn:
- URL: `https://api.yourdomain.com/api/v1/payments/momo/callback`
- Method: POST
- Must be HTTPS
- Must return 200 OK

### 3. SSL Certificate

Đảm bảo domain có SSL certificate hợp lệ.

---

## 📊 Database Schema

### Payment Collection

```typescript
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,
  amount: Number,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  type: 'appointment',
  refId: ObjectId,  // appointmentId
  refModel: 'Appointment',
  paymentDate: Date,
  paymentMethod: 'momo',
  transactionId: String,  // orderId or MoMo transId
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🐛 Troubleshooting

### 1. Payment creation fails

**Kiểm tra:**
- MOMO credentials đúng chưa
- MOMO_ENDPOINT đúng (test vs production)
- Network connectivity
- Console logs trong MoMoService

### 2. Callback không được nhận

**Kiểm tra:**
- IPN URL accessible từ internet
- Firewall rules
- HTTPS certificate hợp lệ
- Console logs trong payments.controller.ts

### 3. Invalid signature error

**Kiểm tra:**
- Secret key đúng
- Raw signature string format đúng
- Field order trong raw signature

### 4. Payment status không cập nhật

**Kiểm tra:**
- Callback handler có chạy không
- Database connection
- Payment ID trong extraData

---

## 📚 References

- [MoMo Developer Documentation](https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method)
- [MoMo Business Portal](https://business.momo.vn/)

---

## 🎉 Features Roadmap

### Completed ✅
- [x] MoMo payment integration
- [x] Payment service backend
- [x] Payment button component
- [x] Payment result page
- [x] IPN callback handler
- [x] Signature verification

### Todo 📋
- [ ] Send notification khi payment success
- [ ] Auto update appointment status khi paid
- [ ] Payment history page cho patient
- [ ] Payment management cho admin
- [ ] Refund functionality
- [ ] Payment receipt PDF
- [ ] Email notification với payment link
- [ ] SMS notification
- [ ] QR code payment option

---

**Created**: October 16, 2025  
**Status**: ✅ Complete  
**Version**: 1.0.0


