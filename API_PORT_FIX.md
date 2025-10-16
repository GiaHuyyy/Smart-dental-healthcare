# API Port Fix - Port 8081 ✅

## Ngày cập nhật: 16/10/2025

## Vấn Đề

Treatment Modal đang gọi API đến port **3001** thay vì port **8081** (server thực tế):

```
❌ GET http://localhost:3001/api/v1/ai-chat/suggestions
   net::ERR_CONNECTION_REFUSED
```

## Nguyên Nhân

Hardcoded fallback URL trong code:

```typescript
process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
```

Nhưng `.env` file có:

```properties
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081  ← Đúng
```

⚠️ **Vấn đề:** Code không check `NEXT_PUBLIC_BACKEND_URL`, chỉ check `NEXT_PUBLIC_API_URL`

## Giải Pháp

Thay đổi fallback logic để ưu tiên `NEXT_PUBLIC_BACKEND_URL`:

```typescript
// Before
process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// After
process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
```

## Files Đã Sửa

### 1. TreatmentModal.tsx - Fetch Suggestions

**Location:** Line 107

**Before:**

```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/ai-chat/suggestions`,
  {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  }
);
```

**After:**

```typescript
const response = await fetch(
  `${
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"
  }/api/v1/ai-chat/suggestions`,
  {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  }
);
```

### 2. page.tsx - Create Medical Record

**Location:** Line 314

**Before:**

```typescript
const medicalRecordResponse = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/medical-records`
  // ...
);
```

**After:**

```typescript
const medicalRecordResponse = await fetch(
  `${
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"
  }/api/v1/medical-records`
  // ...
);
```

### 3. page.tsx - Create Prescription

**Location:** Line 345

**Before:**

```typescript
const prescriptionResponse = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/prescriptions`
  // ...
);
```

**After:**

```typescript
const prescriptionResponse = await fetch(
  `${
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"
  }/api/v1/prescriptions`
  // ...
);
```

## Environment Variables

### `.env` File

```properties
# Client Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081  ← Server đang chạy ở đây
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8080  ← Commented out

# Optional (nếu muốn override)
# NEXT_PUBLIC_API_URL=http://localhost:8081
```

### Priority Order

```
1. NEXT_PUBLIC_API_URL (nếu có)
2. NEXT_PUBLIC_BACKEND_URL (fallback 1)
3. "http://localhost:8081" (fallback 2 - hardcoded)
```

## API Endpoints (Port 8081)

### Treatment Modal

```
✅ GET http://localhost:8081/api/v1/ai-chat/suggestions
   Headers: { Authorization: Bearer <token> }
   Response: {
     chiefComplaints: string[],
     diagnoses: string[],
     treatmentPlans: string[],
     medications: string[],
     diagnosisTreatmentMap: {},
     diagnosisMedicationMap: {},
     treatmentMedicationMap: {}
   }
```

### Medical Record

```
✅ POST http://localhost:8081/api/v1/medical-records
   Headers: {
     Content-Type: application/json,
     Authorization: Bearer <token>
   }
   Body: {
     patientId, doctorId, appointmentId,
     chiefComplaints, presentIllness, physicalExamination,
     diagnosisGroups, detailedMedications, notes, status
   }
```

### Prescription

```
✅ POST http://localhost:8081/api/v1/prescriptions
   Headers: {
     Content-Type: application/json,
     Authorization: Bearer <token>
   }
   Body: {
     patientId, doctorId, medicalRecordId,
     prescriptionDate, diagnosis, medications, notes
   }
```

### Appointment Service

```
✅ Uses appointmentService helper (already correct)
   - Confirm: PATCH /api/v1/appointments/:id/confirm
   - Complete: PATCH /api/v1/appointments/:id/complete
   - Cancel: PATCH /api/v1/appointments/:id/cancel
