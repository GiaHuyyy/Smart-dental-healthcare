# 📱 Mobile App Completion Checklist

> **Mục đích:** Theo dõi tiến độ phát triển Mobile App so với Client Web
> 
> **Cập nhật:** November 3, 2025
> 
> **Trạng thái tổng quan:** 🟡 40% hoàn thành

---

## 📊 Tổng quan

| Danh mục | Hoàn thành | Còn thiếu | Tỷ lệ |
|----------|-----------|-----------|-------|
| **Patient Features** | 5/10 | 5 | 50% |
| **Doctor Features** | 0/8 | 8 | 0% |
| **Core Systems** | 2/6 | 4 | 33% |
| **Integration** | 1/5 | 4 | 20% |

---

## 🔴 CRITICAL - Thiếu hoàn toàn (Ưu tiên cao nhất)

### 1. 💰 Wallet System (Ví điện tử)
**Status:** ❌ Chưa có gì

**Client có:**
- ✅ Trang `/patient/wallet`
- ✅ Hiển thị số dư realtime
- ✅ Nạp tiền qua MoMo
- ✅ Lịch sử giao dịch đầy đủ
- ✅ Thống kê: Tổng nạp, giao dịch thành công
- ✅ Payment status tracking với polling
- ✅ UI/UX chuyên nghiệp với gradient cards

**Mobile cần:**
```typescript
// Cần tạo các files:
app/(tabs)/wallet.tsx                    // Main wallet screen
components/wallet/WalletBalance.tsx      // Balance card component  
components/wallet/TopUpModal.tsx         // Top-up modal
components/wallet/TransactionHistory.tsx // Transaction list
services/walletService.ts                // API calls
```

**API endpoints cần dùng:**
- `GET /api/v1/wallet/balance` - Lấy số dư
- `GET /api/v1/wallet/history` - Lịch sử giao dịch
- `GET /api/v1/wallet/stats` - Thống kê
- `POST /api/v1/wallet/top-up` - Nạp tiền
- `POST /api/v1/wallet/test-callback` - Test callback (dev only)

**UI Components cần:**
- 💳 Balance Card (gradient blue → indigo)
- ➕ Top Up Button với modal
- 📊 Statistics Cards (3 cards)
- 📜 Transaction History List
- ⏳ Loading states & animations
- 🔄 Pull to refresh

**Priority:** ⭐⭐⭐⭐⭐

---

### 2. 🔔 Notification System
**Status:** ❌ Chưa có gì

**Client có:**
- ✅ NotificationButton component với badge count
- ✅ NotificationsContent - notification center đầy đủ
- ✅ Real-time notifications qua Socket.IO
- ✅ Notification types: appointment, revenue, follow-up, payment
- ✅ Mark as read/unread
- ✅ Navigate to relevant pages
- ✅ Toast notifications

**Mobile cần:**
```typescript
// Cần tạo các files:
components/notifications/NotificationBell.tsx    // Bell icon with badge
components/notifications/NotificationCenter.tsx  // Full notification list
components/notifications/NotificationItem.tsx    // Single notification card
contexts/NotificationContext.tsx                 // Notification state management
hooks/useNotifications.ts                        // Notification hooks
services/notificationService.ts                  // API calls
```

**Socket events cần handle:**
```typescript
socket.on('notification:new', (notification) => {
  // Add to list
  // Update badge count
  // Show toast
});

socket.on('appointment:new', (data) => {});
socket.on('appointment:update', (data) => {});
socket.on('appointment:cancel', (data) => {});
socket.on('payment:completed', (data) => {});
```

**API endpoints:**
- `GET /api/v1/notifications` - Lấy danh sách
- `GET /api/v1/notifications/unread-count` - Số chưa đọc
- `PATCH /api/v1/notifications/:id/read` - Đánh dấu đã đọc
- `PATCH /api/v1/notifications/mark-all-read` - Đọc tất cả

**UI Components:**
- 🔔 Bell Icon with Badge (header)
- 📋 Notification List (modal/screen)
- 📄 Notification Card với icon theo type
- 🔴 Unread indicator (dot)
- 📱 Toast notifications
- ♾️ Infinite scroll
- 🔄 Pull to refresh

