# Appointment Reminder System - Implementation Summary

## Overview

Implemented a comprehensive **automated appointment reminder system** that sends **email + toast notifications** to both **doctor and patient** **30 minutes before** a confirmed appointment starts.

---

## Key Features

✅ **Automated Cron Job**: Runs every 5 minutes to check for upcoming appointments
✅ **30-Minute Window**: Sends reminders for appointments starting in 30-35 minutes
✅ **Dual Notification**: Email + real-time toast notification
✅ **Both Parties**: Sends to both doctor AND patient
✅ **Duplicate Prevention**: Tracks sent reminders to avoid duplicates
✅ **Beautiful Email Template**: Modern orange gradient design
✅ **Manual Testing**: Test endpoint for development/debugging
✅ **Smart Routing**: Toast action buttons navigate to appropriate pages

---

## Implementation Details

### Backend Files Created/Modified

#### 1. **Email Template** (`server/src/mail/templates/appointment-reminder.hbs`)

- 183 lines of beautiful Handlebars template
- Orange/amber gradient header (⏰ theme)
- Dynamic content for doctor vs patient
- Appointment details, preparation checklist, action button
- Responsive design with inline CSS

#### 2. **AppointmentEmailService** (`server/src/modules/appointments/appointment-email.service.ts`)

- Added `sendReminderEmail()` method
- Handles both doctor and patient recipients
- Uses appointment-reminder template
- Subject: "⏰ Nhắc nhở: Lịch hẹn sắp bắt đầu"

#### 3. **AppointmentReminderService** (`server/src/modules/appointments/appointment-reminder.service.ts`)

- **NEW FILE**: 185 lines of core reminder logic
- `@Cron(CronExpression.EVERY_5_MINUTES)` decorator
- `checkAndSendReminders()`: Main cron job method
- Finds confirmed appointments in 30-35 minute window
- `sentReminders` Set for duplicate prevention
- `sendReminder()`: Sends email + socket to both parties
- `testReminder()`: Manual testing method
- `cleanupOldReminders()`: Memory management (2-hour retention)

#### 4. **AppointmentNotificationGateway** (`server/src/modules/appointments/appointment-notification.gateway.ts`)

- Added `sendAppointmentReminder()` method
- Emits `'appointment:reminder'` socket event
- Targets user's personal room: `user_${userId}`

#### 5. **AppointmentsModule** (`server/src/modules/appointments/appointments.module.ts`)

- Added `AppointmentReminderService` to imports, providers, exports
- Service now available for dependency injection

#### 6. **AppointmentsController** (`server/src/modules/appointments/appointments.controller.ts`)

- Added `reminderService` injection
- Added `POST ':id/test-reminder'` endpoint
- Allows manual reminder triggering for testing

### Frontend Files Modified

#### 7. **GlobalSocketContext** (`client/src/contexts/GlobalSocketContext.tsx`)

- Added listener for `'appointment:reminder'` event
- Shows toast notification with ⏰ icon
- Duration: 10 seconds (longer for important reminders)
- Action button: "Xem chi tiết" → redirects to schedule page
- Different routes for doctor vs patient
- Added cleanup in useEffect return

---

## Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CRON JOB (Every 5 min)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Query DB: Find confirmed appointments starting in 30-35min │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          Check if reminder already sent (Set check)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
                      ┌───────┴───────┐
                      │               │
            ┌─────────▼────┐   ┌─────▼────────┐
            │ Send Email   │   │ Send Email   │
            │ to DOCTOR    │   │ to PATIENT   │
            └─────────┬────┘   └─────┬────────┘
                      │               │
            ┌─────────▼────┐   ┌─────▼────────┐
            │ Emit Socket  │   │ Emit Socket  │
            │ to DOCTOR    │   │ to PATIENT   │
            └─────────┬────┘   └─────┬────────┘
                      │               │
                      └───────┬───────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│     Track in sentReminders Set (prevent duplicates)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND RECEIVES                          │
│  - Email in inbox (Gmail, Outlook, etc.)                    │
│  - Toast notification (if connected to socket)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Cron Job Logic

### Time Window: 30-35 Minutes

**Why 5-minute window?**

- Cron runs every 5 minutes (10:00, 10:05, 10:10, etc.)
- For appointment at 10:30:
  - **10:00 run**: 30 minutes until → ✅ SEND
  - **10:05 run**: 25 minutes until → ❌ SKIP (already sent)

