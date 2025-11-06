# 👨‍⚕️ Kế Hoạch Phát Triển Giao Diện Bác Sĩ Mobile

## 📋 Tổng Quan

Phát triển giao diện mobile cho bác sĩ với đầy đủ tính năng như giao diện web client, sử dụng API backend hiện có.

## 🎯 Mục Tiêu

1. ✅ **Dashboard (Tổng quan)** - Đã có mock data
2. 🔄 **Schedule (Lịch khám)** - Cần implement
3. 🔄 **Patients (Bệnh nhân)** - Cần implement  
4. ✅ **Revenue (Doanh thu)** - Đã có mock data
5. 🔄 **Medical Records (Hồ sơ bệnh án)** - Cần implement
6. 🔄 **Prescriptions (Đơn thuốc)** - Cần implement
7. 🔄 **Follow-ups (Tái khám)** - Cần implement
8. 🔄 **Chat (Nhắn tin)** - Cần implement
9. 🔄 **Notifications (Thông báo)** - Cần implement
10. 🔄 **Settings (Cài đặt)** - Cần implement

---

## 📁 Cấu Trúc File

### Hiện tại:
```
mobile/app/(doctor)/
  _layout.tsx                    ✅ Tab navigation
  index.tsx                      ✅ Dashboard (mock)
  schedule.tsx                   ⚠️  Placeholder
  patients.tsx                   ⚠️  Placeholder
  revenue.tsx                    ✅ Revenue (mock)
  more.tsx                       ⚠️  Empty
```

### Cần tạo mới:
```
mobile/
  app/(doctor)/
    medical-records/
      index.tsx                  📝 Danh sách hồ sơ
      create.tsx                 📝 Tạo hồ sơ mới
      [id].tsx                   📝 Chi tiết + Chỉnh sửa
    prescriptions/
      index.tsx                  📝 Danh sách đơn thuốc
      create.tsx                 📝 Kê đơn thuốc
      [id].tsx                   📝 Chi tiết đơn thuốc
    patients/
      [id].tsx                   📝 Chi tiết bệnh nhân
    followups/
      index.tsx                  📝 Quản lý tái khám
    chat.tsx                     📝 Chat với bệnh nhân
    notifications.tsx            📝 Thông báo
    settings.tsx                 📝 Cài đặt bác sĩ
    
  components/doctor/
    DashboardStats.tsx           📝 Thống kê tổng quan
    AppointmentCard.tsx          📝 Card lịch hẹn
    PatientCard.tsx              📝 Card bệnh nhân
    MedicalRecordForm.tsx        📝 Form hồ sơ bệnh án
    PrescriptionForm.tsx         📝 Form đơn thuốc
    TreatmentPlanModal.tsx       📝 Modal kế hoạch điều trị
    FollowUpModal.tsx            📝 Modal tái khám
    
  services/
    doctorService.ts             📝 API calls cho bác sĩ
    dashboardService.ts          📝 Dashboard APIs
    medicalRecordService.ts      📝 Medical Records APIs
    prescriptionService.ts       📝 Prescription APIs
```

---

## 🔌 API Endpoints (Từ Backend)

### 1. Dashboard APIs
```typescript
GET /api/v1/appointments/doctor/:doctorId/dashboard
  - Thống kê dashboard
  - Lịch hẹn hôm nay
  - Chart data theo tháng/năm

Response: {
  totalPatients: number
  totalAppointments: number
  totalIncome: number
  totalTreatments: number
  patientGrowth: number
  appointmentGrowth: number
  incomeGrowth: number
  treatmentGrowth: number
}
```

### 2. Appointments APIs
```typescript
GET /api/v1/appointments/doctor/:doctorId
GET /api/v1/appointments/doctor/:doctorId/today
GET /api/v1/appointments/:id
PATCH /api/v1/appointments/:id
POST /api/v1/appointments
```

### 3. Patients APIs
```typescript
GET /api/v1/users/doctor/:doctorId/patients
GET /api/v1/users/:patientId
GET /api/v1/appointments/patient/:patientId/history
```

### 4. Medical Records APIs
```typescript
GET /api/v1/medical-records/doctor/records?doctorId=xxx
GET /api/v1/medical-records/patient/:patientId
GET /api/v1/medical-records/:id
POST /api/v1/medical-records
PATCH /api/v1/medical-records/:id
GET /api/v1/medical-records/doctor/:doctorId/statistics
```

### 5. Prescriptions APIs
```typescript
GET /api/v1/prescriptions/doctor/:doctorId
GET /api/v1/prescriptions/patient/:patientId/recent
GET /api/v1/prescriptions/:id
POST /api/v1/prescriptions
PATCH /api/v1/prescriptions/:id
```

### 6. Revenue APIs
```typescript
GET /api/v1/revenue/doctor/:doctorId
GET /api/v1/revenue/doctor/:doctorId/summary
GET /api/v1/revenue/doctor/:doctorId/range
```

