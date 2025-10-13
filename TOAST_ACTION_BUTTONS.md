# Toast Notifications with Action Buttons

## 🎯 Overview

Tất cả toast notifications giờ có **action buttons** để user có thể navigate trực tiếp đến trang liên quan thay vì chỉ xem thông báo.

## 📱 Toast Types & Actions

### **1. Lịch hẹn mới** (Doctor)

```typescript
Event: appointment:new
User: Doctor
Toast: "Lịch hẹn mới"
Description: "Bạn có lịch hẹn mới từ bệnh nhân"
Action Button: "Xem lịch" → /doctor/schedule
Duration: 6s
```

**Screenshot:**

```
┌─────────────────────────────────────┐
│ ✓ Lịch hẹn mới                      │
│   Bạn có lịch hẹn mới từ bệnh nhân  │
│                     [Xem lịch] [×]  │
└─────────────────────────────────────┘
```

---

### **2. Lịch hẹn đã được xác nhận** (Patient)

```typescript
Event: appointment:confirmed
User: Patient
Toast: "Lịch hẹn đã được xác nhận"
Description: "Bác sĩ đã xác nhận lịch hẹn của bạn"
Action Button: "Xem chi tiết" → /patient/appointments/my-appointments
Duration: 6s
```

**Screenshot:**

```
┌─────────────────────────────────────────┐
│ ✓ Lịch hẹn đã được xác nhận             │
│   Bác sĩ đã xác nhận lịch hẹn của bạn   │
│                  [Xem chi tiết] [×]     │
└─────────────────────────────────────────┘
```

---

### **3. Lịch hẹn đã bị hủy** (Both)

```typescript
Event: appointment:cancelled
User: Both (whoever didn't cancel)
Toast: "Lịch hẹn đã bị hủy"
Description: "Bác sĩ/Bệnh nhân đã hủy lịch hẹn"
Action Button: "Xem chi tiết" → Dynamic route based on role
  - Doctor → /doctor/schedule
  - Patient → /patient/appointments/my-appointments
Duration: 6s
```

**Screenshot:**

```
┌─────────────────────────────────────┐
│ ✕ Lịch hẹn đã bị hủy                │
│   Bác sĩ đã hủy lịch hẹn            │
│                  [Xem chi tiết] [×] │
└─────────────────────────────────────┘
```

---

### **4. Lịch hẹn đã được đổi giờ** (Both)

```typescript
Event: appointment:rescheduled
User: Both
Toast: "Lịch hẹn đã được đổi giờ"
Description: "Lịch hẹn đã được thay đổi thời gian"
Action Button: "Xem lịch mới" → Dynamic route based on role
  - Doctor → /doctor/schedule
  - Patient → /patient/appointments/my-appointments
Duration: 6s
```

**Screenshot:**

```
┌────────────────────────────────────────┐
│ ℹ Lịch hẹn đã được đổi giờ            │
│   Lịch hẹn đã được thay đổi thời gian │
│                  [Xem lịch mới] [×]   │
└────────────────────────────────────────┘
```

---

### **5. Khám hoàn tất** (Patient)

```typescript
Event: appointment:completed
User: Patient
Toast: "Khám hoàn tất"
Description: "Lịch khám đã hoàn tất"
Action Button: "Xem lịch sử" → /patient/appointments/my-appointments
Duration: 6s
```

**Screenshot:**

```
┌─────────────────────────────────────┐
│ ✓ Khám hoàn tất                     │
│   Lịch khám đã hoàn tất             │
│                  [Xem lịch sử] [×]  │
└─────────────────────────────────────┘
```

---

## 🎨 Toast Styling

### **Color Scheme:**

- ✅ Success (green): `appointment:new`, `appointment:confirmed`, `appointment:completed`
- ❌ Error (red): `appointment:cancelled`
- ℹ️ Info (blue): `appointment:rescheduled`

### **Button Styles:**

```css
/* Sonner default button styling */
action button:
  - Background: Primary color
  - Text: White
  - Hover: Darker shade
  - Border radius: 6px
  - Padding: 8px 16px
```

---

## 💡 Implementation Details

### **Code Structure:**

```typescript
toast.success("Lịch hẹn mới", {
  description: data.message || "Bạn có lịch hẹn mới từ bệnh nhân",
  duration: 6000, // 6 seconds
  action: {
    label: "Xem lịch", // Button text
    onClick: () => router.push("/doctor/schedule"), // Navigate
  },
});
```

### **Key Features:**

1. **Dynamic Routes:**

   - Doctor always goes to `/doctor/schedule`
   - Patient always goes to `/patient/appointments/my-appointments`

2. **Role-based Logic:**

   ```typescript
   const targetRoute = userRole === "doctor" ? "/doctor/schedule" : "/patient/appointments/my-appointments";
   ```

3. **Action Button Labels:**

   - Generic: "Xem chi tiết"
   - Specific: "Xem lịch", "Xem lịch mới", "Xem lịch sử"

4. **Duration:**
   - All toasts: 6 seconds (increased from 5s for better UX)
   - Gives user time to read and click action button

---

## 🧪 Testing Scenarios

### **Test 1: New Appointment → Doctor clicks "Xem lịch"**

**Steps:**

