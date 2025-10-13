# Calendar Display Logic - Visual Guide

## 📊 How Calendar Filtering Works

### Context-Aware Display

The calendar **intelligently filters** appointments based on which tab the user is viewing.

```
┌─────────────────────────────────────────────────────────────┐
│                    STAT CARDS (TABS)                         │
├─────────────────────────────────────────────────────────────┤
│  [Tổng lịch hẹn]  [Chờ xác nhận]  [Đã xác nhận]            │
│  [Đã hoàn thành]  [Đã hủy] ← Click here                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │  View Mode: List or Calendar?       │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │  [Xem lịch] Button                  │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │  Calendar View (filtered)           │
        └─────────────────────────────────────┘
```

---

## 🎯 Filtering Rules

### Rule 1: Default Tabs (Tất cả, Chờ xác nhận, Đã xác nhận, Đã hoàn thành)

```
Selected Tab: Any EXCEPT "Đã hủy"
              ↓
Calendar Display: HIDE cancelled appointments
              ↓
Result: Clean calendar with only active appointments
```

**Example:**

```
Database has:
├── 16:00 - Patient A (confirmed) ✅
├── 16:00 - Patient B (cancelled) ❌
└── 16:00 - Patient C (cancelled) ❌

Calendar shows:
└── 16:00 - Patient A (confirmed) ✅ ONLY
```

---

### Rule 2: Đã hủy Tab (Cancelled Tab)

```
Selected Tab: "Đã hủy"
              ↓
User clicks: "Xem lịch"
              ↓
Calendar Display: SHOW cancelled appointments
              ↓
Result: Cancelled appointments visible on calendar
```

**Example:**

```
Database has:
├── 16:00 - Patient A (confirmed) ✅
├── 16:00 - Patient B (cancelled) ❌
└── 16:00 - Patient C (cancelled) ❌

Calendar shows:
├── 16:00 - Patient B (cancelled) ❌
└── 16:00 - Patient C (cancelled) ❌
(Patient A is filtered out because tab is "Đã hủy")
```

---

## 🔄 User Flow Examples

### Flow 1: Regular Usage (Clean Calendar)

```
1. Doctor opens appointment page
   Tab: "Tất cả lịch hẹn" (default)
   View: Calendar

2. Calendar displays:
   ✅ All pending appointments
   ✅ All confirmed appointments
   ✅ All completed appointments
   ❌ No cancelled appointments (hidden)

3. Doctor sees clean calendar without clutter
```

### Flow 2: View Cancelled History on Calendar

```
1. Doctor clicks "Đã hủy" tab (3 items)
   View: List (default when clicking tab)

2. List shows:
   ❌ Patient A - 14:00 (cancelled)
   ❌ Patient B - 15:00 (cancelled)
   ❌ Patient C - 16:00 (cancelled)

3. Doctor clicks "Xem lịch" button
   View: Calendar

4. Calendar displays:
   ❌ 14:00 - Patient A (red/pink color)
   ❌ 15:00 - Patient B (red/pink color)
   ❌ 16:00 - Patient C (red/pink color)

5. Doctor can see when cancellations occurred
```

### Flow 3: Switch Between Tabs

```
1. Start: "Đã hủy" tab → Calendar view
   Shows: Cancelled appointments

2. Click: "Đã xác nhận" tab
   View: Stays in calendar mode
   Shows: Only confirmed appointments
   (Cancelled automatically hidden)

3. Click: "Đã hủy" tab again
   View: Stays in calendar mode
   Shows: Cancelled appointments again
   (Automatically shown because of tab context)
```

---

## 💻 Code Logic

### getCalendarAppointments() Function

```typescript
const getCalendarAppointments = () => {
  // First, get appointments filtered by selected tab
  const filtered = getFilteredAppointments();

  // Check which tab is selected
  if (selectedTab === "cancelled") {
    // User wants to see cancelled appointments
    // Return all (which are already cancelled due to tab filter)
    return filtered;
  }

  // For all other tabs, exclude cancelled
  // This keeps calendar clean
  return filtered.filter((apt) => apt.status !== "cancelled");
};
```

### Logic Flow Diagram

```
┌──────────────────────────┐
│  getFilteredAppointments │ ← Filter by selected tab
└────────────┬─────────────┘
             │
             ↓
     ┌───────────────┐
     │ selectedTab?  │
     └───────┬───────┘
             │
        ┌────┴────┐
        │         │
    "cancelled"   Other tabs
        │         │
        ↓         ↓
    Return all   Filter out
    filtered     cancelled
        │         │
        └────┬────┘
             │
             ↓
    ┌────────────────┐
    │ Calendar View  │
    └────────────────┘
```

---

## 🎨 Visual States

### State 1: Tất cả lịch hẹn (All Appointments)

```
Calendar View:
┌─────────────────────────────────┐
│ Mon 10/13          Tue 10/14    │
├─────────────────────────────────┤
│ 14:00 [Pending]                 │
│ 15:00 [Confirmed]               │
│ 16:00 [Confirmed]               │
│ 17:00 [Completed]               │
│                                 │
│ ❌ No cancelled shown           │
└─────────────────────────────────┘
```

### State 2: Đã hủy (Cancelled)

```
Calendar View:
┌─────────────────────────────────┐
│ Mon 10/13          Tue 10/14    │
├─────────────────────────────────┤
│ 14:00 [Cancelled] 🔴            │
│ 15:00 [Cancelled] 🔴            │
│ 16:00 [Cancelled] 🔴            │
│                                 │
│ ✅ Only cancelled shown         │
└─────────────────────────────────┘
```

---

## ✅ Benefits of This Approach

| Benefit                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| **Clean Default View** | Calendar shows only active appointments by default |
| **User Control**       | Doctor can view cancelled history when needed      |
| **Context-Aware**      | Display adapts to what user is trying to see       |
| **No Confusion**       | Clear separation between active and cancelled      |
| **Complete History**   | All data accessible, just organized better         |
| **Better UX**          | No overlapping, no clutter, intentional display    |

---

## 🧪 Testing Scenarios

### Test 1: Default Behavior

```
✅ Open page → "Tất cả" tab active → Calendar clean
✅ No cancelled appointments visible
✅ Only active appointments shown
```

### Test 2: View Cancelled

```
✅ Click "Đã hủy" tab
✅ Click "Xem lịch"
✅ Cancelled appointments now visible on calendar
✅ Red/pink colored events
```

### Test 3: Switch Back

```
✅ From "Đã hủy" calendar view
✅ Click "Tất cả lịch hẹn" tab
✅ Cancelled appointments disappear
✅ Calendar clean again
```

### Test 4: Multiple Switches

```
✅ Switch between tabs multiple times
✅ Calendar always shows correct filtered data
✅ No stale data or incorrect display
```

---

## 🎓 Summary

**Key Concept:** Calendar display is **context-aware** based on selected tab.

**Simple Rule:**

- 👉 Viewing "Đã hủy" tab? → Show cancelled on calendar
- 👉 Viewing any other tab? → Hide cancelled from calendar
- 👉 List view? → Always show all data

This gives doctors:

1. Clean working calendar (default)
2. Ability to review cancellation history (when needed)
3. No visual clutter or confusion
4. Complete data access in list view

**Result:** Best of both worlds! 🎉
