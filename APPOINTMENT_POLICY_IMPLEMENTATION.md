# Implementation Plan: Appointment Policy & Billing

## Overview

Triển khai đầy đủ các luồng quản lý lịch hẹn theo chính sách mới với billing, refund và notifications.

## Phase 1: Backend - Billing Service Enhancement

### 1.1 Payment/Bill Schema Updates

**File**: `server/src/modules/payments/schemas/payment.schema.ts`

Thêm các fields mới:

```typescript
export enum BillType {
  CONSULTATION_FEE = 'consultation_fee',
  REFUND = 'refund',
  RESERVATION_FEE = 'reservation_fee',  // Phí giữ chỗ 100k
  CANCELLATION_CHARGE = 'cancellation_charge',
}

export enum RefundStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Thêm vào Payment Schema:
billType: { type: String, enum: Object.values(BillType), required: true },
relatedPaymentId: { type: Schema.Types.ObjectId, ref: 'Payment' }, // Link đến payment gốc
refundStatus: { type: String, enum: Object.values(RefundStatus) },
```

### 1.2 Voucher Schema (Mới)

**File**: `server/src/modules/vouchers/schemas/voucher.schema.ts`

```typescript
export enum VoucherType {
  PERCENTAGE_DISCOUNT = "percentage",
  FIXED_AMOUNT = "fixed",
}

export enum VoucherReason {
  DOCTOR_CANCELLATION = "doctor_cancellation",
  FOLLOW_UP_DISCOUNT = "follow_up",
}

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ type: Schema.Types.ObjectId, ref: "User", required: true })
  patientId: string;

  @Prop({ required: true })
  code: string; // Auto-generated unique code

  @Prop({ type: String, enum: Object.values(VoucherType), required: true })
  type: VoucherType;

  @Prop({ required: true })
  value: number; // 5 for 5%, or fixed amount

  @Prop({ type: String, enum: Object.values(VoucherReason) })
  reason: VoucherReason;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ type: Date })
  usedAt: Date;

  @Prop({ type: Schema.Types.ObjectId, ref: "Appointment" })
  relatedAppointmentId: string;
}
```

### 1.3 Appointment Schema Updates

**File**: `server/src/modules/appointments/schemas/appointment.schema.ts`

```typescript
// Thêm vào Appointment Schema:
cancellationReason: String,
cancelledBy: { type: String, enum: ['doctor', 'patient'] },
cancellationFeeCharged: { type: Boolean, default: false },
cancellationFeeAmount: Number,
doctorCancellationReason: {
  type: String,
  enum: ['emergency', 'patient_late'], // emergency = đột xuất, patient_late = trễ 15p
},
isFollowUp: { type: Boolean, default: false },
followUpParentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
followUpDiscount: { type: Number, default: 0 }, // 5% for follow-up
appliedVoucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
```

## Phase 2: Backend - Business Logic Services

### 2.1 Billing Helper Service (Mới)

**File**: `server/src/modules/payments/billing-helper.service.ts`

```typescript
@Injectable()
export class BillingHelperService {
  // Tạo bill phí giữ chỗ cho bác sĩ
  async createReservationFeeForDoctor(
    appointmentId: string,
    doctorId: string,
    amount: number = 100000
  ): Promise<Payment> {
    // Logic tạo bill cộng tiền cho doctor
  }

  // Tạo bill trừ phí giữ chỗ cho bệnh nhân
  async chargeReservationFeeFromPatient(
    appointmentId: string,
    patientId: string,
    amount: number = 100000
  ): Promise<Payment> {
    // Logic tạo bill trừ tiền patient
  }

  // Hoàn tiền consultation fee cho bệnh nhân
  async refundConsultationFee(
    originalPaymentId: string,
    appointmentId: string,
    patientId: string,
    amount: number
  ): Promise<Payment> {
    // Tạo bill type REFUND
    // Link với originalPaymentId
    // Cộng tiền vào wallet patient
  }

  // Kiểm tra xem appointment có payment chưa
  async hasExistingPayment(appointmentId: string): Promise<boolean> {
    // Query payment collection
  }

  // Lấy payment gốc của appointment
  async getOriginalPayment(appointmentId: string): Promise<Payment | null> {
    // Query payment where billType = CONSULTATION_FEE
  }
}
```

