# Quick Summary: Cancelled Slot Rebooking

## Problem

When appointments were cancelled, the time slots remained "blocked" forever due to a database unique index. Additionally, displaying cancelled appointments on the calendar caused visual clutter and overlapping with new appointments.

## Solution

**Two-layer approach:**

### 1. Database Layer (Backend)

✅ **Partial Unique Index** - Only applies to active appointments

```typescript
// server/src/modules/appointments/schemas/appointment.schemas.ts
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

### 2. Frontend Layer (UI)

✅ **Smart Filtering** - Context-aware calendar display

```typescript
// client/src/app/doctor/schedule/page.tsx

// For List View - shows ALL including cancelled
const filteredAppointments = getFilteredAppointments();

// For Calendar View - smart filtering based on selected tab
const getCalendarAppointments = () => {
  const filtered = getFilteredAppointments();

  // Show cancelled ONLY when viewing "Đã hủy" tab
  if (selectedTab === "cancelled") {
    return filtered;
  }

  // Hide cancelled for other tabs
  return filtered.filter((apt) => apt.status !== "cancelled");
};
```

## Result

| View                      | Behaviour                                                 |
| ------------------------- | --------------------------------------------------------- |
| **Calendar (All tabs)**   | ❌ Cancelled appointments hidden (clean view, no overlap) |
| **Calendar (Đã hủy tab)** | ✅ Cancelled appointments shown (user wants to see them)  |
| **List/Tabs**             | ✅ Cancelled appointments visible (complete history)      |
| **Booking**               | ✅ Cancelled slots available for rebooking                |
| **Database**              | ✅ Multiple cancelled records allowed at same time        |

## Quick Test

1. Create appointment at 16:00 → Status: `confirmed`
2. Cancel it → Status: `cancelled`
3. **Check calendar (Tất cả tab):** Appointment disappears ✅
4. **Check list view:** Appointment still visible ✅
5. **Click "Đã hủy" tab → Click "Xem lịch":** Cancelled appointment now visible on calendar ✅
6. **Switch to "Tất cả" tab:** Cancelled appointment disappears again ✅
7. Try booking new appointment at 16:00
8. **Result:** Booking succeeds ✅
9. **Calendar shows:** Only the new appointment (no overlap) ✅

## Migration Command

```bash
node server/scripts/drop-starttime-index.js
```

Then restart backend server.

## Files Modified

- `server/src/modules/appointments/schemas/appointment.schemas.ts` - Partial index
- `server/scripts/drop-starttime-index.js` - Migration script
- `client/src/app/doctor/schedule/page.tsx` - Calendar filtering
- `CANCELLED_SLOT_REBOOKING.md` - Full documentation

## Key Benefits

- ✅ Clean calendar without visual clutter (default view)
- ✅ No overlapping appointments on calendar
- ✅ Complete appointment history preserved in list view
- ✅ **Smart context-aware display** - Show cancelled when needed
- ✅ **User control** - Click "Đã hủy" tab to view cancelled on calendar
- ✅ Better UX for rebooking
- ✅ Data integrity maintained
- ✅ Better UX for rebooking
- ✅ Data integrity maintained
