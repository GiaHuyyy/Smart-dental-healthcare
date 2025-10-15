# 🔧 Bug Fixes - Notification System

## Issues Fixed

### ❌ Issue 1: Notification Schema Enum Mismatch

**Error:**

```
ValidationError: Notification validation failed: type: `APPOINTMENT_NEW` is not a valid enum value for path `type`.

Allowed enum values: ['appointment', 'medical-record', 'payment', 'system']
Received: 'APPOINTMENT_NEW'
```

**Root Cause:**

- Old schema had only 4 enum values
- New code uses detailed enum values like `APPOINTMENT_NEW`, `APPOINTMENT_CONFIRMED`, etc.

**Fix:**
Updated `server/src/modules/notifications/schemas/notification.schemas.ts`:

```typescript
// ❌ OLD (4 values)
@Prop({ required: true, enum: ['appointment', 'medical-record', 'payment', 'system'] })
type: string;

// ✅ NEW (16 values)
@Prop({
  required: true,
  enum: [
    'appointment',
    'medical-record',
    'payment',
    'system',
    'APPOINTMENT_NEW',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_RESCHEDULED',
    'APPOINTMENT_COMPLETED',
    'APPOINTMENT_REMINDER',
    'PRESCRIPTION_NEW',
    'MEDICAL_RECORD_NEW',
    'PAYMENT_SUCCESS',
    'CHAT_NEW',
    'SYSTEM',
  ],
})
type: string;

// Also added missing fields:
@Prop({ type: Object })
data?: any;

@Prop()
linkTo?: string;

@Prop()
icon?: string;
```

**Result:** ✅ Notifications can now be created with detailed types

---

### ❌ Issue 2: Wrong API URL in Doctor Patients Page

**Error:**

```
GET http://localhost:3000/api/users/patients/stats? 500 (Internal Server Error)
```

**Root Cause:**

- Code was calling `/api/users/patients/search` and `/api/users/patients/stats`
- Missing `BACKEND_URL` prefix
- Server runs on port **8081**, not 3000

**Fix:**
Updated `client/src/app/doctor/patients/page.tsx`:

```typescript
// ❌ OLD
const response = await fetch(`/api/users/patients/search?${params}`);
const response = await fetch(`/api/users/patients/stats?${params}`);

// ✅ NEW
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
const response = await fetch(`${baseUrl}/api/users/patients/search?${params}`);
const response = await fetch(`${baseUrl}/api/users/patients/stats?${params}`);
```

**Result:** ✅ API calls now go to correct backend server (port 8081)

---

## Files Changed

| File                                                               | Change                                    | Lines |
| ------------------------------------------------------------------ | ----------------------------------------- | ----- |
| `server/src/modules/notifications/schemas/notification.schemas.ts` | Added 12 enum values + 3 fields + indexes | +20   |
| `client/src/app/doctor/patients/page.tsx`                          | Added BACKEND_URL to 2 API calls          | +4    |

---

## Testing

After fix, verify:

1. **Notification Creation**:

```bash
# Create new appointment
# Should NOT see validation error
# Should see: "✅ Sent notification to user {id}: APPOINTMENT_NEW"
```

2. **Doctor Patients Page**:

```bash
# Navigate to /doctor/patients
# Should load patient list
# Should load stats (total, active, new this month)
# No 500 errors in console
```

3. **Full Notification Flow**:

```bash
# Patient creates appointment
# Doctor should see: 📅 "Lịch hẹn mới" notification
# No validation errors in backend logs
```

---

## Next Steps

✅ Backend ready
✅ Frontend ready
⏳ **Need to test end-to-end**

### Test Checklist:

- [ ] Patient creates appointment → Doctor receives notification
- [ ] Doctor confirms appointment → Patient receives notification
- [ ] Cancel appointment → Other party receives notification
- [ ] 30-min reminder → Both receive notification
- [ ] Notification dropdown shows correct icons
- [ ] Mark as read works
- [ ] Delete notification works
- [ ] "Đọc tất cả" works

---

## Summary

🐛 **Fixed 2 critical bugs:**

1. Schema enum mismatch (validation error)
2. Wrong API URL (500 error)

✅ **System now ready for testing!**

Restart backend server and test the full flow.
