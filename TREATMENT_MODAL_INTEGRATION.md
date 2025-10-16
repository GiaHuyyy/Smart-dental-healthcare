# TreatmentModal Integration vào Medical Records Page

## Tổng quan

Đã thay thế `EditMedicalRecordModal` bằng `TreatmentModal` trong trang Medical Records của bác sĩ. Modal này giờ có thể hoạt động ở 2 chế độ:

- **Create mode**: Tạo hồ sơ điều trị mới (từ appointment)
- **Update mode**: Cập nhật hồ sơ điều trị có sẵn (từ medical records)

## Thay đổi chính

### 1. TreatmentModal Component Updates

#### File: `client/src/components/appointments/TreatmentModal.tsx`

**Thêm Props mới:**

```typescript
interface TreatmentModalProps {
  // ... existing props
  mode?: "create" | "update"; // ✅ Mới: Xác định chế độ hoạt động
  initialData?: Partial<TreatmentFormData>; // ✅ Mới: Dữ liệu ban đầu cho update mode
}
```

**Dynamic Button Text:**

```typescript
{
  isSubmitting ? (
    <>
      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      Đang xử lý...
    </>
  ) : mode === "update" ? (
    "Cập nhật"
  ) : (
    "Hoàn thành"
  ); // ✅ Đổi text dựa vào mode
}
```

**Load Initial Data:**

```typescript
useEffect(() => {
  if (isOpen) {
    fetchSuggestions();
    // Load initial data if in update mode
    if (mode === "update" && initialData) {
      setTreatmentForm({
        chiefComplaints: initialData.chiefComplaints || [],
        presentIllness: initialData.presentIllness || "",
        physicalExamination: initialData.physicalExamination || "",
        diagnosisGroups: initialData.diagnosisGroups || [{ diagnosis: "", treatmentPlans: [""] }],
        notes: initialData.notes || "",
        medications: initialData.medications || [],
      });
    }
  }
}, [isOpen, fetchSuggestions, mode, initialData]);
```

### 2. Medical Records Page Updates

#### File: `client/src/app/doctor/medical-records/page.tsx`

**Removed:**

- ❌ `import EditMedicalRecordModal`
- ❌ `type EditModalProps` và `type EditModalRecord`
- ❌ `toEditModalRecord()` helper function
- ❌ `editModalRecord` useMemo
- ❌ `parseOptionalNumber()` helper

**Added:**

- ✅ `import TreatmentModal from "@/components/appointments/TreatmentModal"`
- ✅ `isSubmittingTreatment` state
- ✅ Extended `MedicalRecord` interface với các fields mới

**Updated MedicalRecord Interface:**

```typescript
interface MedicalRecord {
  // ... existing fields
  chiefComplaints?: string[]; // ✅ Array of chief complaints
  presentIllness?: string; // ✅ Present illness description
  physicalExamination?: string; // ✅ Physical exam findings
  diagnosisGroups?: Array<{
    // ✅ Diagnosis với treatment plans
    diagnosis: string;
    treatmentPlans: string[];
  }>;
  detailedMedications?: Array<{
    // ✅ Detailed medication info
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
}
```

**New Modal Implementation:**

