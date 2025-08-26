# 🔗 Tích hợp Chatbot với Đặt lịch khám

## 📋 Tổng quan

Tính năng tích hợp cho phép người dùng chuyển từ chatbot sang trang đặt lịch khám với thông tin được điền sẵn tự động, bao gồm:
- Thông tin bác sĩ được gợi ý
- Triệu chứng từ cuộc trò chuyện
- Mức độ khẩn cấp
- Loại khám phù hợp

## 🎯 Cách hoạt động

### 1. **Từ Chatbot sang Đặt lịch**

#### **Bước 1: Tương tác với Chatbot**
```
Người dùng: "Tôi bị đau răng dữ dội"
Chatbot: Phân tích và gợi ý bác sĩ phù hợp
```

#### **Bước 2: Nhấn nút "Đặt lịch khám"**
- Trong card bác sĩ được gợi ý
- Trong action buttons sau phân tích ảnh
- Trong header của chatbot

#### **Bước 3: Chuyển hướng tự động**
URL sẽ được tạo với các tham số:
```
/patient/appointments?doctorId=123&doctorName=BS.Nguyễn%20Văn%20A&specialty=Nha%20khoa%20tổng%20quát&notes=Đau%20răng%20dữ%20dội&urgency=high
```

### 2. **Thông tin được chuyển**

#### **Thông tin bác sĩ:**
- `doctorId`: ID của bác sĩ trong database
- `doctorName`: Tên bác sĩ
- `specialty`: Chuyên khoa

#### **Thông tin triệu chứng:**
- `notes`: Triệu chứng từ cuộc trò chuyện
- `urgency`: Mức độ khẩn cấp (high/medium/low)
- `symptoms`: Các triệu chứng được phát hiện

## 🚀 Tính năng chi tiết

### **1. Tự động điền thông tin**

#### **Bác sĩ:**
- Tự động chọn bác sĩ được gợi ý
- Hiển thị gợi ý nếu chưa chọn

#### **Ghi chú:**
- Tự động điền triệu chứng từ chat
- Hiển thị thông báo "Đã điền sẵn từ chatbot"

#### **Loại khám:**
- Tự động chọn dựa trên mức độ khẩn cấp:
  - `high` → "Khám cấp cứu"
  - `medium` → "Khám định kỳ"
  - `low` → "Khám định kỳ"

### **2. Hiển thị thông tin từ chatbot**

#### **Thông báo chào mừng:**
```
Đã chuyển từ chatbot với thông tin:
Bác sĩ: BS. Nguyễn Văn A
Triệu chứng: Đau răng dữ dội
```

#### **Card thông tin:**
```
Thông tin từ chatbot:
👨‍⚕️ Bác sĩ: BS. Nguyễn Văn A
🏥 Chuyên khoa: Nha khoa tổng quát
⚠️ Mức độ: Khẩn cấp
📝 Triệu chứng: Đau răng dữ dội
```

### **3. Gợi ý thông minh**

#### **Gợi ý bác sĩ:**
```
💡 Gợi ý: BS. Nguyễn Văn A - Nha khoa tổng quát
```

#### **Gợi ý triệu chứng:**
```
💡 Đã điền sẵn từ chatbot: Đau răng dữ dội
```

## 🔧 Cách sử dụng

### **1. Từ cuộc trò chuyện thông thường**

1. **Bắt đầu chat với chatbot**
2. **Mô tả triệu chứng**
3. **Nhận gợi ý bác sĩ**
4. **Nhấn "Đặt lịch khám" trong card bác sĩ**

### **2. Từ phân tích ảnh**

1. **Upload ảnh X-quang**
2. **Nhận kết quả phân tích**
3. **Nhấn "Đặt lịch khám" trong action buttons**

### **3. Từ header chatbot**

1. **Bất kỳ lúc nào trong cuộc trò chuyện**
2. **Nhấn nút "Đặt lịch" trong header**
3. **Chuyển đến trang đặt lịch với thông tin hiện tại**

## 📱 Giao diện người dùng

### **1. Chatbot Interface**

#### **Card bác sĩ được gợi ý:**
```jsx
<div className="p-4 bg-blue-50 border-t border-blue-200">
  <h4>Bác sĩ được đề xuất</h4>
  <p>{suggestedDoctor.fullName}</p>
  <p>{suggestedDoctor.specialty}</p>
  <button onClick={() => navigateToAppointments(suggestedDoctor, symptoms)}>
    Đặt lịch khám
  </button>
</div>
```

#### **Action buttons:**
```jsx
<button onClick={() => handleAnalysisActionClick("Đặt lịch khám")}>
  📅 Đặt lịch khám
</button>
```

### **2. Appointments Page**

