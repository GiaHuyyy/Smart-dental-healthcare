# 📧 Email Logic - Smart Dental Healthcare

## Tổng Quan Logic Gửi Email

Hệ thống gửi email tự động dựa trên các sự kiện liên quan đến lịch hẹn.

---

## 📬 Các Trường Hợp Gửi Email

### 1. 🆕 TẠO LỊCH HẸN MỚI (Appointment Created)

**Người Nhận**: BÁC SĨ duy nhất

**Template**: `appointment-new.hbs`

**Thời Điểm**: Ngay sau khi bệnh nhân đặt lịch thành công

**Nội Dung**:

- Thông báo có lịch hẹn mới từ bệnh nhân
- Thông tin bệnh nhân (tên, SĐT)
- Chi tiết lịch hẹn (ngày, giờ, hình thức, chi phí)
- Ghi chú từ bệnh nhân (nếu có)
- Nút "Xem Chi Tiết Lịch Hẹn" → `/doctor/schedule`
- Yêu cầu xác nhận trong vòng 24 giờ

**Lý Do**: Bác sĩ cần được thông báo kịp thời để xác nhận hoặc từ chối lịch hẹn

**Code Location**: `appointments.service.ts` - Line 271-276

```typescript
void this.emailService.sendNewAppointmentEmailToDoctor(
  populatedAppointment.toObject(),
  populatedAppointment.doctorId as any,
  populatedAppointment.patientId as any
);
```

---

### 2. ❌ HỦY LỊCH HẸN BỞI BỆNH NHÂN (Patient Cancels)

**Người Nhận**: BÁC SĨ duy nhất

**Template**: `appointment-cancelled.hbs`

**Thời Điểm**: Ngay sau khi bệnh nhân hủy lịch

**Hành Động Database**: XÓA appointment document hoàn toàn

**Nội Dung**:

- Thông báo lịch hẹn bị hủy
- Người hủy: Tên bệnh nhân
- Chi tiết lịch hẹn đã hủy
- Lý do hủy từ bệnh nhân
- Nút "Xem Danh Sách Lịch Hẹn" → `/doctor/schedule`

**Lý Do**: Bác sĩ cần biết để sắp xếp lại lịch trình

**Code Location**: `appointments.service.ts` - Line 577-583

```typescript
void this.emailService.sendCancellationEmail(
  appointmentData,
  appointment.doctorId as any,
  appointment.patientId as any,
  "patient", // cancelledBy
  reason
);
```

**Note**: Appointment bị xóa khỏi database để bệnh nhân có thể đặt lại slot đó

---

### 3. ❌ HỦY LỊCH HẸN BỞI BÁC SĨ (Doctor Cancels)

**Người Nhận**: BỆNH NHÂN duy nhất

**Template**: `appointment-cancelled.hbs`

**Thời Điểm**: Ngay sau khi bác sĩ hủy lịch

**Hành Động Database**: CẬP NHẬT status = 'cancelled' (GIỮ LẠI record)

**Nội Dung**:

- Thông báo lịch hẹn bị hủy
- Người hủy: Tên bác sĩ
- Chi tiết lịch hẹn đã hủy
- Lý do hủy từ bác sĩ
- Gợi ý: Đặt lịch mới, liên hệ hotline
- Nút "Xem Danh Sách Lịch Hẹn" → `/patient/appointments/my-appointments`

**Lý Do**: Bệnh nhân cần được thông báo và có thể đặt lịch khác

**Code Location**: `appointments.service.ts` - Line 599-605

```typescript
void this.emailService.sendCancellationEmail(
  appointmentData,
  appointment.doctorId as any,
  appointment.patientId as any,
  "doctor", // cancelledBy
  reason
);
```

**Note**: Appointment GIỮ LẠI trong database với status CANCELLED để tracking lịch sử

---

### 4. ✅ XÁC NHẬN LỊCH HẸN (Appointment Confirmed)

**Người Nhận**: KHÔNG GỬI EMAIL

**Lý Do**: Chỉ gửi notification qua socket real-time

**Alternative**: Có thể thêm email confirmation nếu cần trong tương lai

---

### 5. ✅ HOÀN THÀNH LỊCH HẸN (Appointment Completed)

**Người Nhận**: KHÔNG GỬI EMAIL

**Lý Do**: Chỉ gửi notification qua socket real-time

**Alternative**: Có thể thêm email summary/feedback request sau này

---

## 📊 Bảng Tóm Tắt