```typescript
{
  showEditModal && selectedRecord && (
    <TreatmentModal
      isOpen={showEditModal}
      onClose={() => {
        setShowEditModal(false);
        setSelectedRecord(null);
      }}
      mode="update" // ✅ Set to update mode
      appointment={{
        _id: selectedRecord._id,
        id: selectedRecord._id,
        patientId:
          typeof selectedRecord.patientId === "string"
            ? selectedRecord.patientId
            : selectedRecord.patientId?._id
            ? { _id: selectedRecord.patientId._id }
            : undefined,
        patientName: getPatientName(selectedRecord),
        patientAvatar: "",
        date: selectedRecord.recordDate,
        startTime: "09:00",
        phone: getPatientDetails(selectedRecord.patientId)?.phone ?? "",
        email: getPatientEmail(selectedRecord),
      }}
      initialData={{
        // ✅ Convert existing data to TreatmentFormData format
        chiefComplaints:
          selectedRecord.chiefComplaints ||
          (selectedRecord.chiefComplaint ? selectedRecord.chiefComplaint.split(", ") : []),
        presentIllness: selectedRecord.presentIllness || "",
        physicalExamination: selectedRecord.physicalExamination || "",
        diagnosisGroups:
          selectedRecord.diagnosisGroups ||
          (selectedRecord.diagnosis
            ? [
                {
                  diagnosis: selectedRecord.diagnosis,
                  treatmentPlans: selectedRecord.treatmentPlan ? selectedRecord.treatmentPlan.split(", ") : [""],
                },
              ]
            : [{ diagnosis: "", treatmentPlans: [""] }]),
        notes: selectedRecord.notes || "",
        medications:
          selectedRecord.detailedMedications ||
          (selectedRecord.medications
            ? selectedRecord.medications.map((name) => ({
                name: typeof name === "string" ? name : String(name),
                dosage: "",
                frequency: "",
                duration: "",
                instructions: "",
              }))
            : []),
      }}
      onSubmit={async (formData) => {
        // ✅ Convert TreatmentFormData back to MedicalRecord format
        setIsSubmittingTreatment(true);
        try {
          const updateData = {
            chiefComplaint: formData.chiefComplaints.join(", "),
            chiefComplaints: formData.chiefComplaints,
            presentIllness: formData.presentIllness,
            physicalExamination: formData.physicalExamination,
            diagnosis: formData.diagnosisGroups
              .filter((g) => g.diagnosis.trim())
              .map((g) => g.diagnosis)
              .join(", "),
            diagnosisGroups: formData.diagnosisGroups,
            treatmentPlan: formData.diagnosisGroups
              .flatMap((g) => g.treatmentPlans)
              .filter((t) => t.trim())
              .join(", "),
            medications: formData.medications.map((m) => m.name),
            detailedMedications: formData.medications,
            notes: formData.notes,
            recordDate: new Date(),
          };

          await handleUpdateRecord(selectedRecord._id, updateData);
          setShowEditModal(false);
          setSelectedRecord(null);
        } catch (error) {
          console.error("Update error:", error);
        } finally {
          setIsSubmittingTreatment(false);
        }
      }}
      isSubmitting={isSubmittingTreatment}
      accessToken={localStorage.getItem("token") || undefined}
    />
  );
}
```

## Data Conversion Logic

### Medical Record → TreatmentFormData (Initial Load)

```typescript
{
  // String/Array conversion for chief complaints
  chiefComplaints: record.chiefComplaints ||
    (record.chiefComplaint ? record.chiefComplaint.split(", ") : []),

  // Direct mapping for text fields
  presentIllness: record.presentIllness || "",
  physicalExamination: record.physicalExamination || "",

  // Complex object conversion for diagnosis groups
  diagnosisGroups: record.diagnosisGroups ||
    (record.diagnosis ? [{
      diagnosis: record.diagnosis,
      treatmentPlans: record.treatmentPlan ? record.treatmentPlan.split(", ") : [""]
    }] : [{ diagnosis: "", treatmentPlans: [""] }]),

  // Notes passthrough
  notes: record.notes || "",

  // Medications: detailed if available, otherwise convert from names
  medications: record.detailedMedications ||
    (record.medications ? record.medications.map((name) => ({
      name: String(name),
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    })) : []),
}
```

### TreatmentFormData → Medical Record (Save)

```typescript
{
  // Keep both formats for backward compatibility
  chiefComplaint: formData.chiefComplaints.join(", "),
  chiefComplaints: formData.chiefComplaints,

  // Direct mapping
  presentIllness: formData.presentIllness,
  physicalExamination: formData.physicalExamination,

  // Convert diagnosis groups to both string and array format
  diagnosis: formData.diagnosisGroups
    .filter((g) => g.diagnosis.trim())
    .map((g) => g.diagnosis)
    .join(", "),
  diagnosisGroups: formData.diagnosisGroups,

  // Flatten treatment plans
  treatmentPlan: formData.diagnosisGroups
    .flatMap((g) => g.treatmentPlans)
    .filter((t) => t.trim())
    .join(", "),

  // Medications in both formats
  medications: formData.medications.map((m) => m.name),
  detailedMedications: formData.medications,

  // Notes passthrough
  notes: formData.notes,
  recordDate: new Date(),
}
```