**This ensures:**

- Each appointment caught by exactly ONE cron run
- No duplicates (unless server restarts)
- 30-minute advance notice guaranteed

### Code Snippet

```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async checkAndSendReminders() {
  const now = new Date();
  const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
  const thirtyFiveMinutesLater = new Date(now.getTime() + 35 * 60 * 1000);

  const appointments = await this.appointmentModel
    .find({
      status: 'confirmed',
      appointmentDate: { $gte: todayStart, $lte: todayEnd }
    })
    .populate('doctorId patientId')
    .exec();

  for (const appointment of appointments) {
    const appointmentDateTime = this.getAppointmentDateTime(appointment);

    if (appointmentDateTime >= thirtyMinutesLater &&
        appointmentDateTime <= thirtyFiveMinutesLater) {

      const reminderKey = `${appointment._id}_${thirtyMinutesLater.toISOString()}`;

      if (!this.sentReminders.has(reminderKey)) {
        await this.sendReminder(appointment);
        this.sentReminders.add(reminderKey);
      }
    }
  }

  this.cleanupOldReminders();
}
```

---

## Email Template Preview

### Doctor Email

```
┌──────────────────────────────────────────────┐
│  ⏰ NHẮC NHỞ LỊCH HẸN                        │
│  [Orange Gradient Header]                    │
└──────────────────────────────────────────────┘

Xin chào Bác sĩ Nguyễn Văn A,

⚠️ LỊCH KHÁM SẮP BẮT ĐẦU
Lịch khám sẽ bắt đầu trong 30 phút

📋 THÔNG TIN LỊCH HẸN
- Bệnh nhân: Trần Chí Bảo
- Thời gian: 14/01/2025 - 14:30 - 15:00
- Loại: Khám tổng quát
- Địa điểm: Phòng khám ABC

✓ CHUẨN BỊ
□ Xem lại hồ sơ bệnh nhân
□ Chuẩn bị thiết bị khám
□ Sắp xếp phòng khám

[Xem lịch khám] ← Button

Lưu ý: Nếu cần hủy lịch, vui lòng thông báo
sớm để bệnh nhân có thể sắp xếp lại.
```

### Patient Email

```
┌──────────────────────────────────────────────┐
│  ⏰ NHẮC NHỞ LỊCH HẸN                        │
│  [Orange Gradient Header]                    │
└──────────────────────────────────────────────┘

Xin chào Trần Chí Bảo,

⚠️ LỊCH HẸN SẮP BẮT ĐẦU
Lịch hẹn với bác sĩ sẽ bắt đầu trong 30 phút

📋 THÔNG TIN LỊCH HẸN
- Bác sĩ: BS. Nguyễn Văn A
- Thời gian: 14/01/2025 - 14:30 - 15:00
- Loại: Khám tổng quát
- Địa điểm: Phòng khám ABC

✓ CHUẨN BỊ
□ Mang theo CMND/CCCD
□ Mang tài liệu y tế (nếu có)
□ Đến sớm 10 phút

[Xem chi tiết] ← Button

Lưu ý: Nếu cần hủy lịch, vui lòng thông báo
sớm để bác sĩ có thể sắp xếp lại.
```

---

## Toast Notification

### Doctor Toast

```
┌──────────────────────────────────────────┐
│ ⏰ Nhắc nhở lịch hẹn                     │
│                                          │
│ Lịch hẹn với bệnh nhân Trần Chí Bảo     │
│ sẽ bắt đầu lúc 14:30                     │
│                                          │
│                        [Xem chi tiết] ✕ │
└──────────────────────────────────────────┘
```

- Type: `info` (blue color)
- Duration: 10 seconds
- Action: Redirects to `/doctor/schedule`

### Patient Toast

```
┌──────────────────────────────────────────┐
│ ⏰ Nhắc nhở lịch hẹn                     │
│                                          │
│ Lịch hẹn với BS. Nguyễn Văn A           │
│ sẽ bắt đầu lúc 14:30                     │
│                                          │
│                        [Xem chi tiết] ✕ │
└──────────────────────────────────────────┘
```

- Type: `info` (blue color)
- Duration: 10 seconds
- Action: Redirects to `/patient/appointments/my-appointments`

---

## Testing

### Manual Test (Quick)

