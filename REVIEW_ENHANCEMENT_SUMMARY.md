# Review Enhancement Implementation Summary

## Overview

Enhanced the patient review system to intelligently show different buttons based on review status and allow navigation to doctor details page.

## Changes Made

### 1. Backend (NestJS)

#### File: `server/src/modules/reviews/reviews.controller.ts`

- **Added endpoint**: `GET /api/v1/reviews/patient/:patientId/appointment/:appointmentId`
- Returns the review (if any) that a specific patient left for a specific appointment
- Allows frontend to check if an appointment has already been reviewed

#### File: `server/src/modules/reviews/reviews.service.ts`

- **Added method**: `findByPatientAndAppointment(patientId, appointmentId)`
- Queries the review collection for:
  - `patientId` = the given patient
  - `refId` = the given appointment ID
  - `refModel` = 'Appointment'
- Returns `{ data: Review | null }`

### 2. Frontend API Route (Next.js)

#### File: `client/src/app/api/reviews/patient/[patientId]/appointment/[appointmentId]/route.ts` (NEW)

- Proxy endpoint that forwards requests to NestJS backend
- Handles authorization token from request headers
- Returns review data or null if no review exists

### 3. Frontend UI (Next.js)

#### File: `client/src/app/patient/appointments/my-appointments/page.tsx`

**New State:**

```typescript
const [appointmentReviews, setAppointmentReviews] = useState<
  Record<string, { _id: string; rating: number; comment: string } | null>
>({});
```

**New Functions:**

1. **`checkAppointmentReviews(appointmentsList, patientId, accessToken)`**

   - Filters for completed appointments
   - Checks each appointment for existing reviews via API
   - Stores results in `appointmentReviews` map (appointmentId → review data)

2. **`handleViewReview(appointment)`**
   - Navigates to doctor details page: `/patient/doctors/${doctorId}`
   - Includes query params: `?highlightReview=true&appointmentId=${appointmentId}`
   - Will be used to scroll to and highlight the specific review

**Updated Functions:**

1. **`fetchAppointments()`**
   - Now calls `checkAppointmentReviews()` after loading appointments
   - Automatically checks review status for all completed appointments

**Updated UI:**

Conditional button rendering for completed appointments:

```tsx
{
  appointment.status === AppointmentStatus.COMPLETED && (
    <>
      {appointment._id && appointmentReviews[appointment._id] ? (
        <button onClick={() => handleViewReview(appointment)}>
          <Star /> Xem đánh giá
        </button>
      ) : (
        <button onClick={() => handleOpenReviewModal(appointment)}>
          <Star /> Đánh giá
        </button>
      )}
    </>
  );
}
```

## User Flow

### Before Review:

1. Patient sees completed appointment
2. Button shows: "Đánh giá" (yellow)
3. Click opens review modal
4. Submit creates new review
5. Toast: "Cảm ơn bạn đã đánh giá!"

### After Review:

1. Patient sees completed appointment
2. Button shows: "Xem đánh giá" (blue, filled star icon)
3. Click navigates to doctor's profile page
4. Future: Will highlight and scroll to their review
5. Future: Will show edit button (one-time edit allowed)

## Technical Details

### API Endpoint Pattern

- **URL**: `/api/v1/reviews/patient/:patientId/appointment/:appointmentId`
- **Method**: GET
- **Auth**: Bearer token required
- **Response**:
  ```json
  {
    "data": {
      "_id": "review-id",
      "rating": 5,
      "comment": "Great doctor!",
      "patientId": "patient-id",
      "doctorId": "doctor-id",
      "refId": "appointment-id",
      "refModel": "Appointment",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
  Or `{ "data": null }` if no review exists

### State Management

- `appointmentReviews`: Map of appointment IDs to review objects
- Updated automatically when appointments load
- Checked before rendering button text
- Null/undefined values mean no review exists

### Type Safety

- Added null checks for `appointment._id` to prevent TypeScript errors
- Review data type: `{_id: string; rating: number; comment: string} | null`
- Map type: `Record<string, ReviewData | null>`

## Next Steps (TODO)

1. **Doctor Page Enhancement**

   - Read `highlightReview` and `appointmentId` query params
   - Scroll to specific review on page load
   - Highlight the review with animation/border

2. **Edit Review Feature**

   - Add edit button for user's own review on doctor page
   - Reuse ReviewModal component with pre-populated data
   - Add warning: "Một khi đã gửi đánh giá, bạn sẽ không thể sửa lại nữa"
   - Create PATCH endpoint: `/api/v1/reviews/:id`
   - Add `editCount` field to review schema (max 1 edit)

3. **Review Schema Update** (Backend)
   - Add `editCount: number` field (default 0)
   - Add `editedAt: Date` field (optional)
   - Update validation to reject if `editCount >= 1`

## Testing Checklist

- [ ] Start backend server (port 8081)
- [ ] Start frontend client (port 3000)
- [ ] Login as patient
- [ ] Navigate to "Lịch hẹn của tôi"
- [ ] Find completed appointment without review → Should show "Đánh giá" button (yellow)
- [ ] Click "Đánh giá" → Modal opens
- [ ] Submit review → Success toast
- [ ] Refresh page → Button changes to "Xem đánh giá" (blue)
- [ ] Click "Xem đánh giá" → Navigates to doctor profile
- [ ] Check console for any errors
- [ ] Verify API calls in Network tab

## Files Changed

### Backend

- `server/src/modules/reviews/reviews.controller.ts` (Modified)
- `server/src/modules/reviews/reviews.service.ts` (Modified)

### Frontend

- `client/src/app/api/reviews/patient/[patientId]/appointment/[appointmentId]/route.ts` (Created)
- `client/src/app/patient/appointments/my-appointments/page.tsx` (Modified)

## Dependencies

No new dependencies added. Uses existing:

- `next`: 15.x
- `react`: 18.x
- `lucide-react`: for icons
- `sonner`: for toast notifications
- `@nestjs/common`: 11.x
- `mongoose`: for database queries