**Priority:** ⭐⭐⭐⭐⭐

---

### 3. 🎁 Voucher System
**Status:** ❌ Chưa có gì

**Client có:**
- ✅ Trang `/patient/vouchers`
- ✅ VoucherList component với design đẹp
- ✅ Filter: Active, Used, Expired
- ✅ Copy voucher code
- ✅ Hiển thị discount value (5%)
- ✅ Expiry date countdown
- ✅ Instructions panel (cách nhận voucher)

**Mobile cần:**
```typescript
// Cần tạo các files:
app/(tabs)/vouchers.tsx                  // Main vouchers screen
components/vouchers/VoucherCard.tsx      // Voucher card với gradient
components/vouchers/VoucherList.tsx      // List with sections
components/vouchers/VoucherFilter.tsx    // Tab filter
components/vouchers/VoucherInstructions.tsx // Info panel
services/voucherService.ts               // API calls
```

**API endpoints:**
- `GET /api/v1/vouchers/patient/:patientId` - Lấy danh sách voucher
- `POST /api/v1/vouchers/apply` - Áp dụng voucher
- `GET /api/v1/vouchers/:code/validate` - Kiểm tra voucher

**Voucher types:**
1. **Doctor Cancellation** (Bác sĩ hủy khẩn cấp)
   - 5% discount
   - 30 days expiry
   - Code: `CANCEL_xxx`

2. **Follow-up** (Tái khám)
   - 5% discount
   - 90 days expiry
   - Code: `FOLLOWUP_xxx`

**UI Components:**
- 🎫 Voucher Card (gradient green/gold)
- 🏷️ Discount Badge
- 📅 Expiry Date Display
- 📋 Copy Code Button
- ✅ Status Indicator (active/used/expired)
- 📱 Section List (tabs)
- ℹ️ Instructions Panel

**Priority:** ⭐⭐⭐⭐

---

### 4. 🔄 Follow-up System (Tái khám)
**Status:** ❌ Chưa có gì

**Client có:**
- ✅ Trang `/patient/followups`
- ✅ FollowUpSuggestions component
- ✅ Accept/Reschedule follow-up
- ✅ Badge "Giảm giá 5%" nổi bật
- ✅ Doctor can create follow-up suggestions
- ✅ Email + notification to patient

**Mobile cần:**
```typescript
// Cần tạo các files:
app/(tabs)/followups.tsx                      // Main follow-ups screen
components/followups/FollowUpCard.tsx         // Suggestion card
components/followups/FollowUpList.tsx         // List component
components/followups/AcceptFollowUpModal.tsx  // Accept confirmation
services/followUpService.ts                   // API calls
```

**API endpoints:**
- `GET /api/v1/appointments/patient/:patientId/follow-ups` - Lấy đề xuất
- `PATCH /api/v1/appointments/:id/accept-follow-up` - Chấp nhận
- `PATCH /api/v1/appointments/:id/reschedule-follow-up` - Đổi lịch

**UI Components:**
- 🎁 Follow-up Card (green gradient)
- 💰 Discount Badge (5%)
- 👨‍⚕️ Doctor Info
- 📅 Suggested Date/Time
- ✅ Accept Button
- 🔄 Reschedule Button
- 📧 Email sent indicator

**Priority:** ⭐⭐⭐⭐

---

### 5. 👨‍⚕️ Doctor Dashboard & Features
**Status:** ❌ Folder `(doctor)` hoàn toàn rỗng

**Client có 8 tính năng chính:**

#### 5.1 Doctor Dashboard (`/doctor`)
- ✅ Overview stats
- ✅ Today's appointments
- ✅ Patient summary
- ✅ Quick actions

#### 5.2 Revenue Management (`/doctor/revenue`)
- ✅ Revenue tracking realtime
- ✅ Summary cards (Tổng doanh thu, Phí nền tảng, Thực nhận, Tăng trưởng)
- ✅ Revenue chart
- ✅ Transaction list với filters
- ✅ Socket.IO realtime updates

#### 5.3 Schedule Management (`/doctor/schedule`)
- ✅ Calendar view
- ✅ Appointment list
- ✅ Create/Edit/Cancel appointments
- ✅ RescheduleWithBillingModal
- ✅ CancelWithBillingModal
- ✅ CreateFollowUpModal