#### **Thông báo chào mừng:**
```jsx
{prefilledData && (
  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-sm text-blue-800">
      <strong>Thông tin từ chatbot:</strong>
      {prefilledData.doctorName && <span>👨‍⚕️ Bác sĩ: {prefilledData.doctorName}</span>}
      {prefilledData.notes && <span>📝 Triệu chứng: {prefilledData.notes}</span>}
    </p>
  </div>
)}
```

#### **Gợi ý tự động:**
```jsx
{prefilledData?.doctorName && !selectedDoctorId && (
  <p className="text-sm text-blue-600 mt-1">
    💡 Gợi ý: {prefilledData.doctorName} - {prefilledData.specialty}
  </p>
)}
```

## 🔄 Luồng dữ liệu

### **1. Thu thập thông tin từ chatbot**

```javascript
const navigateToAppointments = (doctor, symptoms) => {
  const params = new URLSearchParams();
  
  if (doctor) {
    params.set('doctorId', doctor._id);
    params.set('doctorName', doctor.fullName);
    params.set('specialty', doctor.specialty);
  }
  
  if (symptoms) {
    params.set('notes', symptoms);
  }
  
  if (urgencyLevel !== 'low') {
    params.set('urgency', urgencyLevel);
  }
  
  const url = `/patient/appointments?${params.toString()}`;
  router.push(url);
};
```

### **2. Xử lý thông tin trong appointments page**

```javascript
useEffect(() => {
  const doctorId = searchParams.get('doctorId');
  const doctorName = searchParams.get('doctorName');
  const notesParam = searchParams.get('notes');
  const urgency = searchParams.get('urgency');
  
  if (doctorId) setSelectedDoctorId(doctorId);
  if (notesParam) setNotes(notesParam);
  if (urgency === 'high') setAppointmentType('Khám cấp cứu');
}, [searchParams]);
```

## 🎨 UX/UI Features

### **1. Visual Feedback**

#### **Thông báo chuyển hướng:**
- Alert thông báo thông tin được chuyển
- Card hiển thị thông tin từ chatbot
- Gợi ý tự động điền

#### **Indicators:**
- 💡 Icon cho gợi ý
- 👨‍⚕️ Icon cho bác sĩ
- 📝 Icon cho triệu chứng
- ⚠️ Icon cho mức độ khẩn cấp

### **2. Responsive Design**

#### **Mobile:**
- Card thông tin thu gọn
- Buttons dễ nhấn
- Text readable

#### **Desktop:**
- Layout 2 cột
- Thông tin chi tiết
- Hover effects

## 🔒 Bảo mật và Validation

### **1. Data Validation**

#### **Doctor ID:**
- Kiểm tra tồn tại trong database
- Fallback nếu không tìm thấy

#### **Symptoms:**
- Sanitize input
- Giới hạn độ dài
- Escape special characters

### **2. URL Security**

#### **Parameters:**
- Encode URL parameters
- Validate parameter types
- Sanitize input

#### **Navigation:**
- Safe navigation với Next.js router
- Fallback nếu URL không hợp lệ

## 🧪 Testing

### **1. Test Cases**

#### **Happy Path:**
1. Chat với chatbot
2. Nhận gợi ý bác sĩ
3. Nhấn đặt lịch
4. Chuyển đến appointments page
5. Thông tin được điền sẵn

#### **Edge Cases:**
1. Không có bác sĩ được gợi ý
2. Không có triệu chứng
3. URL parameters không hợp lệ
4. Doctor ID không tồn tại

### **2. Manual Testing**

#### **Steps:**
1. Mở chatbot tại `/patient/chat`
2. Gõ "Tôi bị đau răng"
3. Nhấn "Đặt lịch khám" trong card bác sĩ
4. Kiểm tra thông tin được điền sẵn
5. Đặt lịch thành công

## 🚀 Deployment

### **1. Production Ready**

#### **Features:**
- ✅ Error handling
- ✅ Loading states
- ✅ Validation
- ✅ Responsive design
- ✅ Accessibility

#### **Performance:**
- Lazy loading
- Optimized images
- Efficient state management

### **2. Monitoring**

#### **Analytics:**
- Track conversion rate
- Monitor user flow
- Error tracking

#### **User Feedback:**
- Success rate
- User satisfaction
- Feature usage

---

## 🎉 Kết luận

Tính năng tích hợp chatbot với đặt lịch khám cung cấp trải nghiệm người dùng mượt mà và hiệu quả, giúp:

- **Tiết kiệm thời gian**: Không cần nhập lại thông tin
- **Tăng độ chính xác**: Thông tin được chuyển tự động
- **Cải thiện UX**: Luồng làm việc liền mạch
- **Tăng conversion**: Dễ dàng chuyển từ tư vấn sang đặt lịch

**Tính năng đã sẵn sàng để sử dụng!** 🚀✨
