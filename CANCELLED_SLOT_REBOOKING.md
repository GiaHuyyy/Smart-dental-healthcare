# Cancelled Slot Rebooking - Implementation Guide

## Overview

This document explains how the system allows rebooking of cancelled appointment time slots while maintaining data integrity for active appointments and a clean calendar view.

## Problem Statement

Previously, the system had a unique index on `(doctorId, appointmentDate, startTime)` that prevented booking any time slot that was previously used, even if that appointment was cancelled. This created poor user experience as cancelled time slots remained "blocked" forever.

Additionally, displaying cancelled appointments on the calendar caused visual clutter and overlap with new appointments at the same time slot.

## Solution

Implemented a **two-pronged approach**:

1. **Database Level**: Partial unique index that only applies to active appointments
2. **UI Level**: Hide cancelled appointments from calendar view while keeping them in list/tab view

This ensures:

- ✅ Cancelled time slots can be rebooked
- ✅ Clean calendar without visual clutter
- ✅ Complete appointment history in list view
- ✅ Data integrity for active appointments

## Technical Implementation

### 1. Database Schema Changes

**File:** `server/src/modules/appointments/schemas/appointment.schemas.ts`

```typescript
AppointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "confirmed", "completed", "in-progress"] },
    },
  }
);
```

**Key Points:**

- Uses MongoDB's partial index feature
- Index only applies when status is one of: `pending`, `confirmed`, `completed`, `in-progress`
- Cancelled appointments are **excluded** from the unique constraint
- Allows multiple cancelled appointments at the same time slot
- Prevents duplicate active appointments at the same time slot

### 2. Migration Script

**File:** `server/scripts/drop-starttime-index.js`

This script:

1. Connects to MongoDB
2. Lists current indexes
3. Drops the old unique index (without partial filter)
4. Creates new partial unique index
5. Verifies the new index configuration

**Run Command:**

```bash
node server/scripts/drop-starttime-index.js
```

**Expected Output:**

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📋 Current indexes:
  - _id_: {"_id":1}
  - doctorId_1_appointmentDate_1_startTime_1: {"doctorId":1,"appointmentDate":1,"startTime":1}

🗑️  Dropping old index: doctorId_1_appointmentDate_1_startTime_1...
✅ Dropped index: doctorId_1_appointmentDate_1_startTime_1

🔨 Creating new partial unique index...
ℹ️  This index only applies to: pending, confirmed, completed, in-progress
ℹ️  Cancelled appointments are excluded from the unique constraint
✅ Created new partial unique index

📋 New indexes:
  - _id_: {"_id":1}
  - doctorId_1_appointmentDate_1_startTime_1: {"doctorId":1,"appointmentDate":1,"startTime":1}
    Partial filter: {"status":{"$in":["pending","confirmed","completed","in-progress"]}}

✅ Index migration completed successfully!
ℹ️  You can now book appointments at times that were previously cancelled.

🔌 Disconnected from MongoDB
```

### 3. Available Slots Logic

**File:** `server/src/modules/appointments/appointments.service.ts`

The `getAvailableSlots()` method excludes cancelled appointments when calculating available slots:

```typescript
const bookedAppointments = await this.appointmentModel
  .find({
    doctorId,
    appointmentDate: { $gte: targetDate, $lte: endDate },
    status: {
      $nin: [AppointmentStatus.CANCELLED], // Only exclude CANCELLED
    },
  })
  .select("startTime endTime")
  .lean();
```

This ensures:

- Cancelled slots appear as available
- Users can book at previously cancelled times
- Completed appointments still block overlapping bookings (to prevent double-booking)

### 4. Frontend Calendar Display

**File:** `client/src/app/doctor/schedule/page.tsx`

The frontend now separates calendar view and list view data:

```typescript
// Filter appointments for LIST view (shows ALL including cancelled)
const getFilteredAppointments = () => {
  if (selectedTab === "all") {
    return filterStatus === "all" ? appointments : appointments.filter((apt) => apt.status === filterStatus);
  }
  return appointments.filter((apt) => apt.status === selectedTab);
};

// Filter appointments for CALENDAR view
// Smart filtering: Show cancelled ONLY when viewing "Đã hủy" tab
const getCalendarAppointments = () => {
  const filtered = getFilteredAppointments();

  // If user is viewing "Đã hủy" tab, show cancelled appointments on calendar
  if (selectedTab === "cancelled") {
    return filtered;
  }

  // For other tabs, exclude cancelled appointments to keep calendar clean
  return filtered.filter((apt) => apt.status !== "cancelled");
};