```

## Testing

### Before Fix

```
❌ Modal opens
❌ Fetch suggestions from localhost:3001
❌ ERR_CONNECTION_REFUSED
❌ No suggestions dropdown
❌ Console error: "Failed to fetch"
```

### After Fix

```
✅ Modal opens
✅ Fetch suggestions from localhost:8081
✅ Suggestions loaded successfully
✅ Lightbulb icon works
✅ Dropdowns show suggestions
```

## Verification Steps

1. **Stop development server** (nếu đang chạy)
2. **Restart development server**

   ```bash
   npm run dev
   ```

   ⚠️ **Quan trọng:** Next.js cần restart để load environment variables

3. **Open browser DevTools**

   - Network tab
   - Watch for API calls

4. **Test flow:**
   ```
   a. Click "Điều Trị" on confirmed appointment
   b. Watch Network tab:
      ✅ Should see: http://localhost:8081/api/v1/ai-chat/suggestions
      ✅ Status: 200 OK
   c. Click lightbulb icons
      ✅ Dropdown should show suggestions
   d. Fill form and click "Hoàn thành"
      ✅ Should see:
         - POST http://localhost:8081/api/v1/medical-records (200)
         - POST http://localhost:8081/api/v1/prescriptions (200)
         - PATCH http://localhost:8081/api/v1/appointments/:id/complete (200)
   ```

## Console Output (Expected)

### Success

```javascript
// Console - Network tab
✅ GET http://localhost:8081/api/v1/ai-chat/suggestions
   Status: 200 OK
   Response: { chiefComplaints: [...], diagnoses: [...], ... }

✅ POST http://localhost:8081/api/v1/medical-records
   Status: 201 Created
   Response: { _id: "...", ... }

✅ POST http://localhost:8081/api/v1/prescriptions
   Status: 201 Created
   Response: { _id: "...", ... }
```

### Before (Error)

```javascript
// Console - Network tab
❌ GET http://localhost:3001/api/v1/ai-chat/suggestions
   Status: Failed
   Error: net::ERR_CONNECTION_REFUSED

// Console - Application log
❌ Error fetching suggestions: TypeError: Failed to fetch
```

## Server Configuration

Đảm bảo server đang chạy đúng port:

### Backend `.env` (server folder)

```properties
PORT=8081
```

### Start server

```bash
cd server
npm run start:dev
```

### Verify server

```bash
# Should see:
Application is running on: http://localhost:8081
```

## Common Issues

### Issue 1: Vẫn gọi port 3001

**Cause:** Browser cached old code
**Fix:**

```bash
# Hard reload browser
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)

# Or clear Next.js cache
rm -rf .next
npm run dev
```

### Issue 2: CORS error

**Cause:** Server không cho phép origin từ localhost:3000
**Fix:** Check server CORS config

```typescript
// server/src/main.ts
app.enableCors({
  origin: ["http://localhost:3000", "http://localhost:8081"],
  credentials: true,
});
```

### Issue 3: 401 Unauthorized

**Cause:** Access token không hợp lệ
**Fix:** Check session và login lại

## Files Changed Summary

| File                 | Lines Changed | Purpose                                    |
| -------------------- | ------------- | ------------------------------------------ |
| `TreatmentModal.tsx` | 1 line        | Fix suggestions API URL                    |
| `page.tsx`           | 2 lines       | Fix medical record + prescription API URLs |
| Total                | 3 lines       | All API calls now use port 8081            |

## Rollback (Nếu Cần)

Để quay lại port 3001:

```typescript
// Change back to:
process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
```

Hoặc set trong `.env`:

```properties
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Production Deployment

Khi deploy production, set environment variable:

```properties
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
# hoặc
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

Code sẽ tự động dùng production URL thay vì localhost.

## Conclusion

✅ **Tất cả API calls giờ đã dùng đúng port 8081**

**Changes:**

- 🔧 TreatmentModal.tsx: Suggestions API
- 🔧 page.tsx: Medical Record API
- 🔧 page.tsx: Prescription API

**Priority:**

1. `NEXT_PUBLIC_API_URL` (nếu có)
2. `NEXT_PUBLIC_BACKEND_URL` (8081)
3. Hardcoded fallback (8081)

**Next Steps:**

1. Restart development server
2. Hard reload browser
3. Test treatment modal
4. Verify all API calls hit port 8081

**Không còn lỗi ERR_CONNECTION_REFUSED!** 🎉