### 7. Notifications APIs
```typescript
GET /api/v1/notifications/user/:userId
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/user/:userId/read-all
```

### 8. Chat APIs
```typescript
GET /api/v1/realtime-chat/conversations?userId=xxx&userRole=doctor
GET /api/v1/realtime-chat/conversations/:id/messages
POST /api/v1/realtime-chat/conversations/:id/messages
```

---

## 📝 Kế Hoạch Thực Hiện (Theo Thứ Tự Ưu Tiên)

### Phase 1: Core Services & API Integration ⚡ (Cao nhất)

#### 1.1 Tạo Doctor Services
- [ ] `services/doctorService.ts` - Tất cả API calls
- [ ] `services/dashboardService.ts` - Dashboard data
- [ ] `services/medicalRecordService.ts` - Medical records
- [ ] `services/prescriptionService.ts` - Prescriptions

**Thời gian:** 2-3 giờ

---

### Phase 2: Dashboard Enhancement 📊

#### 2.1 Cập nhật Dashboard (index.tsx)
- [ ] Thay thế mock data bằng real API
- [ ] Integrate với `dashboardService`
- [ ] Real-time stats
- [ ] Chart data từ API
- [ ] Lịch hẹn hôm nay từ API
- [ ] Pull to refresh

**Thời gian:** 2 giờ

---

### Phase 3: Schedule (Lịch khám) 📅

#### 3.1 Schedule Screen (schedule.tsx)
- [ ] Calendar view (react-native-calendars)
- [ ] List view appointments
- [ ] Filter by status (pending, confirmed, completed, cancelled)
- [ ] Search appointments
- [ ] Appointment detail modal
- [ ] Update appointment status
- [ ] Add new appointment
- [ ] Color coding by status

**Components cần tạo:**
- `components/doctor/AppointmentCalendar.tsx`
- `components/doctor/AppointmentList.tsx`
- `components/doctor/AppointmentDetailModal.tsx`
- `components/doctor/CreateAppointmentModal.tsx`

**Thời gian:** 4-5 giờ

---

### Phase 4: Patients Management 👥

#### 4.1 Patients List (patients.tsx)
- [ ] Danh sách bệnh nhân
- [ ] Search & filter
- [ ] Patient statistics
- [ ] Quick actions

#### 4.2 Patient Detail ([id].tsx)
- [ ] Thông tin cá nhân
- [ ] Lịch sử khám
- [ ] Hồ sơ bệnh án
- [ ] Đơn thuốc
- [ ] Thanh toán
- [ ] Tabs navigation
- [ ] Quick chat button
- [ ] Add medical record
- [ ] Add prescription
- [ ] Schedule follow-up

**Components cần tạo:**
- `components/doctor/PatientCard.tsx`
- `components/doctor/PatientDetailTabs.tsx`
- `components/doctor/PatientStatsCard.tsx`

**Thời gian:** 4-5 giờ

---

### Phase 5: Medical Records 📋

#### 5.1 Medical Records List (medical-records/index.tsx)
- [ ] Danh sách hồ sơ
- [ ] Filter by patient, date, status
- [ ] Search
- [ ] Statistics cards

#### 5.2 Create Medical Record (medical-records/create.tsx)
- [ ] Form tạo hồ sơ
- [ ] Chief complaint (multiple)
- [ ] Diagnosis groups
- [ ] Treatment plans
- [ ] Medications
- [ ] Notes
- [ ] Images upload
- [ ] Save draft

#### 5.3 Medical Record Detail (medical-records/[id].tsx)
- [ ] View full record
- [ ] Edit record
- [ ] Print/Export
- [ ] Link to prescription
- [ ] Link to follow-up

**Components cần tạo:**
- `components/doctor/MedicalRecordCard.tsx`
- `components/doctor/MedicalRecordForm.tsx`
- `components/doctor/DiagnosisInput.tsx`
- `components/doctor/TreatmentPlanInput.tsx`
- `components/doctor/MedicationSelector.tsx`

**Thời gian:** 6-8 giờ

---

### Phase 6: Prescriptions 💊

#### 6.1 Prescriptions List (prescriptions/index.tsx)
- [ ] Danh sách đơn thuốc
- [ ] Filter by patient, date
- [ ] Search
- [ ] Statistics

#### 6.2 Create Prescription (prescriptions/create.tsx)
- [ ] Select patient
- [ ] Select medical record (optional)
- [ ] Add medications
- [ ] Medication search from database
- [ ] Dosage, frequency, duration
- [ ] Instructions
- [ ] Notes

#### 6.3 Prescription Detail (prescriptions/[id].tsx)
- [ ] View prescription
- [ ] Print
- [ ] Edit
- [ ] Status tracking

**Components cần tạo:**
- `components/doctor/PrescriptionCard.tsx`
- `components/doctor/PrescriptionForm.tsx`
- `components/doctor/MedicationSearch.tsx`
- `components/doctor/MedicationItem.tsx`