### 2.2 Voucher Service (Mới)

**File**: `server/src/modules/vouchers/vouchers.service.ts`

```typescript
@Injectable()
export class VouchersService {
  // Tạo voucher giảm 5% cho bệnh nhân
  async createDoctorCancellationVoucher(patientId: string, appointmentId: string): Promise<Voucher> {
    const code = this.generateUniqueCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // Hết hạn sau 90 ngày

    return this.voucherModel.create({
      patientId,
      code,
      type: VoucherType.PERCENTAGE_DISCOUNT,
      value: 5,
      reason: VoucherReason.DOCTOR_CANCELLATION,
      expiresAt,
      relatedAppointmentId: appointmentId,
    });
  }

  // Tạo voucher follow-up 5%
  async createFollowUpVoucher(patientId: string, parentAppointmentId: string): Promise<Voucher> {
    // Similar logic với reason = FOLLOW_UP_DISCOUNT
  }

  // Validate và apply voucher
  async applyVoucher(
    voucherCode: string,
    patientId: string,
    originalAmount: number
  ): Promise<{ discountedAmount: number; voucherId: string }> {
    // Logic validate voucher
    // Calculate discount
    // Mark as used
  }

  private generateUniqueCode(): string {
    // Generate unique 8-character code
    return `DENTAL${Date.now().toString().slice(-6)}`;
  }
}
```

### 2.3 Appointments Service Updates

**File**: `server/src/modules/appointments/appointments.service.ts`

#### 2.3.1 Reschedule với phí giữ chỗ

```typescript
async rescheduleAppointment(
  id: string,
  newDate: Date,
  newTime: string,
  userId: string,
) {
  const appointment = await this.appointmentModel.findById(id);

  // Kiểm tra thời gian còn lại
  const now = new Date();
  const appointmentDateTime = new Date(appointment.appointmentDate);
  const [hours, minutes] = appointment.startTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

  const minutesUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);

  const isNearTime = minutesUntilAppointment < 30;

  if (isNearTime) {
    // Tính phí giữ chỗ
    await this.billingHelperService.createReservationFeeForDoctor(
      id,
      appointment.doctorId,
      100000,
    );

    await this.billingHelperService.chargeReservationFeeFromPatient(
      id,
      appointment.patientId,
      100000,
    );

    appointment.cancellationFeeCharged = true;
    appointment.cancellationFeeAmount = 100000;
  }

  // Update appointment date/time
  appointment.appointmentDate = newDate;
  appointment.startTime = newTime;

  await appointment.save();

  // Send notifications
  await this.sendRescheduleNotifications(appointment, isNearTime);

  return appointment;
}
```

#### 2.3.2 Cancel với refund logic