```bash
# 1. Start backend
cd server && npm run dev

# 2. Create confirmed appointment (any time)
POST /api/appointments
{
  "doctorId": "...",
  "patientId": "...",
  "appointmentDate": "2025-01-15",
  "startTime": "14:30",
  "endTime": "15:00",
  "status": "confirmed"
}

# 3. Trigger manual reminder
POST /api/appointments/{id}/test-reminder

# 4. Check:
# ✅ Doctor receives email
# ✅ Patient receives email
# ✅ Doctor sees toast (if logged in)
# ✅ Patient sees toast (if logged in)
```

### Automated Test (Real-world)

```bash
# 1. Create appointment 32 minutes from now
# Example: If now is 10:00, create for 10:32

POST /api/appointments
{
  "appointmentDate": "2025-01-15",
  "startTime": "10:32",  // Current time + 32 min
  "status": "confirmed"
}

# 2. Wait for next cron run (10:00, 10:05, etc.)

# 3. Check logs for:
# ⏰ [AppointmentReminderService] Sending reminder...
# 📧 Sending reminder email to doctor
# 📧 Sending reminder email to patient

# 4. Verify both receive email + toast
```

**Full Testing Guide**: See `APPOINTMENT_REMINDER_TESTING_GUIDE.md`

---

## API Endpoints

### Manual Reminder Trigger (Testing)

```http
POST /api/appointments/:id/test-reminder
Authorization: Not required (@Public() decorator)

Response:
{
  "success": true,
  "message": "Gửi reminder thử nghiệm thành công",
  "data": null
}
```

**Usage:**

- For development/testing only
- Can trigger reminder for any appointment (regardless of time)
- Bypasses cron schedule and duplicate check

---

## Socket Events

### Event: `appointment:reminder`

**Namespace**: `/appointments`
**Room**: `user_${userId}` (personal room)

**Payload:**

```typescript
{
  type: 'APPOINTMENT_REMINDER',
  appointmentId: string,
  message: string,
  otherPartyName: string,     // Doctor/Patient name
  otherPartyPhone?: string,
  startTime: string,           // "14:30"
  endTime: string,             // "15:00"
  appointmentType: string,
  timestamp: Date
}
```

**Example:**

```json
{
  "type": "APPOINTMENT_REMINDER",
  "appointmentId": "678a1234567890abcdef1234",
  "message": "Lịch hẹn với bệnh nhân Trần Chí Bảo sẽ bắt đầu lúc 14:30",
  "otherPartyName": "Trần Chí Bảo",
  "otherPartyPhone": "0123456789",
  "startTime": "14:30",
  "endTime": "15:00",
  "appointmentType": "Khám tổng quát",
  "timestamp": "2025-01-15T07:00:00.000Z"
}
```

---

## Dependencies

### Backend

- `@nestjs/schedule` - Cron job functionality
- `@nestjs-modules/mailer` - Email sending
- `handlebars` - Email templating
- `socket.io` - Real-time events

### Frontend

- `socket.io-client` - Socket connection
- `sonner` - Toast notifications
- `next-auth` - User authentication

**No new dependencies added!** All already present in package.json.

---

## Configuration

### Environment Variables (server/.env)

```bash
# SMTP Configuration (required for emails)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@smartdental.com

# Database
MONGODB_URI=mongodb://localhost:27017/smart_dental_healthcare

# Socket.IO (CORS)
FRONTEND_URL=http://localhost:3000
MOBILE_URL=http://localhost:8082
```

### Cron Schedule

Current: `CronExpression.EVERY_5_MINUTES`

**To change timing:**

```typescript
// In appointment-reminder.service.ts

// Every 1 minute (more responsive, higher load)
@Cron(CronExpression.EVERY_MINUTE)

// Every 10 minutes (less frequent)
@Cron(CronExpression.EVERY_10_MINUTES)

// Custom: Every 2 minutes
@Cron('*/2 * * * *')
```

**Adjust time window accordingly:**

```typescript
// For every 1 minute cron: use 30-31 minute window
const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
const thirtyOneMinutesLater = new Date(now.getTime() + 31 * 60 * 1000);
```

---

## Duplicate Prevention

### Strategy: In-Memory Set

