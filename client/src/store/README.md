# Redux Store Documentation

## Overview
Redux store được sử dụng để quản lý state của ứng dụng, đặc biệt là dữ liệu phân tích hình ảnh và thông tin đặt lịch khám.

## Store Structure

### 1. Image Analysis Slice (`imageAnalysisSlice.ts`)
Quản lý dữ liệu phân tích hình ảnh X-quang.

**State:**
```typescript
interface ImageAnalysisState {
  analysisResult: ImageAnalysisResult | null;
  uploadedImage: string | null;
  isAnalyzing: boolean;
  analysisHistory: ImageAnalysisResult[];
}
```

**Actions:**
- `setAnalysisResult(result)` - Lưu kết quả phân tích
- `setUploadedImage(imageUrl)` - Lưu URL hình ảnh đã upload
- `setIsAnalyzing(boolean)` - Cập nhật trạng thái đang phân tích
- `clearAnalysisResult()` - Xóa kết quả phân tích hiện tại
- `clearAllAnalysis()` - Xóa tất cả dữ liệu phân tích

### 2. Appointment Slice (`appointmentSlice.ts`)
Quản lý dữ liệu đặt lịch khám từ chatbot.

**State:**
```typescript
interface AppointmentState {
  selectedDoctor: DoctorSuggestion | null;
  symptoms: string;
  urgencyLevel: 'high' | 'medium' | 'low';
  chatHistory: string[];
  notes: string;
  appointmentData: {
    doctorId?: string;
    doctorName?: string;
    specialty?: string;
    symptoms?: string;
    urgency?: string;
    notes?: string;
    hasImageAnalysis?: boolean;
  } | null;
}
```

**Actions:**
- `setSelectedDoctor(doctor)` - Lưu bác sĩ được chọn
- `setSymptoms(symptoms)` - Lưu triệu chứng
- `setUrgencyLevel(level)` - Cập nhật mức độ khẩn cấp
- `addChatMessage(message)` - Thêm tin nhắn vào lịch sử chat
- `setNotes(notes)` - Lưu ghi chú
- `setAppointmentData(data)` - Lưu toàn bộ dữ liệu đặt lịch
- `clearAppointmentData()` - Xóa tất cả dữ liệu đặt lịch
- `updateAppointmentData(partialData)` - Cập nhật một phần dữ liệu

## Usage Examples

### Trong ChatInterface Component:
```typescript
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAnalysisResult, setSelectedDoctor } from "@/store/slices/imageAnalysisSlice";

// Lấy dữ liệu từ store
const { analysisResult, isAnalyzing } = useAppSelector(state => state.imageAnalysis);
const { selectedDoctor, symptoms } = useAppSelector(state => state.appointment);

// Dispatch actions
const dispatch = useAppDispatch();
dispatch(setAnalysisResult(result));
dispatch(setSelectedDoctor(doctor));
```

### Chuyển từ Chat sang Appointments:
```typescript
// Trong ChatInterface
const navigateToAppointments = (doctor, symptoms) => {
  const appointmentData = {
    doctorId: doctor?._id,
    doctorName: doctor?.fullName,
    specialty: doctor?.specialty,
    symptoms: symptoms,
    urgency: urgencyLevel,
    notes: comprehensiveNotes,
    hasImageAnalysis: !!analysisResult
  };
  
  dispatch(setAppointmentData(appointmentData));
  router.push('/patient/appointments');
};
```

### Trong Appointments Page:
```typescript
// Lấy dữ liệu từ Redux thay vì URL parameters
const { appointmentData, selectedDoctor, symptoms } = useAppSelector(state => state.appointment);

// Xử lý dữ liệu
useEffect(() => {
  if (appointmentData) {
    setSelectedDoctorId(appointmentData.doctorId);
    setNotes(appointmentData.notes);
    // ... xử lý khác
  }
}, [appointmentData]);

// Clear data sau khi đặt lịch thành công
dispatch(clearAppointmentData());
```

## Benefits

1. **URL Clean**: Không còn URL dài và xấu với query parameters
2. **Better UX**: Dữ liệu được giữ nguyên khi navigate giữa các trang
3. **Centralized State**: Quản lý state tập trung và dễ debug
4. **Type Safety**: TypeScript support đầy đủ
5. **Performance**: Không cần parse URL parameters mỗi lần load trang

## Migration from URL Parameters

Trước đây:
```typescript
// URL: /patient/appointments?doctorId=123&doctorName=BS%20A&notes=...
const doctorId = searchParams.get('doctorId');
const doctorName = searchParams.get('doctorName');
const notes = searchParams.get('notes');
```

Bây giờ:
```typescript
// Redux state
const { appointmentData } = useAppSelector(state => state.appointment);
const doctorId = appointmentData?.doctorId;
const doctorName = appointmentData?.doctorName;
const notes = appointmentData?.notes;
```