```typescript
async cancelAppointment(
  id: string,
  reason: string,
  cancelledBy: 'doctor' | 'patient',
  doctorCancellationReason?: 'emergency' | 'patient_late',
) {
  const appointment = await this.appointmentModel.findById(id);

  const now = new Date();
  const appointmentDateTime = new Date(appointment.appointmentDate);
  const [hours, minutes] = appointment.startTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

  const minutesUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);
  const isNearTime = minutesUntilAppointment < 30;

  // Logic theo cancelledBy
  if (cancelledBy === 'patient') {
    // Bệnh nhân hủy
    if (isNearTime) {
      // Trừ phí giữ chỗ
      await this.billingHelperService.createReservationFeeForDoctor(
        id,
        appointment.doctorId,
        100000,
      );

      await this.billingHelperService.chargeReservationFeeFromPatient(
        id,
        appointment.patientId,
        100000,
      );

      appointment.cancellationFeeCharged = true;
      appointment.cancellationFeeAmount = 100000;
    }

    // Hoàn 100% phí khám (nếu đã thanh toán)
    const hasPayment = await this.billingHelperService.hasExistingPayment(id);
    if (hasPayment) {
      const originalPayment = await this.billingHelperService.getOriginalPayment(id);
      await this.billingHelperService.refundConsultationFee(
        originalPayment._id,
        id,
        appointment.patientId,
        originalPayment.amount,
      );
    }

  } else if (cancelledBy === 'doctor') {
    // Bác sĩ hủy
    if (doctorCancellationReason === 'emergency') {
      // Đột xuất: Hoàn 100% + Voucher 5%
      const hasPayment = await this.billingHelperService.hasExistingPayment(id);
      if (hasPayment) {
        const originalPayment = await this.billingHelperService.getOriginalPayment(id);
        await this.billingHelperService.refundConsultationFee(
          originalPayment._id,
          id,
          appointment.patientId,
          originalPayment.amount,
        );
      }

      // Tạo voucher 5%
      await this.vouchersService.createDoctorCancellationVoucher(
        appointment.patientId,
        id,
      );

    } else if (doctorCancellationReason === 'patient_late') {
      // Bệnh nhân trễ 15p: Trừ phí 100k + Hoàn 100% phí khám
      await this.billingHelperService.createReservationFeeForDoctor(
        id,
        appointment.doctorId,
        100000,
      );

      await this.billingHelperService.chargeReservationFeeFromPatient(
        id,
        appointment.patientId,
        100000,
      );

      appointment.cancellationFeeCharged = true;
      appointment.cancellationFeeAmount = 100000;

      // Hoàn phí khám
      const hasPayment = await this.billingHelperService.hasExistingPayment(id);
      if (hasPayment) {
        const originalPayment = await this.billingHelperService.getOriginalPayment(id);
        await this.billingHelperService.refundConsultationFee(
          originalPayment._id,
          id,
          appointment.patientId,
          originalPayment.amount,
        );
      }
    }
  }

  // Update appointment status
  appointment.status = AppointmentStatus.CANCELLED;
  appointment.cancellationReason = reason;
  appointment.cancelledBy = cancelledBy;
  appointment.doctorCancellationReason = doctorCancellationReason;

  await appointment.save();

  // Send notifications
  await this.sendCancellationNotifications(appointment, cancelledBy, doctorCancellationReason);

  return appointment;
}
```

#### 2.3.3 Create Follow-up Appointment

```typescript
async createFollowUpAppointment(
  parentAppointmentId: string,
  doctorId: string,
  patientId: string,
  suggestedDate?: Date,
  notes?: string,
) {
  // Tạo appointment với status = PENDING (chờ bệnh nhân xác nhận)
  const followUpAppointment = await this.appointmentModel.create({
    doctorId,
    patientId,
    isFollowUp: true,
    followUpParentId: parentAppointmentId,
    followUpDiscount: 5, // 5%
    status: AppointmentStatus.PENDING,
    appointmentType: 'Tái khám',
    // Không set appointmentDate/startTime ngay
    // Chờ bệnh nhân chọn
  });

  // Send notification to patient
  await this.sendFollowUpSuggestionNotification(followUpAppointment);

  return followUpAppointment;
}

async confirmFollowUpAppointment(
  followUpId: string,
  selectedDate: Date,
  selectedTime: string,
  patientId: string,
) {
  const appointment = await this.appointmentModel.findById(followUpId);

  if (!appointment.isFollowUp) {
    throw new BadRequestException('Not a follow-up appointment');
  }

  // Update với date/time đã chọn
  appointment.appointmentDate = selectedDate;
  appointment.startTime = selectedTime;
  appointment.status = AppointmentStatus.CONFIRMED;

  await appointment.save();

  // Send notification to doctor
  await this.sendFollowUpConfirmedNotification(appointment);

  return appointment;
}
```

## Phase 3: Backend - Notification Service Updates

### 3.1 Email Templates

**Folder**: `server/src/mail/templates/`

Tạo các template mới:

- `appointment-reschedule-near-time.hbs` - Đổi lịch cận giờ
- `appointment-cancel-near-time.hbs` - Hủy lịch cận giờ
- `appointment-refund-confirmation.hbs` - Xác nhận hoàn tiền
- `doctor-cancellation-emergency.hbs` - Bác sĩ hủy đột xuất
- `doctor-cancellation-patient-late.hbs` - Hủy vì bệnh nhân trễ
- `follow-up-suggestion.hbs` - Đề xuất tái khám
- `follow-up-confirmed.hbs` - Xác nhận tái khám
- `voucher-issued.hbs` - Thông báo nhận voucher

### 3.2 Notification Gateway Updates

**File**: `server/src/modules/notifications/notifications.gateway.ts`

Thêm event types mới:

