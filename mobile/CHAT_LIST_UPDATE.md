# 📝 Chat List - Chỉ Hiển Thị Conversations

## 🎯 Thay đổi

### Trước đây ❌
- Hiển thị **TẤT CẢ** bác sĩ trong hệ thống
- API: `GET /api/v1/users/doctors`
- Response: Danh sách tất cả doctors
- Vấn đề: User thấy cả bác sĩ chưa từng nhắn tin

### Bây giờ ✅
- Chỉ hiển thị **bác sĩ đã có cuộc trò chuyện**
- API: `GET /api/v1/chat/conversations`
- Response: Danh sách conversations của patient
- Lợi ích: Chỉ thấy bác sĩ đã nhắn tin, như WhatsApp/Messenger

---

## 🔧 Chi tiết thay đổi

### 1. Types mới
```typescript
type Conversation = {
  _id: string;
  patientId: string | { _id: string };
  doctorId: Doctor;  // Populated doctor info
  lastMessage?: Message;
  unreadPatientCount?: number;
  unreadDoctorCount?: number;
  updatedAt: string;
};

type Message = {
  _id: string;
  content: string;
  createdAt: string;
  senderId: string | { _id: string };
  messageType?: string;
};
```

### 2. API Call thay đổi
**Trước:**
```typescript
const response = await apiRequest<Doctor[]>('/api/v1/users/doctors', {
  method: 'GET',
  headers: { Authorization: `Bearer ${session.token}` },
});
```

**Sau:**
```typescript
const response = await apiRequest<Conversation[]>('/api/v1/chat/conversations', {
  method: 'GET',
  headers: { Authorization: `Bearer ${session.token}` },
});
```

### 3. Hiển thị thông tin
Từ mỗi conversation, extract:
- **Doctor info**: `conversation.doctorId` (doctor object)
- **Last message**: `conversation.lastMessage?.content`
- **Last message time**: Format từ `conversation.lastMessage?.createdAt`
- **Unread count**: `conversation.unreadPatientCount`

### 4. Format thời gian
```typescript
const formatMessageTime = (dateString: string) => {
  const diffMins = Math.floor((now - date) / 60000);
  const diffHours = Math.floor((now - date) / 3600000);
  const diffDays = Math.floor((now - date) / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút`;
  if (diffHours < 24) return `${diffHours} giờ`;
  if (diffDays < 7) return `${diffDays} ngày`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};
```

### 5. Empty State
Khi chưa có conversation:
```
🗨️ Chưa có cuộc trò chuyện nào
Đặt lịch khám và chat với bác sĩ để bắt đầu cuộc trò chuyện
```

---

## 📱 UI Changes

### Chat List Header
**Trước:**
```
Bác sĩ (15)  🔄
```

**Sau:**
```
Cuộc trò chuyện (3)  🔄
```

### Chat Item
```
┌─────────────────────────────────┐
│ 🩺  BS. Nguyễn Văn A            │
│     Nha Khoa Tổng Quát • 10...  │
│     Lịch khám đã được đặt       │ 2 giờ
│                                3 │
└─────────────────────────────────┘
```
- **Tên bác sĩ**: `doctor.fullName`
- **Specialty**: `doctor.specialty`
- **Last message**: `conversation.lastMessage.content`
- **Time**: Relative time (2 giờ, 1 ngày, etc.)
- **Badge**: Unread count

---

## 🧪 Testing

### Test Case 1: Chưa có conversation
1. Login với tài khoản mới
2. Vào tab "Tin nhắn"
3. ✅ Thấy "Smart Dental AI"
4. ✅ Thấy empty state "Chưa có cuộc trò chuyện nào"
5. ❌ KHÔNG thấy danh sách tất cả bác sĩ

### Test Case 2: Có 1 conversation
1. Đặt lịch khám với bác sĩ A
2. Bác sĩ gửi tin nhắn: "Xin chào, hẹn gặp bạn"
3. Vào tab "Tin nhắn"
4. ✅ Thấy "Cuộc trò chuyện (1)"
5. ✅ Thấy bác sĩ A với last message
6. ✅ Thấy thời gian "Vừa xong"

### Test Case 3: Nhiều conversations
1. Có 3 conversations với 3 bác sĩ khác nhau
2. Vào tab "Tin nhắn"
3. ✅ Thấy "Cuộc trò chuyện (3)"
4. ✅ Sắp xếp theo thời gian (mới nhất trên cùng)
5. ✅ Unread count hiển thị đúng

### Test Case 4: Tìm kiếm
1. Có 3 conversations
2. Gõ tìm kiếm "Nguyễn"
3. ✅ Chỉ hiện conversations với bác sĩ có tên "Nguyễn"
4. Xóa search
5. ✅ Hiện lại tất cả

### Test Case 5: Click vào conversation
1. Click vào conversation với bác sĩ A
2. ✅ Mở chat screen với bác sĩ A
3. ✅ Load tin nhắn cũ từ conversation
4. ✅ Header hiện tên bác sĩ + nút call

---

## 🔍 API Endpoint Info

### GET `/api/v1/chat/conversations`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "conv123",
      "patientId": "patient456",
      "doctorId": {
        "_id": "doc789",
        "firstName": "Nguyễn",
        "lastName": "Văn A",
        "fullName": "BS. Nguyễn Văn A",
        "specialty": "Nha Khoa Tổng Quát",
        "experienceYears": 10,
        "rating": 4.8
      },
      "lastMessage": {
        "_id": "msg001",
        "content": "Xin chào, hẹn gặp bạn lúc 9h sáng mai",
        "createdAt": "2025-11-04T08:30:00.000Z",
        "senderId": "doc789"
      },
      "unreadPatientCount": 2,
      "unreadDoctorCount": 0,
      "updatedAt": "2025-11-04T08:30:00.000Z"
    }
  ]
}
```