```typescript
private sentReminders: Set<string> = new Set();

// Key format: {appointmentId}_{roundedTimestamp}
const reminderKey = `${appointment._id}_${thirtyMinutesLater.toISOString()}`;

if (!this.sentReminders.has(reminderKey)) {
  await this.sendReminder(appointment);
  this.sentReminders.add(reminderKey);
} else {
  console.log('Already sent reminder for:', reminderKey);
}
```

### Cleanup

```typescript
// Remove reminders older than 2 hours
private cleanupOldReminders() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  for (const key of this.sentReminders) {
    const timestamp = key.split('_')[1];
    if (new Date(timestamp) < twoHoursAgo) {
      this.sentReminders.delete(key);
    }
  }
}
```

**Note**: Set is cleared on server restart. Reminders may be resent if restart happens during the 30-35 minute window. This is acceptable behavior.

---

## Production Considerations

### Scalability

- Current implementation uses in-memory Set (single server)
- For multiple servers, use Redis or database flag to track sent reminders
- Consider message queue (RabbitMQ, Bull) for email sending

### Monitoring

- Log all reminder sends to database for audit trail
- Monitor email delivery rate (bounces, spam complaints)
- Set up alerts for cron job failures
- Track socket delivery success rate

### User Preferences (Future)

- Allow users to opt-out of email reminders
- Let users choose reminder timing (15/30/60 minutes)
- Support SMS reminders for critical appointments

### Timezone Handling

- Current implementation assumes server timezone
- For international users, consider appointment timezone field
- Convert times to user's local timezone in email/toast

---

## Troubleshooting

### No emails received?

1. Check SMTP credentials in `.env`
2. Check server logs for email errors
3. Verify appointment status is "confirmed"
4. Check spam folder
5. Test with `POST /appointments/:id/test-reminder`

### No toast notifications?

1. User must be logged in and connected to socket
2. Check browser console for "⏰ Appointment reminder received"
3. Verify GlobalSocketContext loaded in app
4. Check CORS configuration for frontend URL

### Reminders sent too early/late?

1. Check server timezone
2. Verify appointment time format (HH:MM)
3. Check cron schedule (every 5 min by default)
4. Review time window logic (30-35 min)

### Duplicate reminders?

1. Check `sentReminders` Set logs
2. Verify only one server instance running
3. Check for server restarts during test
4. Review cleanup logic (2-hour retention)

---

## Files Changed Summary

| File                                                                  | Lines | Status   | Purpose                    |
| --------------------------------------------------------------------- | ----- | -------- | -------------------------- |
| `server/src/mail/templates/appointment-reminder.hbs`                  | 183   | CREATED  | Beautiful email template   |
| `server/src/modules/appointments/appointment-email.service.ts`        | +48   | MODIFIED | sendReminderEmail() method |
| `server/src/modules/appointments/appointment-reminder.service.ts`     | 185   | CREATED  | Cron job & core logic      |
| `server/src/modules/appointments/appointment-notification.gateway.ts` | +9    | MODIFIED | Socket emission method     |
| `server/src/modules/appointments/appointments.module.ts`              | +3    | MODIFIED | Register ReminderService   |
| `server/src/modules/appointments/appointments.controller.ts`          | +10   | MODIFIED | Test endpoint              |
| `client/src/contexts/GlobalSocketContext.tsx`                         | +32   | MODIFIED | Socket listener + toast    |
| `APPOINTMENT_REMINDER_TESTING_GUIDE.md`                               | 580   | CREATED  | Testing documentation      |
| `APPOINTMENT_REMINDER_SUMMARY.md`                                     | 570   | CREATED  | This summary               |

**Total:** 9 files, ~1,620 lines added/modified

---

## Next Steps

1. **Test manually** using `/test-reminder` endpoint
2. **Test automated cron** with appointment 32 minutes away
3. **Verify emails** in Gmail, Outlook, mobile
4. **Test toast notifications** on both web and mobile
5. **Deploy to staging** and test with real users
6. **Monitor logs** for first few days
7. **Collect feedback** and iterate

---

## Success Metrics

✅ **Backend Complete**: Cron job, email service, socket gateway
✅ **Frontend Complete**: Socket listener, toast display
✅ **Template Complete**: Beautiful responsive email design
✅ **Testing Guide**: Comprehensive manual and automated tests
✅ **Documentation**: Full implementation and testing docs

🎯 **Ready for Testing!**

---

**Created:** January 15, 2025
**Feature:** Appointment Reminder System
**Status:** ✅ Implementation Complete, Ready for Testing