| Sự Kiện       | Gửi Cho   | Template              | DB Action                 | Socket |
| ------------- | --------- | --------------------- | ------------------------- | ------ |
| Tạo mới       | Bác sĩ    | appointment-new       | Create                    | ✅     |
| Bệnh nhân hủy | Bác sĩ    | appointment-cancelled | Delete                    | ✅     |
| Bác sĩ hủy    | Bệnh nhân | appointment-cancelled | Update (status=cancelled) | ✅     |
| Xác nhận      | -         | -                     | Update (status=confirmed) | ✅     |
| Hoàn thành    | -         | -                     | Update (status=completed) | ✅     |

---

## 🎯 Template Variables

### appointment-new.hbs (Cho Bác Sĩ)

```handlebars
{{doctorName}}
// Tên bác sĩ
{{patientName}}
// Tên bệnh nhân
{{patientPhone}}
// SĐT bệnh nhân
{{appointmentDate}}
// Ngày khám (VD: 14/10/2025)
{{startTime}}
// Giờ bắt đầu (VD: 09:30)
{{endTime}}
// Giờ kết thúc (VD: 10:00)
{{appointmentType}}
// Hình thức (VD: "Khám tại phòng khám")
{{consultationFee}}
// Chi phí (VD: "500,000")
{{notes}}
// Ghi chú từ bệnh nhân
{{viewUrl}}
// Link đến trang lịch khám
```

### appointment-cancelled.hbs (Universal)

```handlebars
{{recipientName}}
// Tên người nhận (bác sĩ hoặc bệnh nhân)
{{cancellerName}}
// Tên người hủy
{{isDoctor}}
// Boolean: true nếu recipient là bác sĩ
{{otherPartyName}}
// Tên người còn lại (bệnh nhân nếu gửi cho bác sĩ, ngược lại)
{{appointmentDate}}
// Ngày khám
{{startTime}}
// Giờ bắt đầu
{{endTime}}
// Giờ kết thúc
{{consultationFee}}
// Chi phí
{{reason}}
// Lý do hủy
{{viewUrl}}
// Link đến trang lịch khám
```

---

## 🔄 Flow Chi Tiết

### Flow 1: Bệnh Nhân Đặt Lịch

```
1. Patient POST /api/appointments
   ↓
2. appointments.service.create()
   ↓
3. Save appointment to MongoDB
   ↓
4. Populate doctor & patient info
   ↓
5. notificationGateway.notifyDoctorNewAppointment() → Socket
   ↓
6. emailService.sendNewAppointmentEmailToDoctor() → Email Queue
   ↓
7. MailerService process & send email
   ↓
8. Doctor receives:
   - Socket notification (instant)
   - Email notification (async)
```

### Flow 2: Bệnh Nhân Hủy Lịch

```
1. Patient DELETE /api/appointments/:id
   ↓
2. appointments.service.cancel(id, reason, 'patient')
   ↓
3. Find appointment & populate
   ↓
4. DELETE appointment document
   ↓
5. Sync follow-up record (cancelled: true)
   ↓
6. notificationGateway.notifyAppointmentCancelled(doctorId) → Socket
   ↓
7. emailService.sendCancellationEmail(..., 'patient') → Email
   ↓
8. Doctor receives notification
```

### Flow 3: Bác Sĩ Hủy Lịch

```
1. Doctor DELETE /api/appointments/:id
   ↓
2. appointments.service.cancel(id, reason, 'doctor')
   ↓
3. Find appointment & populate
   ↓
4. UPDATE appointment.status = 'cancelled'
   ↓
5. UPDATE appointment.cancellationReason = reason
   ↓
6. Save updated appointment
   ↓
7. Sync follow-up record (cancelled: true)
   ↓
8. notificationGateway.notifyAppointmentCancelled(patientId) → Socket
   ↓
9. emailService.sendCancellationEmail(..., 'doctor') → Email
   ↓
10. Patient receives notification
```

---

## 🎨 Email Design Principles

### Đã Áp Dụng (Theo register.hbs)