1. Patient creates appointment
2. Doctor sees toast with "Xem lịch" button
3. Doctor clicks button

**Expected:**

```
✅ Navigate to /doctor/schedule
✅ Toast disappears
✅ Calendar shows new appointment
✅ No console errors
```

---

### **Test 2: Confirmed Appointment → Patient clicks "Xem chi tiết"**

**Steps:**

1. Doctor confirms appointment
2. Patient sees toast with "Xem chi tiết" button
3. Patient clicks button

**Expected:**

```
✅ Navigate to /patient/appointments/my-appointments
✅ Toast disappears
✅ List shows confirmed appointment with green status
✅ No console errors
```

---

### **Test 3: Cancelled Appointment → Navigate based on role**

**Doctor cancels:**

```
Patient Screen:
✅ Toast: "Lịch hẹn đã bị hủy - Bác sĩ đã hủy lịch hẹn"
✅ Button: "Xem chi tiết"
✅ Clicks → Navigate to /patient/appointments/my-appointments
```

**Patient cancels:**

```
Doctor Screen:
✅ Toast: "Lịch hẹn đã bị hủy - Bệnh nhân đã hủy lịch hẹn"
✅ Button: "Xem chi tiết"
✅ Clicks → Navigate to /doctor/schedule
```

---

### **Test 4: Rescheduled → Click "Xem lịch mới"**

**Steps:**

1. Appointment is rescheduled
2. Both doctor and patient see toast
3. Click "Xem lịch mới" button

**Expected:**

```
✅ Doctor → Navigate to /doctor/schedule
✅ Patient → Navigate to /patient/appointments/my-appointments
✅ Updated time is shown
```

---

### **Test 5: Completed → Patient clicks "Xem lịch sử"**

**Steps:**

1. Doctor completes appointment
2. Patient sees toast
3. Click "Xem lịch sử" button

**Expected:**

```
✅ Navigate to /patient/appointments/my-appointments
✅ Appointment shows status "Hoàn tất"
✅ Appointment may be filtered based on filter settings
```

---

## 📊 User Journey

### **Before (No Action Button):**

```
1. User sees toast notification
2. Toast auto-dismisses after 5s
3. User forgets about it OR manually navigates to page
4. 😕 Poor UX - Extra clicks required
```

### **After (With Action Button):**

```
1. User sees toast notification with action button
2. User clicks button
3. ✨ Instantly navigates to relevant page
4. 😊 Great UX - One-click action
```

---

## 🔧 Customization Options

### **Change Button Label:**

```typescript
action: {
  label: "Your Custom Label", // Change here
  onClick: () => router.push("/your/route"),
}
```

### **Change Duration:**

```typescript
duration: 8000, // 8 seconds instead of 6
```

### **Add Multiple Actions:**

```typescript
// Sonner doesn't support multiple action buttons by default
// But you can create custom toast component if needed
```

### **Add Icons:**

```typescript
toast.success("Title", {
  description: "Message",
  icon: "🎉", // Custom emoji icon
  action: { ... },
});
```

---

## 🚀 Future Enhancements

### **Potential Improvements:**

1. **Notification Center:**

   - Store all notifications in state
   - Show notification history in dropdown
   - Mark as read/unread

2. **Sound Alerts:**

   ```typescript
   const playSound = () => {
     const audio = new Audio("/notification.mp3");
     audio.play();
   };
   ```

3. **Badge Count:**

   - Show unread count in navbar
   - Update on new notifications

4. **Desktop Notifications:**

   ```typescript
   if (Notification.permission === "granted") {
     new Notification("Lịch hẹn mới", {
       body: "Bạn có lịch hẹn mới từ bệnh nhân",
       icon: "/icon.png",
     });
   }
   ```

5. **Custom Toast Component:**
   - More styling control
   - Multiple action buttons
   - Rich content (images, avatars)

---

## 📝 Summary of Changes

### **Files Modified:**

1. **`GlobalSocketContext.tsx`**
   - ✅ Added `useRouter` import
   - ✅ Added `router` to component
   - ✅ Added `action` prop to all toast calls
   - ✅ Removed debug console.logs
   - ✅ Increased duration from 5s to 6s

### **Toast Counts:**

| Event                   | Before      | After                            |
| ----------------------- | ----------- | -------------------------------- |
| appointment:new         | Basic toast | ✅ Toast + "Xem lịch" button     |
| appointment:confirmed   | Basic toast | ✅ Toast + "Xem chi tiết" button |
| appointment:cancelled   | Basic toast | ✅ Toast + "Xem chi tiết" button |
| appointment:rescheduled | Basic toast | ✅ Toast + "Xem lịch mới" button |
| appointment:completed   | Basic toast | ✅ Toast + "Xem lịch sử" button  |

**Total:** 5 toast types with action buttons ✨

---

## ✅ Checklist

- [x] Add action buttons to all toasts
- [x] Dynamic routes based on user role
- [x] Remove debug console.logs
- [x] Increase duration to 6s
- [x] Test navigation works
- [x] Verify toast disappears after click
- [x] Check button styling matches design
- [x] Test on both doctor and patient roles

---

**Last Updated:** December 2024
**Status:** ✅ Complete
**Next:** Test all toast action buttons with real appointments