```typescript
export enum NotificationType {
  // ... existing
  APPOINTMENT_RESCHEDULE_NEAR_TIME = "appointment_reschedule_near_time",
  APPOINTMENT_CANCEL_NEAR_TIME = "appointment_cancel_near_time",
  APPOINTMENT_REFUND = "appointment_refund",
  DOCTOR_CANCELLATION = "doctor_cancellation",
  FOLLOW_UP_SUGGESTION = "follow_up_suggestion",
  FOLLOW_UP_CONFIRMED = "follow_up_confirmed",
  VOUCHER_ISSUED = "voucher_issued",
}
```

## Phase 4: Frontend - Patient UI

### 4.1 Reschedule Modal Component

**File**: `client/src/components/appointments/RescheduleModal.tsx`

```typescript
export function RescheduleModal({ appointment, open, onClose }) {
  const [showNearTimeWarning, setShowNearTimeWarning] = useState(false);

  useEffect(() => {
    // Calculate minutes until appointment
    const minutesUntil = calculateMinutesUntil(appointment);
    setShowNearTimeWarning(minutesUntil < 30);
  }, [appointment]);

  if (showNearTimeWarning) {
    return (
      <WarningModal
        title="Đổi lịch cận giờ"
        message="Đổi lịch lúc này sẽ bị trừ 100.000đ phí giữ chỗ"
        onConfirm={() => proceedWithReschedule()}
        onCancel={onClose}
      />
    );
  }

  // Normal reschedule flow
  return <DateTimePicker ... />;
}
```

### 4.2 Cancel Modal Component

**File**: `client/src/components/appointments/CancelModal.tsx`

Similar structure with near-time warning.

### 4.3 Follow-up Tab

**File**: `client/src/app/patient/my-appointments/page.tsx`

Thêm tab "Lịch tái khám":

- List appointments where `isFollowUp = true` và `status = PENDING`
- 3 buttons: "Lên lịch tái khám", "Từ chối", "Chi tiết"
- Modal chọn ngày giờ khi click "Lên lịch tái khám"
- Hiển thị "Giảm 5%" prominently

## Phase 5: Frontend - Doctor UI

### 5.1 Follow-up Button in Appointment Detail

**File**: `client/src/components/appointments/AppointmentDetailModal.tsx` (hoặc tương tự)

Thêm button "Tái khám":

- Chỉ hiện khi appointment status = COMPLETED
- Click -> Modal nhập ghi chú và ngày đề xuất (optional)
- Submit -> Call API tạo follow-up appointment

### 5.2 Doctor Cancel Modal với Reason Select

**File**: `client/src/components/appointments/DoctorCancelModal.tsx`

```typescript
export function DoctorCancelModal({ appointment, open, onClose }) {
  const [reason, setReason] = useState<"emergency" | "patient_late">("emergency");
  const [additionalNotes, setAdditionalNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Hủy lịch hẹn</DialogTitle>
        <Select value={reason} onValueChange={setReason}>
          <SelectItem value="emergency">Lý do đột xuất (Phòng khám có việc)</SelectItem>
          <SelectItem value="patient_late">Bệnh nhân đến trễ 15 phút</SelectItem>
        </Select>

        {reason === "emergency" && <Alert>Bệnh nhân sẽ được hoàn 100% phí khám và nhận voucher giảm 5%</Alert>}

        {reason === "patient_late" && (
          <Alert variant="destructive">Bệnh nhân sẽ bị trừ 100.000đ phí giữ chỗ nhưng được hoàn 100% phí khám</Alert>
        )}

        <Textarea
          placeholder="Ghi chú thêm (không bắt buộc)"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
        />

        <Button onClick={handleCancel}>Xác nhận hủy</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### 5.3 Confirmed Tab - Add Cancel Button

**File**: `client/src/app/doctor/schedule/page.tsx` (hoặc tương tự)

Trong tab "Đã xác nhận", thêm button "Hủy lịch" cho mỗi appointment.

## Phase 6: API Endpoints

### New/Updated Endpoints

```
POST   /api/v1/appointments/:id/reschedule
Body: { newDate, newTime }
Response: { appointment, feeCharged: boolean, feeAmount?: number }

DELETE /api/v1/appointments/:id/cancel
Body: {
  reason: string,
  cancelledBy: 'doctor' | 'patient',
  doctorCancellationReason?: 'emergency' | 'patient_late'
}
Response: {
  appointment,
  refunded: boolean,
  refundAmount?: number,
  feeCharged: boolean,
  voucherIssued?: Voucher
}