✅ Modern gradient header với icon emoji
✅ Responsive layout (max-width: 600px)
✅ Inline styles cho email compatibility
✅ Color scheme: Blue (#0ea5e9) cho primary, Red (#ef4444) cho cancel
✅ Structured sections với background colors
✅ Clear CTAs với gradient buttons
✅ Professional footer với contact info
✅ Copyright & disclaimer
✅ UTF-8 encoding

### Typography

- Font: 'Segoe UI', Arial, sans-serif
- Body: 16px, line-height: 1.6
- Headings: Bold, gradient colors
- Links: Primary color, no underline

### Spacing

- Section padding: 24-32px
- Element margins: 12-24px
- Consistent border-radius: 8-12px

---

## 🚀 Future Enhancements

### Email Xác Nhận Lịch Hẹn

- Template mới cho confirmed appointment
- Gửi cho cả bác sĩ và bệnh nhân
- Include: Calendar file (.ics), Google Calendar link

### Email Nhắc Nhở

- 24 giờ trước lịch hẹn
- 1 giờ trước lịch hẹn
- Template: appointment-reminder.hbs

### Email Hoàn Thành

- Sau khi hoàn thành lịch khám
- Yêu cầu feedback/rating
- Link đến medical record

### Email Digest

- Daily summary cho bác sĩ (lịch hẹn ngày mai)
- Weekly summary cho bệnh nhân (upcoming appointments)

### A/B Testing

- Test subject lines
- Test CTA button text
- Test email sending time

---

## 📈 Monitoring & Metrics

### Email Delivery Metrics

- Delivery rate (sent vs delivered)
- Open rate
- Click-through rate (CTA clicks)
- Bounce rate
- Spam complaints

### Appointment Metrics

- Email → Confirmation rate
- Email → Cancellation rate
- Average response time to appointment email

### Tools

- SendGrid/Mailgun analytics
- Custom database tracking
- Google Analytics UTM parameters

---

## 🔧 Technical Implementation

### Email Service Structure

```typescript
// appointment-email.service.ts

export class AppointmentEmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendNewAppointmentEmailToDoctor(appointment: any, doctor: any, patient: any) {
    const context = {
      doctorName: doctor.fullName,
      patientName: patient.fullName,
      patientPhone: patient.phone || "N/A",
      appointmentDate: format(new Date(appointment.appointmentDate), "dd/MM/yyyy"),
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      appointmentType: this.formatAppointmentType(appointment.appointmentType),
      consultationFee: appointment.consultationFee?.toLocaleString("vi-VN"),
      notes: appointment.notes || "",
      viewUrl: `${process.env.FRONTEND_URL}/doctor/schedule`,
    };

    await this.mailerService.sendMail({
      to: doctor.email,
      subject: `🦷 Lịch hẹn mới từ ${patient.fullName}`,
      template: "appointment-new",
      context,
    });
  }

  async sendCancellationEmail(
    appointment: any,
    doctor: any,
    patient: any,
    cancelledBy: "doctor" | "patient",
    reason: string
  ) {
    const isDoctor = cancelledBy === "patient"; // If patient cancelled, send to doctor
    const recipient = isDoctor ? doctor : patient;
    const canceller = isDoctor ? patient : doctor;
    const otherParty = isDoctor ? patient : doctor;

    const context = {
      recipientName: recipient.fullName,
      cancellerName: canceller.fullName,
      isDoctor,
      otherPartyName: otherParty.fullName,
      appointmentDate: format(new Date(appointment.appointmentDate), "dd/MM/yyyy"),
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      consultationFee: appointment.consultationFee?.toLocaleString("vi-VN"),
      reason,
      viewUrl: isDoctor
        ? `${process.env.FRONTEND_URL}/doctor/schedule`
        : `${process.env.FRONTEND_URL}/patient/appointments/my-appointments`,
    };

    await this.mailerService.sendMail({
      to: recipient.email,
      subject: `❌ Lịch hẹn đã bị hủy`,
      template: "appointment-cancelled",
      context,
    });
  }
}
```

---

## ✅ Testing Checklist

### Manual Testing

- [ ] Tạo lịch hẹn → Bác sĩ nhận email
- [ ] Bệnh nhân hủy → Bác sĩ nhận email
- [ ] Bác sĩ hủy → Bệnh nhân nhận email
- [ ] Email hiển thị đúng trên Gmail
- [ ] Email hiển thị đúng trên Outlook
- [ ] Email hiển thị đúng trên mobile
- [ ] Tiếng Việt không bị lỗi font
- [ ] Links hoạt động chính xác
- [ ] Email không rơi vào spam

### Automated Testing

```typescript
describe("AppointmentEmailService", () => {
  it("should send new appointment email to doctor", async () => {
    // Test logic
  });

  it("should send cancellation email to doctor when patient cancels", async () => {
    // Test logic
  });

  it("should send cancellation email to patient when doctor cancels", async () => {
    // Test logic
  });
});
```

---

**Last Updated**: January 2025
**Status**: ✅ Implemented & Documented
**Email Templates**: ✅ Updated with modern design