#### 5.4 Patient Management (`/doctor/patients`)
- ✅ Patient list với search
- ✅ Patient details
- ✅ Medical history
- ✅ Appointment history

#### 5.5 Medical Records (`/doctor/medical-records`)
- ✅ Create medical record
- ✅ Dental chart
- ✅ Treatment planning
- ✅ Image upload (Cloudinary)
- ✅ Treatment modal integration

#### 5.6 Prescriptions (`/doctor/prescriptions`)
- ✅ Create prescription
- ✅ Medication search
- ✅ Prescription list
- ✅ Print prescription

#### 5.7 Follow-ups (`/doctor/followups`)
- ✅ Follow-up suggestions
- ✅ Create follow-up appointments
- ✅ Track follow-up status

#### 5.8 Doctor Settings
- ✅ Profile management
- ✅ Schedule settings
- ✅ Notification preferences

**Mobile cần tạo toàn bộ:**
```
app/(doctor)/
  _layout.tsx                    // Doctor layout with navigation
  index.tsx                      // Dashboard
  revenue.tsx                    // Revenue page
  schedule.tsx                   // Schedule/Calendar
  patients/
    index.tsx                    // Patient list
    [id].tsx                     // Patient detail
  medical-records/
    index.tsx                    // Records list
    create.tsx                   // Create record
  prescriptions/
    index.tsx                    // Prescription list
    create.tsx                   // Create prescription
  followups.tsx                  // Follow-up management
  settings.tsx                   // Doctor settings
```

**Priority:** ⭐⭐⭐⭐⭐ (Rất quan trọng)

---

## 🟡 IMPORTANT - Có nhưng chưa đầy đủ (Ưu tiên trung bình)

### 6. 📊 Dashboard với Real Data
**Status:** 🟡 Có UI nhưng dùng dummy data

**Hiện tại:**
- ✅ UI đẹp với gradient cards
- ✅ Layout responsive
- ✅ Icons và styling hoàn chỉnh
- ❌ Dữ liệu hard-coded (fake data)
- ❌ Chưa kết nối API
- ❌ Không có loading states
- ❌ Không có error handling

**Cần làm:**
```typescript
// Update: app/(tabs)/index.tsx

// 1. Import services
import patientDashboardService from '@/services/patientDashboardService';

// 2. Add state management
const [stats, setStats] = useState<PatientDashboardStats | null>(null);
const [activities, setActivities] = useState<RecentActivity[]>([]);
const [loading, setLoading] = useState(true);

// 3. Fetch data
useEffect(() => {
  fetchDashboardData();
}, [session]);

const fetchDashboardData = async () => {
  const statsResult = await patientDashboardService.getPatientDashboardStats(userId, accessToken);
  const activitiesResult = await patientDashboardService.getRecentActivities(userId, accessToken);
  // Update state...
};

// 4. Replace dummy data with real data
// KPI_CARDS → stats.nextAppointment, stats.completedAppointments, etc.
// ACTIVITIES → activities from API
// HEALTH_METRICS → từ medical records
```

**API endpoints cần:**
- `GET /api/v1/dashboard/patient/:id/stats` - Statistics
- `GET /api/v1/dashboard/patient/:id/activities` - Recent activities

**Priority:** ⭐⭐⭐

---

### 7. 📅 Appointments với Billing
**Status:** 🟡 Có basic, thiếu billing integration

**Hiện tại:**
- ✅ Basic appointments page
- ✅ Appointment list
- ❌ Chưa có billing modal
- ❌ Chưa có payment result page
- ❌ Chưa có reschedule with billing
- ❌ Chưa có cancel with billing

**Cần thêm:**
```typescript
// Cần tạo:
components/appointments/RescheduleWithBillingModal.tsx
components/appointments/CancelWithBillingModal.tsx
components/appointments/PaymentResultScreen.tsx
app/appointments/payment-result.tsx  // Result screen after MoMo
```

**Billing logic:**
- ⚠️ Warning 30 minutes before appointment
- 💰 Billing nếu reschedule < 30 mins
- 💰 Billing nếu cancel (doctor: 100%, patient: 50%)
- 🎁 Voucher compensation nếu doctor cancel
- 🔄 Refund logic