const filteredAppointments = getFilteredAppointments(); // For list view
const calendarAppointments = getCalendarAppointments(); // For calendar view
```

**Result:**

- **Calendar View (Default/All tabs)**: Shows only active appointments (pending, confirmed, completed, in-progress)
- **Calendar View (Đã hủy tab)**: Shows cancelled appointments when specifically viewing this tab
- **List/Tab View**: Shows ALL appointments including cancelled for complete history
- **Prevents visual clutter**: No overlapping cancelled and active appointments on calendar
- Users can book at previously cancelled times
- Completed appointments still block overlapping bookings (to prevent double-booking)

## User Flows

### Scenario 1: Rebooking a Cancelled Slot

1. **Before:** Patient A books 16:00 slot → Status: `confirmed`
2. **User Action:** Patient A cancels → Status: `cancelled`
3. **Calendar View:** Cancelled appointment disappears from calendar (clean view)
4. **List View:** Cancelled appointment still visible in "Đã hủy" tab (history preserved)
5. **Result:** 16:00 slot becomes available in booking UI
6. **User Action:** Patient B books 16:00 slot → Status: `pending`
7. **Database:** Two appointments exist at 16:00 (one cancelled, one active)
8. **Calendar View:** Only shows Patient B's appointment (no overlap/clutter)
9. **List View:** Both appointments visible in their respective tabs

### Scenario 2: Preventing Double Booking

1. **State:** Patient A has 16:00 slot → Status: `confirmed`
2. **User Action:** Patient B tries to book 16:00 slot
3. **Result:** Error - slot is already taken
4. **Reason:** Unique index applies to active appointments

### Scenario 3: Multiple Cancellations at Same Time (Edge Case)

1. **Situation:** Multiple patients cancel appointments at 16:00
2. **Database:** Multiple cancelled records at same time (allowed by partial index)
3. **Calendar View (Default):** ✅ Clean - no cancelled appointments shown
4. **List View:** ✅ All cancelled appointments visible in history
5. **Booking View:** ✅ 16:00 shows as available slot
6. **New Booking:** ✅ Can book at 16:00 without conflict

### Scenario 4: Viewing Cancelled Appointments on Calendar

1. **User Action:** Click on "Đã hủy" tab (shows 3 cancelled appointments)
2. **User Action:** Click "Xem lịch" button to switch to calendar view
3. **Calendar View:** ✅ Shows all 3 cancelled appointments (user intentionally wants to see them)
4. **Calendar Display:** Red/pink colored events for cancelled status
5. **User Action:** Switch back to "Tất cả lịch hẹn" tab
6. **Calendar View:** ✅ Cancelled appointments hidden again (clean view)
7. **Reason:** Smart filtering based on selected tab

## Benefits

### User Experience

- ✅ Cancelled time slots are immediately available for rebooking
- ✅ No "ghost bookings" blocking available times
- ✅ Better calendar utilization
- ✅ Patients can rebook cancelled appointments
- ✅ **Clean calendar view** without visual clutter from cancelled appointments
- ✅ **No overlapping appointments** on calendar display
- ✅ **Complete history** still available in list/tab view

### Data Integrity

- ✅ Prevents duplicate active appointments
- ✅ Maintains historical record of cancelled appointments
- ✅ Database constraints ensure consistency
- ✅ No application-level checks needed for active appointments
- ✅ **Allows multiple cancelled records** at same time slot (historical tracking)

### Performance

- ✅ Index-level enforcement (fast)
- ✅ No need for complex queries to check availability
- ✅ Efficient slot lookup
- ✅ **Client-side filtering** for calendar view (minimal overhead)

## Status Hierarchy

| Status        | Included in Unique Index | Blocks Time Slot | Visible in Calendar (All tabs) | Visible in Calendar (Đã hủy tab) | Visible in List |
| ------------- | ------------------------ | ---------------- | ------------------------------ | -------------------------------- | --------------- |
| `pending`     | ✅ Yes                   | ✅ Yes           | ✅ Yes                         | ❌ No                            | ✅ Yes          |
| `confirmed`   | ✅ Yes                   | ✅ Yes           | ✅ Yes                         | ❌ No                            | ✅ Yes          |
| `completed`   | ✅ Yes                   | ✅ Yes           | ✅ Yes                         | ❌ No                            | ✅ Yes          |
| `in-progress` | ✅ Yes                   | ✅ Yes           | ✅ Yes                         | ❌ No                            | ✅ Yes          |
| `cancelled`   | ❌ No                    | ❌ No            | ❌ No (hidden)                 | ✅ Yes (shown)                   | ✅ Yes          |

**Note:** Calendar visibility is context-aware:

- When viewing "Tất cả", "Chờ xác nhận", "Đã xác nhận", "Đã hoàn thành" tabs → Cancelled appointments are hidden
- When viewing "Đã hủy" tab → Cancelled appointments are shown (user explicitly wants to see them)

## Migration Steps for Production

1. **Backup Database**

   ```bash
   mongodump --db smart_dental_healthcare --out backup/
   ```

2. **Run Migration Script**

   ```bash
   node server/scripts/drop-starttime-index.js
   ```

3. **Restart Backend Server**

   ```bash
   cd server
   npm run dev  # or pm2 restart if using pm2
   ```

4. **Verify Changes**
   - Check MongoDB indexes: `db.appointments.getIndexes()`
   - Test booking a cancelled slot
   - Verify error still occurs for double-booking active appointments

## Troubleshooting

### Issue: "Duplicate key error" persists after migration

**Cause:** Old index still exists in database

**Solution:**

```bash
# Connect to MongoDB
mongosh