## User Flow Changes

### Before (Old EditMedicalRecordModal):

1. Click "Sửa" button trên medical record
2. Modal mở với form đơn giản:
   - Text inputs cho chief complaint, diagnosis, treatment
   - Simple medication tags (chỉ tên)
   - Basic vital signs
3. Edit và save
4. Modal đóng

### After (New TreatmentModal):

1. Click "Sửa" button trên medical record
2. Modal mở với full treatment interface:
   - ✅ **Hashtag chief complaints** với lightbulb suggestions
   - ✅ **Tiền sử bệnh** (Present Illness) textarea
   - ✅ **Chẩn đoán groups** với nested treatment plans
   - ✅ **Lightbulb suggestions** trên mọi fields
   - ✅ **Auto-medication generation** từ diagnosis/treatment
   - ✅ **Detailed medication form** (name, dosage, frequency, duration, instructions)
   - ✅ **Khám lâm sàng** (Physical Examination) textarea
   - ✅ **Ghi chú** (Notes) textarea
3. Edit với all advanced features:
   - Click lightbulb → dropdown suggestions
   - Select diagnosis → medications tự động thêm
   - Select treatment → medications tự động thêm
   - Add/remove diagnosis groups và treatment plans
4. Click **"Cập nhật"** button (thay vì "Hoàn thành")
5. Modal đóng, data được update

## Features Available in Update Mode

✅ **All features from Create mode:**

- Hashtag-style chief complaints
- Lightbulb suggestions system
- Auto-medication generation
- Nested diagnosis groups
- Multiple treatment plans per diagnosis
- Detailed medication forms
- Present illness description
- Physical examination notes
- General notes

✅ **Update-specific features:**

- Pre-populated form data
- "Cập nhật" button instead of "Hoàn thành"
- Preserves existing data structure
- Backward compatible với old data format

## Backend Compatibility

Backend `MedicalRecord` schema hỗ trợ cả 2 formats:

```typescript
// Old format (still supported)
{
  chiefComplaint: "Đau răng, Viêm nướu",
  diagnosis: "Viêm nướu",
  treatmentPlan: "Lấy cao răng, Vệ sinh răng miệng",
  medications: ["Amoxicillin", "Paracetamol"]
}

// New format (preferred)
{
  chiefComplaint: "Đau răng, Viêm nướu",  // For backward compatibility
  chiefComplaints: ["Đau răng", "Viêm nướu"],
  presentIllness: "Bệnh nhân than đau răng 3 ngày...",
  physicalExamination: "Răng 36 sâu sâu độ 2...",
  diagnosis: "Viêm nướu",  // For backward compatibility
  diagnosisGroups: [{
    diagnosis: "Viêm nướu",
    treatmentPlans: ["Lấy cao răng", "Vệ sinh răng miệng"]
  }],
  treatmentPlan: "Lấy cao răng, Vệ sinh răng miệng",  // For backward compatibility
  medications: ["Amoxicillin", "Paracetamol"],  // For backward compatibility
  detailedMedications: [{
    name: "Amoxicillin",
    dosage: "500mg",
    frequency: "3 lần/ngày",
    duration: "7 ngày",
    instructions: "Uống sau ăn"
  }]
}
```

## Testing Steps

### 1. Test Update Flow

1. **Navigate to Medical Records:**

   ```
   Doctor Dashboard → Hồ sơ điều trị
   ```

2. **Select a record:**

   - Click vào bất kỳ medical record nào
   - Click nút "Sửa" (Edit icon)

3. **Verify modal opens với data:**

   - ✅ Chief complaints hiển thị dưới dạng hashtags
   - ✅ Present illness filled (nếu có)
   - ✅ Diagnosis groups hiển thị đúng
   - ✅ Treatment plans hiển thị đúng
   - ✅ Medications hiển thị với full details (nếu có)
   - ✅ Physical examination filled (nếu có)
   - ✅ Notes filled (nếu có)

4. **Test editing:**

   - Thêm/xóa chief complaints
   - Click lightbulb → verify suggestions
   - Update diagnosis → verify auto-medications
   - Add treatment plan → verify auto-medications
   - Edit medication details
   - Update notes

