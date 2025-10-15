# Appointment Reminder System - Testing Guide

## Overview

The appointment reminder system automatically sends **email + toast notifications** to both **doctor and patient** **30 minutes before** a confirmed appointment starts.

---

## System Architecture

### Backend Components

1. **AppointmentReminderService** (`server/src/modules/appointments/appointment-reminder.service.ts`)

   - Runs cron job every 5 minutes
   - Finds confirmed appointments starting in 30-35 minute window
   - Prevents duplicate sends using in-memory Set
   - Sends emails and socket events to both parties

2. **AppointmentEmailService** (`server/src/modules/appointments/appointment-email.service.ts`)

   - `sendReminderEmail()` method handles email delivery
   - Uses `appointment-reminder.hbs` template

3. **AppointmentNotificationGateway** (`server/src/modules/appointments/appointment-notification.gateway.ts`)

   - `sendAppointmentReminder()` emits 'appointment:reminder' socket event
   - Targets user's personal room: `user_${userId}`

4. **Email Template** (`server/src/mail/templates/appointment-reminder.hbs`)
   - Beautiful orange/amber gradient design
   - Dynamic content for doctor vs patient
   - Shows appointment details, preparation checklist, action button

### Frontend Components

1. **GlobalSocketContext** (`client/src/contexts/GlobalSocketContext.tsx`)
   - Listens for 'appointment:reminder' event
   - Shows toast notification with ⏰ icon
   - Duration: 10 seconds (longer for important reminders)
   - Action button: "Xem chi tiết" → redirects to schedule page

---

## Testing Checklist

### 1. Manual Reminder Test (Recommended First)

#### Backend Setup

```bash
cd server
npm run dev
```

#### Create Test Appointment

Use Postman or API client:

```http
POST /api/appointments
Authorization: Bearer {patient_token}
Content-Type: application/json

{
  "doctorId": "675c03bafdccf60acf7af0a6",
  "patientId": "{current_patient_id}",
  "appointmentDate": "2025-01-15",  // Today's date
  "startTime": "14:30",              // Any time
  "endTime": "15:00",
  "appointmentType": "Khám tổng quát",
  "reason": "Testing reminder system",
  "status": "confirmed"              // Must be confirmed!
}
```

#### Trigger Manual Reminder

```http
POST /api/appointments/{appointment_id}/test-reminder
```

#### Verify Results

**✅ Check Backend Logs:**

```
⏰ [AppointmentReminderService] Sending reminder for appointment: {id}
📧 Sending reminder email to doctor: Dr. {name}
📧 Sending reminder email to patient: {name}
🔔 Sending reminder socket to doctor: {doctorId}
🔔 Sending reminder socket to patient: {patientId}
```

**✅ Check Doctor Email:**

- Subject: "⏰ Nhắc nhở: Lịch hẹn sắp bắt đầu"
- Orange gradient header
- Content: "Bác sĩ {name}, lịch khám với bệnh nhân {patient} sắp bắt đầu trong 30 phút"
- Checklist: Chuẩn bị hồ sơ, thiết bị, v.v.
- Button: "Xem lịch khám"

**✅ Check Patient Email:**

- Subject: "⏰ Nhắc nhở: Lịch hẹn sắp bắt đầu"
- Orange gradient header
- Content: "{Patient name}, lịch hẹn với bác sĩ {doctor} sắp bắt đầu trong 30 phút"
- Checklist: Chuẩn bị tài liệu, đến sớm 10 phút, v.v.
- Button: "Xem chi tiết"

**✅ Check Doctor Toast:**

1. Login as doctor
2. Trigger manual reminder
3. Should see toast:
   - Icon: ⏰
   - Title: "Nhắc nhở lịch hẹn"
   - Description: "Lịch hẹn với bệnh nhân {name} sẽ bắt đầu lúc {time}"
   - Duration: 10 seconds
   - Action button: "Xem chi tiết" → /doctor/schedule

**✅ Check Patient Toast:**