**Error Cases:**
- `401 Unauthorized`: Token không hợp lệ
- `404 Not Found`: Endpoint không tồn tại (check backend)
- `500 Internal Server Error`: Lỗi server

---

## 🚀 Benefits

### User Experience
✅ **Cleaner UI**: Không overwhelm user với danh sách bác sĩ dài
✅ **Context**: User nhìn thấy ngay tin nhắn cuối và thời gian
✅ **Unread badges**: Biết ngay có bao nhiêu tin nhắn chưa đọc
✅ **Familiar**: Giống WhatsApp, Messenger, Zalo

### Performance
✅ **Faster load**: Chỉ load conversations thay vì tất cả doctors
✅ **Relevant data**: Chỉ fetch data user thực sự cần
✅ **Less bandwidth**: Response nhỏ hơn

### Business Logic
✅ **Privacy**: User chỉ thấy bác sĩ đã tương tác
✅ **Engagement**: Tập trung vào conversations đang active
✅ **Scalability**: Dễ thêm features (pin conversation, archive, mute)

---

## 📊 Comparison: Web vs Mobile

| Feature | Web | Mobile | Status |
|---------|-----|--------|--------|
| Load conversations only | ✅ | ✅ | **PARITY** |
| Last message preview | ✅ | ✅ | Parity |
| Unread count badge | ✅ | ✅ | Parity |
| Relative time format | ✅ | ✅ | Parity |
| Search conversations | ✅ | ✅ | Parity |
| Empty state UI | ❌ | ✅ | **BETTER** |

---

## 🐛 Troubleshooting

### Issue 1: Empty list khi đã có conversation
**Triệu chứng:** Đã nhắn tin với bác sĩ nhưng list vẫn trống

**Debug:**
1. Check API response:
```javascript
console.log('Conversations:', response.data);
```
2. Verify token:
```javascript
console.log('Token:', session?.token);
```
3. Check backend logs: API có trả về data không?

**Giải pháp:**
- Đảm bảo backend API `/api/v1/chat/conversations` hoạt động
- Verify conversation được tạo trong DB
- Check populate doctor info trong API

### Issue 2: Không thấy last message
**Triệu chứng:** Conversation hiện nhưng không có preview message

**Debug:**
```javascript
console.log('Last message:', conversation.lastMessage);
```

**Giải pháp:**
- Backend cần populate `lastMessage` field
- Fallback: `conversation.lastMessage?.content ?? 'Chưa có tin nhắn'`

### Issue 3: Thời gian không đúng
**Triệu chứng:** "Invalid Date" hoặc time sai

**Debug:**
```javascript
console.log('createdAt:', conversation.lastMessage?.createdAt);
console.log('Parsed date:', new Date(conversation.lastMessage?.createdAt));
```

**Giải pháp:**
- Đảm bảo `createdAt` là ISO string
- Handle timezone offset nếu cần

---

## 🎯 Next Steps

### Future Enhancements
1. **Sort options**: Mới nhất, chưa đọc, tên A-Z
2. **Pin conversations**: Ghim cuộc trò chuyện quan trọng
3. **Archive**: Ẩn conversations cũ
4. **Mute**: Tắt thông báo cho conversation
5. **Delete**: Xóa cuộc trò chuyện
6. **Read receipts**: Tích xanh khi bác sĩ đã đọc
7. **Typing indicator in list**: "BS. A đang soạn tin..."

### Performance Optimization
1. **Pagination**: Load 20 conversations/page
2. **Virtual list**: Render only visible items
3. **Cache**: Store conversations in AsyncStorage
4. **Optimistic updates**: Update UI trước khi API response

---

## ✅ Checklist

Deploy checklist:

- [x] Sửa API endpoint từ `/doctors` → `/conversations`
- [x] Update types (Conversation, Message)
- [x] Format message time
- [x] Display last message preview
- [x] Show unread count badge
- [x] Empty state UI
- [x] Search functionality
- [x] Handle click → navigate to chat
- [ ] Test với backend API
- [ ] Verify conversations load
- [ ] Check real-time updates
- [ ] Test search
- [ ] Test empty state

---

## 📞 Support

Nếu gặp vấn đề:
1. Check backend server running: `http://localhost:8081`
2. Verify API endpoint: `GET /api/v1/chat/conversations`
3. Check console logs cho errors
4. Verify token trong headers

Backend team cần implement:
- ✅ `GET /api/v1/chat/conversations`
- ✅ Populate `doctorId` với full doctor info
- ✅ Populate `lastMessage` với message content
- ✅ Calculate `unreadPatientCount`
- ✅ Sort by `updatedAt` descending

---

**🎉 Hoàn tất! Giờ chat list giống WhatsApp rồi!**