**Priority:** ⭐⭐⭐

---

### 8. 🏥 Medical Records Enhancement
**Status:** 🟡 Có basic, thiếu features

**Hiện tại:**
- ✅ Basic records page
- ❌ Chưa có dental chart
- ❌ Chưa có image upload
- ❌ Chưa có treatment history details
- ❌ Chưa có PDF export

**Cần thêm:**
```typescript
components/medical-records/DentalChart.tsx       // Sơ đồ răng 32 răng
components/medical-records/ImageUploader.tsx     // Upload ảnh X-quang
components/medical-records/TreatmentHistory.tsx  // Lịch sử điều trị
components/medical-records/RecordDetail.tsx      // Chi tiết hồ sơ
```

**Features cần:**
- 🦷 Dental Chart (32 teeth)
- 📸 Image upload (Cloudinary)
- 📄 Treatment details
- 💾 Export PDF
- 🔍 Search records

**Priority:** ⭐⭐⭐

---

### 9. 💊 Prescriptions với Export
**Status:** 🟡 Có basic, thiếu export

**Hiện tại:**
- ✅ Basic prescriptions page
- ✅ Prescription list
- ❌ Chưa có print/export
- ❌ Chưa có prescription details modal
- ❌ Chưa có medication search

**Cần thêm:**
```typescript
components/prescriptions/PrescriptionDetail.tsx   // Chi tiết đơn thuốc
components/prescriptions/PrescriptionPrint.tsx    // Print preview
components/prescriptions/MedicationList.tsx       // Danh sách thuốc
utils/prescriptionExport.ts                       // Export to PDF
```

**Features:**
- 🖨️ Print prescription
- 📄 Export to PDF
- 📧 Email prescription
- 💊 Medication details
- ⚕️ Dosage instructions

**Priority:** ⭐⭐

---

### 10. 💳 Payments với MoMo Integration
**Status:** 🟡 Có basic, thiếu integration

**Hiện tại:**
- ✅ Basic payments page
- ✅ Payment list
- ❌ Chưa có MoMo integration đầy đủ
- ❌ Chưa có refund tracking
- ❌ Chưa có bill details
- ❌ Chưa có payment status tracking

**Cần thêm:**
```typescript
components/payments/PaymentCard.tsx         // Payment item card
components/payments/PaymentDetail.tsx       // Payment details modal
components/payments/RefundTracker.tsx       // Refund status
services/paymentService.ts                  // MoMo API integration
app/payment-result.tsx                      // MoMo redirect result
```

**MoMo Integration:**
```typescript
// 1. Create payment
const response = await paymentService.createMomoPayment({
  amount,
  appointmentId,
  description
});

// 2. Open MoMo payment URL
Linking.openURL(response.payUrl);

// 3. Handle callback (Deep linking)
Linking.addEventListener('url', handleMomoCallback);

// 4. Query payment status
const status = await paymentService.queryPaymentStatus(orderId);
```

**Priority:** ⭐⭐⭐

---

## 🟢 COMPLETED - Đã có tương đương

### ✅ 1. Authentication
- ✅ Login screen
- ✅ Register screen
- ✅ Auth context
- ✅ Token management

### ✅ 2. Chat
- ✅ Chat screen
- ✅ Message list
- ✅ Real-time messaging

### ✅ 3. Doctors List
- ✅ Doctors listing
- ✅ Doctor details
- ✅ Search & filter

### ✅ 4. Settings
- ✅ Profile settings
- ✅ Preferences
- ✅ Logout

---

## 🔧 TECHNICAL REQUIREMENTS

### Dependencies cần install:

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "^1.19.3",
    "socket.io-client": "^4.5.4",
    "react-native-mmkv": "^2.10.1",
    "react-native-toast-message": "^2.1.6",
    "expo-linking": "^5.0.2",
    "expo-image-picker": "^14.3.2",
    "expo-file-system": "^15.4.5",
    "react-native-pdf": "^6.7.3",
    "@react-native-clipboard/clipboard": "^1.13.2"
  }
}
```

### Services cần tạo:

```
services/
  walletService.ts          ✅ Copy từ client
  voucherService.ts         ✅ Copy từ client
  notificationService.ts    ✅ Copy từ client
  followUpService.ts        ✅ Copy từ client
  paymentService.ts         ✅ Đã có, cần enhance
  patientDashboardService.ts ✅ Copy từ client
  doctorDashboardService.ts  ❌ Cần tạo mới
  revenueService.ts          ❌ Cần tạo mới
  medicalRecordService.ts    ✅ Đã có, cần enhance
  prescriptionService.ts     ✅ Đã có, cần enhance