POST   /api/v1/appointments/:id/follow-up
Body: { suggestedDate?, notes? }
Response: { followUpAppointment }

POST   /api/v1/appointments/:id/confirm-follow-up
Body: { selectedDate, selectedTime }
Response: { appointment, discountApplied: 5 }

GET    /api/v1/appointments/patient/:patientId/follow-ups
Response: { followUpAppointments[] }

GET    /api/v1/vouchers/patient/:patientId
Response: { vouchers[] }

POST   /api/v1/vouchers/apply
Body: { code, appointmentId }
Response: { discountedAmount, voucherId }
```

## Phase 7: Testing Checklist

### Patient Flow Tests

- [ ] Đặt lịch trước 1 giờ - OK
- [ ] Đặt lịch trong vòng 1 giờ - Blocked
- [ ] Đổi lịch trước 30 phút - Miễn phí
- [ ] Đổi lịch trong 30 phút - Hiện warning, trừ 100k
- [ ] Hủy lịch trước 30 phút (chưa thanh toán) - OK
- [ ] Hủy lịch trước 30 phút (đã thanh toán) - Hoàn 100%
- [ ] Hủy lịch trong 30 phút (chưa thanh toán) - Trừ 100k
- [ ] Hủy lịch trong 30 phút (đã thanh toán) - Trừ 100k + Hoàn phí khám
- [ ] Hủy lịch từ tab "Đã xác nhận" - OK với các điều kiện trên

### Doctor Flow Tests

- [ ] Lên lịch tái khám sau khi hoàn thành - Tạo follow-up pending
- [ ] Follow-up hiển thị trong tab "Chờ xác nhận"
- [ ] Hủy lịch - Lý do đột xuất → Hoàn 100% + Voucher 5%
- [ ] Hủy lịch - Bệnh nhân trễ → Trừ 100k + Hoàn phí khám
- [ ] Follow-up appointment được confirm → Vào calendar

### Follow-up Flow Tests

- [ ] Bệnh nhân thấy tab "Lịch tái khám"
- [ ] Click "Lên lịch tái khám" → Chọn ngày giờ
- [ ] Hiển thị giảm giá 5%
- [ ] Xác nhận → Bác sĩ nhận notification
- [ ] Follow-up vào calendar bác sĩ
- [ ] Click "Từ chối" → Follow-up bị reject

### Billing Tests

- [ ] Bill phí giữ chỗ được tạo cho doctor
- [ ] Bill trừ phí được tạo cho patient
- [ ] Bill refund được tạo với link đến payment gốc
- [ ] Wallet balance được update đúng
- [ ] Voucher được tạo với code unique
- [ ] Voucher apply được giảm giá đúng 5%
- [ ] Voucher không dùng lại được sau khi đã apply

### Notification Tests

- [ ] Realtime notification via Socket.IO
- [ ] Email gửi đến đúng người (patient/doctor)
- [ ] Notification hiển thị trong Notification Center
- [ ] Badge count update realtime

## Implementation Priority

**Week 1**: Backend Foundation

- Day 1-2: Schema updates (Payment, Voucher, Appointment)
- Day 3-4: BillingHelperService
- Day 5-7: VouchersService

**Week 2**: Backend Business Logic

- Day 1-3: Update reschedule/cancel methods
- Day 4-5: Follow-up appointment logic
- Day 6-7: Notification service updates

**Week 3**: Frontend - Patient

- Day 1-2: Reschedule modal với warning
- Day 3-4: Cancel modal với warning
- Day 5-7: Follow-up tab

**Week 4**: Frontend - Doctor + Testing

- Day 1-2: Follow-up button in appointment detail
- Day 3-4: Doctor cancel modal với reason select
- Day 5-7: End-to-end testing

## Notes

- Tất cả số tiền hardcode 100.000đ có thể extract thành constant `RESERVATION_FEE_AMOUNT`
- Giảm giá 5% cho follow-up và voucher có thể extract thành `DISCOUNT_PERCENTAGE`
- Cần thêm migration script nếu có appointments cũ trong database
- Cân nhắc thêm admin dashboard để xem thống kê refund, cancellation fees
- Có thể thêm rate limiting cho reschedule/cancel để tránh abuse