5. **Save changes:**
   - Click **"Cập nhật"** button
   - Verify loading state
   - Verify success toast
   - Verify modal closes
   - Verify record list refreshes với data mới

### 2. Test với Old Data Format

1. Tìm medical record cũ (chỉ có string fields)
2. Click "Sửa"
3. Verify conversion:
   - `chiefComplaint` → split thành `chiefComplaints` array
   - `diagnosis` → convert thành `diagnosisGroups`
   - `treatmentPlan` → split thành treatment plans array
   - `medications` → convert thành detailed medications (chỉ có name)

### 3. Test với New Data Format

1. Tạo record mới từ appointment (dùng TreatmentModal create mode)
2. Quay lại medical records page
3. Click "Sửa" trên record vừa tạo
4. Verify all data loads perfectly:
   - Chief complaints array intact
   - Diagnosis groups với nested treatment plans
   - Detailed medications với all fields

## Files Changed

### Modified:

1. ✅ `client/src/components/appointments/TreatmentModal.tsx`

   - Added `mode` prop
   - Added `initialData` prop
   - Dynamic button text based on mode
   - Load initial data in update mode

2. ✅ `client/src/app/doctor/medical-records/page.tsx`
   - Replaced `EditMedicalRecordModal` import với `TreatmentModal`
   - Removed old type definitions
   - Removed `toEditModalRecord()` helper
   - Extended `MedicalRecord` interface
   - Added `isSubmittingTreatment` state
   - Implemented data conversion logic
   - Updated modal implementation

### Removed:

- ❌ Usage of `EditMedicalRecordModal` component (vẫn tồn tại file, không xóa để backup)
- ❌ `EditModalProps` và `EditModalRecord` types
- ❌ `toEditModalRecord()` function
- ❌ `editModalRecord` useMemo
- ❌ `parseOptionalNumber()` helper

## Benefits

### For Users (Doctors):

- 🎯 **Consistent interface** giữa create và update
- 💡 **Smart suggestions** khi update records
- 🔄 **Auto-medication** works in update mode
- ✨ **Better UX** với advanced features
- 📋 **More structured data** với diagnosis groups

### For Developers:

- 🔧 **Code reuse** - một modal cho cả create và update
- 🏗️ **Maintainability** - chỉ cần maintain 1 component
- 📊 **Richer data structure** - detailed medications, diagnosis groups
- ↔️ **Backward compatible** - works với old và new data formats
- 🧪 **Easier testing** - consistent behavior

## Migration Notes

- Old medical records tự động convert sang new format khi edit
- Backend API không cần thay đổi (already supports both formats)
- No data migration script needed (conversion happens on-the-fly)
- Old `EditMedicalRecordModal` component vẫn tồn tại (có thể xóa sau khi test kỹ)

## Future Enhancements

1. **Add validation rules:**

   - Validate medication dosage format
   - Validate treatment plan dependencies

2. **Add more auto-features:**

   - Auto-suggest follow-up date based on diagnosis
   - Auto-calculate medication quantity

3. **Improve data persistence:**

   - Save draft changes
   - Undo/redo functionality

4. **Add analytics:**
   - Track which suggestions are used most
   - Improve AI suggestions over time

## Rollback Plan (If Needed)

Nếu gặp issues, có thể rollback bằng cách:

1. Revert import:

   ```typescript
   import EditMedicalRecordModal from "@/components/medical-records/EditMedicalRecordModal";
   ```

2. Restore old modal usage:

   ```typescript
   {
     showEditModal && editModalRecord && (
       <EditMedicalRecordModal
         isOpen={showEditModal}
         onClose={() => setShowEditModal(false)}
         record={editModalRecord}
         onSubmit={(data) => handleUpdateRecord(selectedRecord._id, data)}
       />
     );
   }
   ```

3. Restore removed helper functions từ git history

## Success Criteria

- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ Modal opens với correct initial data
- ✅ All features work (lightbulbs, auto-medications, etc.)
- ✅ Save updates record correctly
- ✅ Button text shows "Cập nhật" instead of "Hoàn thành"
- ✅ Works với both old và new data formats
- ✅ Backward compatible với existing records