1. Login as patient
2. Trigger manual reminder
3. Should see toast:
   - Icon: ⏰
   - Title: "Nhắc nhở lịch hẹn"
   - Description: "Lịch hẹn với bác sĩ {name} sẽ bắt đầu lúc {time}"
   - Duration: 10 seconds
   - Action button: "Xem chi tiết" → /patient/appointments/my-appointments

---

### 2. Automated Cron Test

#### Setup

```bash
# Backend must be running
cd server
npm run dev

# Frontend must be running
cd client
npm run dev

# Mobile (optional)
cd mobile
npm start
```

#### Create Appointment 32 Minutes in Future

**Calculate target time:**

```javascript
// Current time: 14:00
// Target: 14:32 (32 minutes from now)
// Reminder should trigger between 14:00-14:05 (next cron run)

// Or create for: current time + 33 minutes
// Example: If now is 10:15, create appointment for 10:48
```

**API Request:**

```http
POST /api/appointments
Authorization: Bearer {patient_token}
Content-Type: application/json

{
  "doctorId": "675c03bafdccf60acf7af0a6",
  "patientId": "{patient_id}",
  "appointmentDate": "2025-01-15",     // TODAY
  "startTime": "14:48",                 // Current time + 32-33 minutes
  "endTime": "15:18",
  "appointmentType": "Khám định kỳ",
  "reason": "Testing automated reminder",
  "status": "confirmed"                 // MUST be confirmed
}
```

#### Wait for Cron

- Cron runs **every 5 minutes**
- Check backend logs at next interval (e.g., 14:00, 14:05, 14:10, etc.)
- Should see:
  ```
  🔍 [AppointmentReminderService] Checking for reminders...
  ⏰ Found appointment starting in 30-35 minutes: {id}
  📧 Sending reminder emails...
  🔔 Sending socket notifications...
  ```

#### Verify

**✅ Both doctor and patient receive emails**
**✅ Both doctor and patient see toast (if connected to socket)**
**✅ No duplicate reminders sent (check logs for "Already sent")**

---

### 3. Edge Cases

#### Test Case: User Offline During Cron

- Doctor/patient not connected to socket
- **Expected**: Email still sent, toast not shown (user can check email later)

#### Test Case: Appointment Cancelled After Reminder Sent

- Create appointment → Send reminder → Cancel appointment
- **Expected**: Reminder already sent (cannot be unsent), but user sees cancellation notification too

#### Test Case: Multiple Appointments Same Time

- Create 2 appointments for same doctor at same time slot
- **Expected**: Both reminders sent separately

#### Test Case: Server Restart

- Send reminder → Restart server → Cron runs again
- **Expected**: Reminder may be sent again (sentReminders Set cleared on restart)
- **Note**: This is acceptable behavior, not a critical bug

#### Test Case: Appointment Rescheduled After Reminder

- Create appointment for 14:30 → Reminder sent at 14:00 → Reschedule to 16:00
- **Expected**: Original reminder still sent at 14:00, new reminder at 15:30

---

## Time Window Logic

### Why 30-35 Minutes?

```typescript
// Cron runs every 5 minutes: 10:00, 10:05, 10:10, etc.
// For appointment at 10:30:

// 10:00 run: 10:30 - 10:00 = 30 min ✅ IN WINDOW (30-35)
// 10:05 run: 10:30 - 10:05 = 25 min ❌ OUT OF WINDOW (< 30)

// This ensures each appointment is caught by exactly ONE cron run
```

### Example Timeline

| Current Time | Appointment Time | Time Until | Reminder Sent?       |
| ------------ | ---------------- | ---------- | -------------------- |
| 10:00        | 10:30            | 30 min     | ✅ YES               |
| 10:05        | 10:30            | 25 min     | ❌ NO (already sent) |
| 10:10        | 10:30            | 20 min     | ❌ NO                |
| 10:15        | 10:50            | 35 min     | ✅ YES               |
| 10:20        | 10:50            | 30 min     | ❌ NO (already sent) |

---

## Common Issues

### Issue: No Email Received

**Check:**

1. Appointment status is `"confirmed"` (not pending/completed/cancelled)
2. SMTP credentials configured in `server/.env`
3. Email addresses valid in doctor/patient records
4. Check server logs for email sending errors
5. Check spam folder