# Switch to database
use smart_dental_healthcare

# Check existing indexes
db.appointments.getIndexes()

# Drop old index manually
db.appointments.dropIndex("doctorId_1_appointmentDate_1_startTime_1")

# Rerun migration script
```

### Issue: Script fails to connect to MongoDB

**Cause:** Connection string in .env is incorrect

**Solution:**

1. Check `server/.env` file
2. Verify `MONGODB_URI` value
3. Ensure MongoDB is running
4. Test connection: `mongosh <your-connection-string>`

### Issue: Multiple appointments at same cancelled time

**This is expected behavior!**

- Cancelled appointments don't block time slots
- Multiple cancelled appointments can exist at the same time
- Only one **active** appointment per time slot is allowed

## Related Files

- Schema: `server/src/modules/appointments/schemas/appointment.schemas.ts`
- Service: `server/src/modules/appointments/appointments.service.ts`
- Migration: `server/scripts/drop-starttime-index.js`
- Frontend: `client/src/app/doctor/schedule/page.tsx` (calendar filtering)
- Documentation: `CALENDAR_TAB_VIEW_REQUIREMENTS.md`

## Testing Checklist

### Database & Backend

- [ ] Run migration script successfully
- [ ] Verify partial index created with correct filter
- [ ] Check index using `db.appointments.getIndexes()`

### Booking Flow

- [ ] Cancel an existing appointment
- [ ] Verify cancelled slot shows as available in booking UI
- [ ] Book a new appointment at the previously cancelled time
- [ ] Verify booking succeeds without duplicate key error
- [ ] Try to book same time slot again (should fail - slot taken)

### Calendar Display

- [ ] **Cancel an appointment and check calendar view (default tabs)**
- [ ] Verify cancelled appointment **disappears** from calendar
- [ ] Book new appointment at same time
- [ ] Verify only new appointment shows (no overlap with cancelled)
- [ ] Check calendar remains clean with multiple cancelled appointments

### Calendar Display - Đã hủy Tab (NEW)

- [ ] **Click on "Đã hủy" tab** to view cancelled appointments
- [ ] Verify list view shows all cancelled appointments
- [ ] **Click "Xem lịch" button** to switch to calendar view
- [ ] Verify cancelled appointments **are now visible** on calendar
- [ ] Check cancelled events display with correct styling (red/pink)
- [ ] **Switch to "Tất cả lịch hẹn" tab**
- [ ] Verify cancelled appointments **disappear** from calendar again
- [ ] **Switch back to "Đã hủy" tab and view calendar**
- [ ] Verify cancelled appointments **reappear** on calendar
- [ ] Verify only new appointment shows (no overlap with cancelled)
- [ ] Check calendar remains clean with multiple cancelled appointments

### List/Tab View

- [ ] Navigate to list view or click "Đã hủy" tab
- [ ] Verify cancelled appointment **is visible** in list
- [ ] Check all cancelled appointments appear with correct status badge
- [ ] Verify "Tất cả lịch hẹn" tab shows both active and cancelled

### Edge Cases

- [ ] Cancel multiple appointments at same time slot
- [ ] Verify all cancelled appointments visible in list
- [ ] Verify calendar stays clean (no overlapping cancelled events)
- [ ] Book new appointment at that time - should succeed
- [ ] Check cancelled appointment NOT visible in calendar view

## Date Implemented

October 13, 2025

## Contributors

- Backend: Partial index implementation
- Database: Index migration script
- Documentation: This guide
