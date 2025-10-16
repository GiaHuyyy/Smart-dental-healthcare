# Prescription Creation Fix + Debug Logs

## Vấn đề

Sau khi fix medical record, gặp lỗi **400 Bad Request** khi tạo prescription:

```
POST http://localhost:8081/api/v1/prescriptions 400 (Bad Request)
Error: Failed to create prescription
```

## Nguyên nhân

### 1. **Missing Required Fields trong Medications**

Backend `CreatePrescriptionDto` yêu cầu mỗi medication phải có:

- ✅ `name` (string, bắt buộc)
- ✅ `dosage` (string, bắt buộc)
- ✅ `frequency` (string, bắt buộc)
- ✅ `duration` (string, bắt buộc)
- ✅ `instructions` (string, bắt buộc)
- ❌ **`quantity` (number, bắt buộc)** - THIẾU
- ❌ **`unit` (string, bắt buộc)** - THIẾU

Frontend chỉ gửi 5 fields đầu, thiếu `quantity` và `unit`.

### 2. **Wrong PatientId**

```typescript
// ❌ SAI - Đang dùng appointmentId
patientId: currentTreatmentAppointment._id || currentTreatmentAppointment.id;
```

### 3. **Missing Diagnosis Validation**

Nếu không có diagnosis, backend sẽ reject vì trường `diagnosis` là required.

## Giải pháp

### ✅ 1. Transform Medications để thêm `quantity` và `unit`

```typescript
const prescriptionMedications = formData.medications.map((med) => ({
  name: med.name,
  dosage: med.dosage || "Chưa xác định",
  frequency: med.frequency || "Theo chỉ định",
  duration: med.duration || "Theo chỉ định",
  instructions: med.instructions || "Theo hướng dẫn bác sĩ",
  quantity: 1, // ✅ Default quantity
  unit: "hộp", // ✅ Default unit (Vietnamese: box)
}));
```

### ✅ 2. Sử dụng `patientId` đúng (đã extract từ trước)

```typescript
const prescriptionPayload = {
  patientId: patientId, // ✅ Đúng - Đã extract từ appointment
  doctorId: userId,
  medicalRecordId: medicalRecord._id || medicalRecord.id,
  // ...
};
```

### ✅ 3. Validate và format diagnosis

```typescript
diagnosis: formData.diagnosisGroups
  .filter((g) => g.diagnosis.trim())  // ✅ Lọc bỏ diagnosis rỗng
  .map((g) => g.diagnosis)
  .join(", ") || "Chưa có chẩn đoán", // ✅ Fallback nếu không có
```

### ✅ 4. Thêm Debug Logs chi tiết

```typescript
console.log("🏥 Starting Treatment Submission...");
console.log("📋 Current Appointment:", currentTreatmentAppointment);
console.log("👨‍⚕️ Doctor ID:", userId);
console.log("🔍 Raw Patient ID:", rawPatientId);
console.log("✅ Extracted Patient ID:", patientId);
console.log("📝 Medical Record Payload:", JSON.stringify(medicalRecordPayload, null, 2));
console.log("✅ Medical Record Created:", medicalRecord);
console.log("📝 Prescription Payload:", JSON.stringify(prescriptionPayload, null, 2));
console.log("✅ Prescription Created:", prescription);
```

### ✅ 5. Improved Error Handling

```typescript
if (!medicalRecordResponse.ok) {
  const errorData = await medicalRecordResponse.json();
  console.error("❌ Medical Record Error:", errorData);
  throw new Error("Failed to create medical record");
}

if (!prescriptionResponse.ok) {
  const errorData = await prescriptionResponse.json();
  console.error("❌ Prescription Error:", errorData);
  throw new Error("Failed to create prescription");
}
```

## Code thay đổi

### File: `client/src/app/doctor/schedule/page.tsx`

#### Before (SAI):

```typescript
body: JSON.stringify({
  patientId: currentTreatmentAppointment._id, // ❌ SAI
  medications: formData.medications, // ❌ Thiếu quantity, unit
  diagnosis: formData.diagnosisGroups.map((g) => g.diagnosis).join(", "), // ❌ Có thể rỗng
});
```

#### After (ĐÚNG):

```typescript
const prescriptionMedications = formData.medications.map((med) => ({
  name: med.name,
  dosage: med.dosage || "Chưa xác định",
  frequency: med.frequency || "Theo chỉ định",
  duration: med.duration || "Theo chỉ định",
  instructions: med.instructions || "Theo hướng dẫn bác sĩ",
  quantity: 1,
  unit: "hộp",
}));

const prescriptionPayload = {
  patientId: patientId, // ✅ ĐÚNG
  doctorId: userId,
  medicalRecordId: medicalRecord._id || medicalRecord.id,
  prescriptionDate: new Date().toISOString(),
  diagnosis:
    formData.diagnosisGroups
      .filter((g) => g.diagnosis.trim())
      .map((g) => g.diagnosis)
      .join(", ") || "Chưa có chẩn đoán",
  medications: prescriptionMedications, // ✅ ĐÚNG
  notes: formData.notes,
};

console.log("📝 Prescription Payload:", JSON.stringify(prescriptionPayload, null, 2));
```