### Issue: No Toast Notification

**Check:**

1. User logged in to web/mobile app
2. Socket connected (check browser console for "✅ Global socket connected")
3. Frontend running on correct port (CORS configured)
4. Check browser console for "⏰ Appointment reminder received" log
5. Toast library (sonner) loaded correctly

### Issue: Duplicate Reminders

**Check:**

1. Server not restarted during test
2. Only one server instance running
3. Check logs for "Already sent reminder" message
4. Verify `sentReminders` Set working correctly

### Issue: Wrong Time Window

**Check:**

1. Server timezone matches expected timezone
2. Appointment date is TODAY (not past/future date)
3. startTime format correct: "HH:MM" (24-hour format)
4. Database appointment saved correctly

---

## Manual Testing Script (Node.js)

Create `test-reminder.js` in root:

```javascript
const axios = require("axios");

const API_URL = "http://localhost:8081/api";
const AUTH_TOKEN = "your_patient_token_here";

async function testReminder() {
  try {
    // 1. Create appointment 32 minutes from now
    const now = new Date();
    const appointmentTime = new Date(now.getTime() + 32 * 60000);

    const hours = appointmentTime.getHours().toString().padStart(2, "0");
    const minutes = appointmentTime.getMinutes().toString().padStart(2, "0");
    const startTime = `${hours}:${minutes}`;

    const year = appointmentTime.getFullYear();
    const month = (appointmentTime.getMonth() + 1).toString().padStart(2, "0");
    const day = appointmentTime.getDate().toString().padStart(2, "0");
    const appointmentDate = `${year}-${month}-${day}`;

    console.log(`Creating appointment for ${appointmentDate} at ${startTime}`);

    const response = await axios.post(
      `${API_URL}/appointments`,
      {
        doctorId: "675c03bafdccf60acf7af0a6",
        patientId: "your_patient_id",
        appointmentDate,
        startTime,
        endTime: `${hours}:${parseInt(minutes) + 30}`,
        appointmentType: "Khám tổng quát",
        reason: "Testing reminder",
        status: "confirmed",
      },
      {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      }
    );

    const appointmentId = response.data.data._id;
    console.log(`✅ Appointment created: ${appointmentId}`);

    // 2. Trigger manual reminder
    console.log("\nTriggering manual reminder...");
    await axios.post(`${API_URL}/appointments/${appointmentId}/test-reminder`);

    console.log("✅ Reminder sent! Check email and toast.");
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

testReminder();
```

Run:

```bash
node test-reminder.js
```

---

## Production Checklist

Before deploying to production:

- [ ] Test manual reminder with real doctor/patient accounts
- [ ] Test automated cron with real appointment times
- [ ] Verify email template renders correctly in Gmail, Outlook, Apple Mail
- [ ] Test socket connection on production domain (CORS configured)
- [ ] Confirm SMTP rate limits won't be exceeded
- [ ] Set up email delivery monitoring (bounce rate, spam complaints)
- [ ] Test timezone handling for international users
- [ ] Document reminder timing in user-facing help/FAQ
- [ ] Consider adding user preference: "Enable/disable reminder emails"
- [ ] Set up logging/monitoring for reminder failures

---

## Future Enhancements

- [ ] **Browser Push Notifications**: Request permission and send native notifications
- [ ] **SMS Reminders**: Integrate Twilio/SMS gateway for critical reminders
- [ ] **Sound Notification**: Play audio alert when toast appears
- [ ] **Customizable Timing**: Let users choose reminder time (15/30/60 minutes)
- [ ] **Multiple Reminders**: Send reminder at 24 hours + 30 minutes
- [ ] **Reminder History**: Track which reminders were sent in database
- [ ] **User Preferences**: Allow opt-out of email/toast reminders
- [ ] **Calendar Integration**: Add .ics file attachment to email
- [ ] **Mobile Push**: Send native push notifications to mobile app

---

## Contact

For issues or questions about the reminder system:

- Check backend logs in `server/` terminal
- Check frontend console in browser DevTools
- Review this guide and test manually first
- Check email service logs for delivery issues

Good luck testing! 🎉