**Thời gian:** 5-6 giờ

---

### Phase 7: Revenue (Doanh thu) 💰

#### 7.1 Cập nhật Revenue (revenue.tsx)
- [ ] Thay mock data bằng real API
- [ ] Summary cards
- [ ] Transaction list
- [ ] Revenue by type chart
- [ ] Monthly revenue chart
- [ ] Filter by date range
- [ ] Export report

**Thời gian:** 2-3 giờ

---

### Phase 8: Follow-ups (Tái khám) 🔄

#### 8.1 Follow-ups Screen (followups/index.tsx)
- [ ] Danh sách tái khám
- [ ] Upcoming follow-ups
- [ ] Overdue follow-ups
- [ ] Mark as completed
- [ ] Create follow-up appointment
- [ ] Send reminder

**Components cần tạo:**
- `components/doctor/FollowUpCard.tsx`
- `components/doctor/CreateFollowUpModal.tsx`

**Thời gian:** 3-4 giờ

---

### Phase 9: Chat & Notifications 💬

#### 9.1 Chat (chat.tsx)
- [ ] Reuse existing chat components
- [ ] Filter conversations by patient
- [ ] Quick reply templates

#### 9.2 Notifications (notifications.tsx)
- [ ] Reuse NotificationModal logic
- [ ] Doctor-specific notifications
- [ ] Mark as read
- [ ] Filter by type

**Thời gian:** 2 giờ

---

### Phase 10: Settings ⚙️

#### 10.1 Doctor Settings (settings.tsx)
- [ ] Profile management
- [ ] Schedule settings (working hours)
- [ ] Notification preferences
- [ ] Consultation fees
- [ ] Payment settings
- [ ] Privacy settings

**Components cần tạo:**
- `components/doctor/WorkingHoursEditor.tsx`
- `components/doctor/FeeSettings.tsx`

**Thời gian:** 3-4 giờ

---

### Phase 11: More Tab Enhancement 📱

#### 11.1 More Screen (more.tsx)
- [ ] Quick stats
- [ ] Navigation links
- [ ] Profile preview
- [ ] Shortcuts

**Thời gian:** 1-2 giờ

---

## 🎨 Design Guidelines

### Colors
```typescript
primary: '#1e40af'      // Blue for medical
success: '#10b981'      // Green for completed
warning: '#f59e0b'      // Orange for pending
error: '#ef4444'        // Red for cancelled
info: '#3b82f6'         // Light blue for info
```

### Components
- Sử dụng lại `Card`, `Badge`, `Button` từ `components/ui/`
- Consistent spacing với `Spacing` constants
- Follow `Colors` theme từ constants

---

## 🔧 Technical Requirements

### Dependencies
```json
{
  "react-native-calendars": "^1.1302.0",
  "react-native-chart-kit": "^6.12.0",
  "date-fns": "^2.30.0"
}
```

### State Management
- Use React Context for:
  - Doctor profile
  - Active appointments
  - Notifications
- Local state for forms and UI

### Error Handling
```typescript
try {
  const response = await doctorService.getAppointments(doctorId);
  if (response.success) {
    setData(response.data);
  } else {
    Alert.alert('Lỗi', response.message);
  }
} catch (error) {
  Alert.alert('Lỗi', 'Không thể kết nối server');
}
```

---

## 📊 Testing Checklist

### Per Feature
- [ ] API integration works
- [ ] Loading states
- [ ] Error handling
- [ ] Pull to refresh
- [ ] Navigation works
- [ ] Forms validate
- [ ] Data saves correctly
- [ ] UI responsive

---

## 🚀 Deployment Steps

1. Complete Phase 1-2 (Core + Dashboard)
2. Test thoroughly
3. Deploy to TestFlight/Internal Testing
4. Complete Phase 3-6 (Main features)
5. Beta testing
6. Complete Phase 7-11 (Additional features)
7. Production release

---

## 📈 Progress Tracking

### Completed: 20%
- ✅ Tab layout
- ✅ Dashboard UI (mock)
- ✅ Revenue UI (mock)
- ⚠️  Basic navigation

### In Progress: 0%

### Todo: 80%
- Services
- Real API integration
- All screens
- All components
- Testing

---

## 🎯 Success Criteria

- [ ] Tất cả API calls thành công
- [ ] UI/UX giống web client
- [ ] Performance tốt (< 2s load time)
- [ ] No crashes
- [ ] Error handling hoàn chỉnh
- [ ] Offline mode (optional)
- [ ] Push notifications work
- [ ] Real-time updates (Socket.io)

---

## 📞 Next Steps

**Bắt đầu ngay:**
1. Tạo doctor services (Phase 1)
2. Update dashboard với real API (Phase 2)
3. Implement schedule screen (Phase 3)

**Estimated Total Time:** 40-50 giờ

---

**Ngày tạo:** 2025-01-06  
**Cập nhật lần cuối:** 2025-01-06