## Cách test với logs

### 1. Mở Console (F12)

### 2. Click "Điều Trị" trên appointment

Bạn sẽ thấy logs:

```
🏥 Starting Treatment Submission...
📋 Current Appointment: { _id: "...", patientId: {...}, ... }
👨‍⚕️ Doctor ID: "67363a4b832e78e62a7d8e8a"
🔍 Raw Patient ID: { _id: "...", fullName: "...", ... }
✅ Extracted Patient ID: "67363a4b832e78e62a7d8e89"
```

### 3. Điền form và click "Hoàn thành"

**Medical Record Creation:**

```
📝 Medical Record Payload: {
  "patientId": "67363a4b832e78e62a7d8e89",
  "doctorId": "67363a4b832e78e62a7d8e8a",
  "recordDate": "2025-01-16T10:30:00.000Z",
  "appointmentId": "...",
  "chiefComplaints": ["Đau răng", "Viêm nướu"],
  "diagnosisGroups": [...],
  "detailedMedications": [...],
  ...
}
✅ Medical Record Created: { _id: "...", ... }
```

**Prescription Creation:**

```
📝 Prescription Payload: {
  "patientId": "67363a4b832e78e62a7d8e89",
  "doctorId": "67363a4b832e78e62a7d8e8a",
  "medicalRecordId": "...",
  "prescriptionDate": "2025-01-16T10:30:00.000Z",
  "diagnosis": "Viêm nướu, Sâu răng",
  "medications": [
    {
      "name": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "3 lần/ngày",
      "duration": "7 ngày",
      "instructions": "Uống sau ăn",
      "quantity": 1,
      "unit": "hộp"
    }
  ],
  "notes": "..."
}
✅ Prescription Created: { _id: "...", ... }
```

### 4. Nếu có lỗi

Bạn sẽ thấy:

```
❌ Medical Record Error: {
  "statusCode": 400,
  "message": ["recordDate must be a Date instance"],
  "error": "Bad Request"
}
```

hoặc

```
❌ Prescription Error: {
  "statusCode": 400,
  "message": [
    "medications.0.quantity must be a number",
    "medications.0.unit must be a string"
  ],
  "error": "Bad Request"
}
```

## Backend Requirements

### CreatePrescriptionDto (FULL):

```typescript
{
  patientId: string (MongoId, required)
  doctorId?: string (MongoId, optional)
  medicalRecordId?: string (MongoId, optional)
  prescriptionDate: Date (required)
  diagnosis: string (required)
  medications: [
    {
      name: string (required)
      dosage: string (required)
      frequency: string (required)
      duration: string (required)
      instructions: string (required)
      quantity: number (required)  ⚠️ QUAN TRỌNG
      unit: string (required)       ⚠️ QUAN TRỌNG
    }
  ]
  instructions?: string (optional)
  notes?: string (optional)
  isFollowUpRequired?: boolean (optional)
  followUpDate?: Date (optional)
  attachments?: string[] (optional)
}
```

## Kết quả mong đợi

### ✅ Success Flow:

1. Click "Điều Trị" → Modal mở với patient info
2. Điền form (chief complaints, diagnosis, medications tự động thêm)
3. Click "Hoàn thành"
4. Console logs:
   - ✅ Patient ID extracted
   - ✅ Medical record payload
   - ✅ Medical record created
   - ✅ Prescription payload (với quantity, unit)
   - ✅ Prescription created
5. Toast: "Đã lưu hồ sơ khám bệnh và hoàn thành lịch hẹn"
6. Appointment status → "completed"

### ❌ Error Flow:

1. Console hiển thị payload đầy đủ
2. Console hiển thị error response từ backend
3. Toast: "Có lỗi xảy ra khi lưu hồ sơ khám bệnh"
4. Modal vẫn mở để user sửa

## Lưu ý

- **`quantity`** và **`unit`** là required trong MedicationDto của prescription
- Frontend medication form KHÔNG có fields này → phải thêm default values
- Default: `quantity: 1`, `unit: "hộp"` (có thể customize sau)
- Logs giúp debug chính xác field nào thiếu hoặc sai format
- Nếu muốn user nhập quantity/unit, phải thêm vào TreatmentModal form

## Tương lai (Enhancement)

Có thể thêm vào TreatmentModal:

```typescript
// In medication form
<input
  type="number"
  value={med.quantity || 1}
  onChange={(e) => updateMedication(index, "quantity", parseInt(e.target.value))}
  placeholder="Số lượng"
  min="1"
/>
<input
  type="text"
  value={med.unit || "hộp"}
  onChange={(e) => updateMedication(index, "unit", e.target.value)}
  placeholder="Đơn vị (hộp, viên, chai...)"
/>
```

Nhưng hiện tại default values đủ để system hoạt động.