```

### Contexts cần tạo:

```
contexts/
  NotificationContext.tsx    ❌ Cần tạo
  SocketContext.tsx          ❌ Cần tạo
  WalletContext.tsx          ❌ Cần tạo (optional)
  PaymentContext.tsx         ❌ Cần tạo (optional)
```

### Hooks cần tạo:

```
hooks/
  useNotifications.ts        ❌ Cần tạo
  useSocket.ts               ❌ Cần tạo
  useWallet.ts               ❌ Cần tạo
  usePayment.ts              ❌ Cần tạo
  useRevenueSocket.ts        ❌ Cần tạo (cho doctor)
```

---

## 📋 IMPLEMENTATION PLAN

### 🎯 Phase 1: Core Systems (2-3 tuần)
**Priority:** Critical features cho patient

#### Week 1: Wallet & Notifications
- [ ] Day 1-2: Wallet System
  - [ ] Create wallet service
  - [ ] Create wallet screen
  - [ ] Implement MoMo integration
  - [ ] Add transaction history
  - [ ] Test top-up flow

- [ ] Day 3-5: Notification System
  - [ ] Create notification service
  - [ ] Create notification context
  - [ ] Implement Socket.IO connection
  - [ ] Create notification bell component
  - [ ] Create notification center
  - [ ] Test realtime notifications

#### Week 2: Vouchers & Follow-ups
- [ ] Day 1-3: Voucher System
  - [ ] Create voucher service
  - [ ] Create voucher screen
  - [ ] Implement voucher cards
  - [ ] Add filter tabs
  - [ ] Test voucher application

- [ ] Day 4-5: Follow-up System
  - [ ] Create follow-up service
  - [ ] Create follow-up screen
  - [ ] Implement accept/reschedule
  - [ ] Test follow-up flow

#### Week 3: Dashboard Enhancement
- [ ] Day 1-3: Connect Dashboard to API
  - [ ] Create dashboard service
  - [ ] Replace dummy data
  - [ ] Add loading states
  - [ ] Add error handling
  - [ ] Add pull-to-refresh

- [ ] Day 4-5: Appointments Enhancement
  - [ ] Add billing modals
  - [ ] Add payment result screen
  - [ ] Test appointment flows

---

### 🎯 Phase 2: Doctor Features (3-4 tuần)
**Priority:** Complete doctor dashboard

#### Week 1: Doctor Layout & Dashboard
- [ ] Create doctor layout
- [ ] Create doctor navigation
- [ ] Implement doctor dashboard
- [ ] Add stats cards
- [ ] Add quick actions

#### Week 2: Revenue & Schedule
- [ ] Implement revenue page
- [ ] Add revenue socket
- [ ] Create schedule/calendar
- [ ] Add appointment management
- [ ] Test billing modals

#### Week 3: Patient & Medical Records
- [ ] Create patient list
- [ ] Create patient details
- [ ] Implement medical records
- [ ] Add dental chart
- [ ] Add image upload

#### Week 4: Prescriptions & Follow-ups
- [ ] Create prescription management
- [ ] Add medication search
- [ ] Implement follow-up creation
- [ ] Add doctor settings
- [ ] Final testing

---

### 🎯 Phase 3: Enhancement & Polish (1-2 tuần)
**Priority:** UI/UX improvements

#### Week 1: Features Enhancement
- [ ] Medical records PDF export
- [ ] Prescription print
- [ ] Payment enhancements
- [ ] Advanced filters
- [ ] Search improvements

#### Week 2: Polish & Testing
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] E2E testing
- [ ] Bug fixes

---

## 🧪 TESTING CHECKLIST

### Patient Features:
- [ ] Wallet top-up flow
- [ ] Notification reception
- [ ] Voucher application
- [ ] Follow-up acceptance
- [ ] Appointment booking with payment
- [ ] Appointment reschedule with billing
- [ ] Appointment cancel with billing
- [ ] Medical records viewing
- [ ] Prescription viewing
- [ ] Chat messaging

### Doctor Features:
- [ ] Dashboard data loading
- [ ] Revenue tracking
- [ ] Schedule management
- [ ] Patient management
- [ ] Medical record creation
- [ ] Prescription creation
- [ ] Follow-up suggestion
- [ ] Appointment billing
- [ ] Notification sending

### Integration Tests:
- [ ] Socket.IO realtime updates
- [ ] MoMo payment flow
- [ ] Deep linking (payment result)
- [ ] Image upload (Cloudinary)
- [ ] PDF generation
- [ ] Email sending
- [ ] Push notifications

---

## 📝 NOTES FOR AI ASSISTANT

### Khi implement features mới:

1. **Luôn copy services từ client trước:**
   ```bash
   cp client/src/services/walletService.ts mobile/services/walletService.ts
   ```
   Sau đó adapt cho React Native (axios → fetch, window → Linking, etc.)

2. **UI Components:**
   - Client dùng Tailwind CSS
   - Mobile dùng NativeWind (Tailwind cho React Native)
   - Syntax tương tự nhưng có một số khác biệt

3. **Navigation:**
   - Client: Next.js router
   - Mobile: Expo Router (file-based routing)
   - Both support params và deep linking

4. **Storage:**
   - Client: localStorage, sessionStorage
   - Mobile: AsyncStorage hoặc MMKV

5. **API calls:**
   - Reuse same endpoints
   - Same request/response format
   - Need to handle token management differently

6. **Socket.IO:**
   - Same events
   - Same namespaces
   - Different connection management (background/foreground)

7. **Design System:**
   - Colors: Giữ nguyên từ client
   - Spacing: Giữ nguyên (Tailwind scale)
   - Typography: Adapt cho mobile (slightly smaller)
   - Shadows: Dùng elevation thay vì shadow classes

### Common Patterns:

#### Service Pattern:
```typescript
// walletService.ts
const walletService = {
  getBalance: async (accessToken: string) => {
    const response = await fetch(`${API_URL}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.json();
  }
};
```

#### Component Pattern:
```typescript
// WalletBalance.tsx
export default function WalletBalance() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <View className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8">
      {loading ? <ActivityIndicator /> : <Text>{balance}</Text>}
    </View>
  );
}
```

#### Socket Pattern:
```typescript
// useSocket.ts
const useSocket = () => {
  const socket = useRef<Socket>();

  useEffect(() => {
    socket.current = io(SOCKET_URL, {
      auth: { token: accessToken }
    });

    socket.current.on('notification:new', handleNotification);

    return () => {
      socket.current?.disconnect();
    };
  }, []);
};
```

---

## 🎯 SUCCESS CRITERIA

### Mobile app được coi là hoàn thành khi:

✅ **Patient Features:**
- [ ] 100% feature parity với client
- [ ] Tất cả API endpoints hoạt động
- [ ] Realtime notifications working
- [ ] Payment flow hoàn chỉnh
- [ ] Smooth UI/UX

✅ **Doctor Features:**
- [ ] Dashboard đầy đủ
- [ ] Revenue tracking realtime
- [ ] Schedule management
- [ ] Patient management
- [ ] Medical records & prescriptions

✅ **Quality:**
- [ ] No critical bugs
- [ ] Performance acceptable (< 3s load time)
- [ ] Offline support (basic)
- [ ] Error handling robust
- [ ] UI consistent với design system

✅ **Testing:**
- [ ] Unit tests > 70% coverage
- [ ] Integration tests for critical flows
- [ ] E2E tests for main user journeys
- [ ] Manual testing completed

---

## 📞 CONTACT & SUPPORT

- **Project Lead:** [Your Name]
- **Backend Team:** Check API documentation
- **Design System:** See client Tailwind config
- **Socket Events:** See PAYMENT_TO_REVENUE_FLOW.md

---

**Last Updated:** November 3, 2025  
**Next Review:** Weekly check-in every Monday  
**Current Sprint:** Phase 1 - Core Systems

