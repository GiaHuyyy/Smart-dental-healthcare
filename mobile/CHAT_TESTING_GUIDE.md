# 🧪 Hướng Dẫn Test Tính Năng Chat Mobile

## 📋 Tổng Quan

Trang chat mobile đã được hoàn thiện với các tính năng real-time:
- ✅ **Real-time chat với bác sĩ** qua Socket.IO
- ✅ **AI Chat** với phân tích ảnh
- ✅ **Upload và gửi ảnh** qua socket
- ✅ **Typing indicator** (hiển thị khi đối phương đang gõ)
- ✅ **Connection status** (trạng thái kết nối)
- ✅ **Message status** (sending, sent, failed)

---

## 🚀 Cách Test

### 1️⃣ **Test AI Chat (Đã có sẵn)**

#### Bước 1: Vào trang chat
```
Mở app mobile → Tab "Tin nhắn" → Chọn "Smart Dental AI"
```

#### Bước 2: Test gửi tin nhắn text
- Nhập: "Tôi bị đau răng"
- Kiểm tra: AI trả lời và có gợi ý câu hỏi

#### Bước 3: Test upload và phân tích ảnh
- Nhấn nút **"Phân tích ảnh"**
- Chọn ảnh răng từ thư viện
- Kiểm tra:
  - ✓ Hiển thị preview ảnh
  - ✓ Loading indicator "Đang tải và phân tích..."
  - ✓ AI trả về phân tích chi tiết
  - ✓ Urgency level (low/medium/high)
  - ✓ Suggested doctor (nếu có)

#### Bước 4: Test Quick Topics
- Nhấn vào một trong các chủ đề:
  - "Đau răng kéo dài"
  - "Sau nhổ răng khôn"
  - "Viêm lợi, chảy máu"
- Kiểm tra: Auto-send prompt và nhận response

---

### 2️⃣ **Test Real-time Chat với Bác Sĩ** ⭐ MỚI

#### Chuẩn bị:
1. **Đảm bảo backend đang chạy** trên `http://localhost:8081`
2. **Đăng nhập** với tài khoản bệnh nhân
3. **Cần có ít nhất 1 bác sĩ** trong hệ thống

#### Bước 1: Vào chat với bác sĩ
```
Tab "Tin nhắn" → Danh sách bác sĩ → Chọn 1 bác sĩ → Nhấn vào card
```

Hoặc:
```
Trực tiếp: /chat/[doctorId]?name=[doctorName]&type=doctor
```

#### Bước 2: Kiểm tra kết nối
Quan sát phần **helper notice** (card màu trắng trên cùng):
- ⏳ "Đang kết nối đến máy chủ chat..." → **Connecting**
- ✅ "Đã kết nối • Nhắn tin trực tiếp với [Tên BS]" → **Connected**
- ❌ "Không thể kết nối..." → **Failed** (kiểm tra backend)

#### Bước 3: Test gửi tin nhắn text
1. Nhập: "Xin chào bác sĩ"
2. Nhấn **"Gửi"**

**Kiểm tra:**
- ✓ Message xuất hiện ngay với status "sending" (màu xám)
- ✓ Chuyển sang "sent" sau vài giây
- ✓ Nếu lỗi → status "failed" (màu đỏ)
- ✓ Nút "Gửi" disabled khi đang gửi (hiện spinner)

#### Bước 4: Test typing indicator
1. **Trên mobile**: Bắt đầu gõ tin nhắn
2. **Trên web/client** (nếu bác sĩ đang online):
   - Sẽ thấy "Bệnh nhân đang gõ..."

**Ngược lại:**
- Bác sĩ gõ → Mobile sẽ hiển thị: "[Tên BS] đang gõ..."
- Tự động ẩn sau 3 giây nếu không gõ nữa

#### Bước 5: Test upload ảnh
1. Nhấn nút **"Gửi ảnh"** (icon image, màu xanh lá)
2. Chọn ảnh từ thư viện
3. Kiểm tra:
   - ✓ Preview ảnh trong message
   - ✓ Upload progress (có loading)
   - ✓ Gửi message với URL ảnh
   - ✓ Bác sĩ nhận được ảnh (test trên web)

#### Bước 6: Test nhận tin nhắn từ bác sĩ
**Yêu cầu**: Bác sĩ phải online trên web client

1. Bác sĩ gửi tin nhắn → Mobile nhận ngay lập tức
2. Bác sĩ gửi ảnh → Mobile hiển thị ảnh

---

### 3️⃣ **Test Edge Cases**

#### Test 1: Mất kết nối Internet
1. Tắt WiFi/Data khi đang chat
2. Gửi tin nhắn
3. **Kỳ vọng**: 
   - Message status = "failed"
   - Alert "Không thể gửi tin nhắn"
   - Khi bật lại Internet → Auto-reconnect

#### Test 2: Backend offline
1. Tắt backend server
2. Vào chat với bác sĩ
3. **Kỳ vọng**:
   - "Không thể kết nối đến máy chủ chat"
   - Nút "Gửi" bị disabled

#### Test 3: Gửi tin nhắn dài
1. Nhập >500 ký tự
2. Gửi
3. **Kỳ vọng**: Gửi thành công, message wrap đúng

#### Test 4: Gửi nhiều ảnh liên tiếp
1. Gửi ảnh 1
2. Ngay lập tức gửi ảnh 2
3. **Kỳ vọng**: Cả 2 đều upload thành công

---

## 🔍 Logs để Debug

### Console Logs Quan Trọng:

#### Kết nối thành công:
```
🔌 [Socket] Connecting with userID: xxx, role: patient
✅ [Socket] Connected with ID: yyy
✅ [Chat] Connected to realtime chat
✅ [Chat] Conversation ready: conversationId
```

#### Gửi tin nhắn:
```
📤 [Socket] Sending message to conversationId
✅ [Socket] Message sent successfully
```

#### Nhận tin nhắn:
```
📨 [Socket] Event: newMessage
📨 [Chat] Loaded X messages
```

#### Upload ảnh:
```
📤 [Upload] Starting upload: filename.jpg
📤 [Socket] Uploading image: filename.jpg
✅ [Socket] Image uploaded: https://...
```

#### Lỗi:
```
❌ [Socket] Connection error: ...
❌ [Chat] Failed to send message: ...
❌ [Upload] Upload failed: ...
```

---

## 🐛 Troubleshooting

### Vấn đề: "Không thể kết nối"
**Giải pháp:**
1. Kiểm tra backend đang chạy: `http://localhost:8081/health`
2. Kiểm tra `.env`:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://localhost:8081
   ```
3. Restart expo: `npm run start -- --clear`

### Vấn đề: "Tin nhắn không gửi được"
**Giải pháp:**
1. Kiểm tra conversation đã được tạo chưa
2. Xem console logs
3. Kiểm tra token còn hạn không: `session.token`

### Vấn đề: "Upload ảnh thất bại"
**Giải pháp:**
1. Kiểm tra kích thước ảnh (<10MB)
2. Kiểm tra định dạng (JPEG, PNG, WebP)
3. Kiểm tra socket connection

### Vấn đề: "Typing indicator không hoạt động"
**Giải pháp:**
1. Cả 2 phải online cùng lúc
2. Kiểm tra conversationId giống nhau
3. Backend có emit event `userTyping`

---

## 📱 Test Checklist

### Chat với AI:
- [ ] Gửi tin nhắn text thành công
- [ ] Upload ảnh → Phân tích thành công
- [ ] Quick topics hoạt động
- [ ] Suggested questions click được
- [ ] Quick actions hoạt động
- [ ] Urgency level hiển thị đúng
- [ ] Suggested doctor hiển thị

### Chat với Bác Sĩ:
- [ ] Kết nối socket thành công
- [ ] Connection status hiển thị đúng
- [ ] Gửi tin nhắn text thành công
- [ ] Nhận tin nhắn từ bác sĩ
- [ ] Upload ảnh thành công
- [ ] Nhận ảnh từ bác sĩ
- [ ] Typing indicator hoạt động (2 chiều)
- [ ] Message status (sending/sent/failed) đúng
- [ ] Nút gửi disabled khi chưa kết nối
- [ ] Auto-reconnect khi mất mạng

### Edge Cases:
- [ ] Mất mạng → Message failed
- [ ] Backend offline → Không kết nối được
- [ ] Tin nhắn dài wrap đúng
- [ ] Gửi nhiều ảnh liên tiếp OK

---

## 🎯 Test Script Tự Động (Tùy Chọn)

Nếu muốn test tự động, có thể dùng:

```typescript
// Test connection
await realtimeChatService.connect(token, userId, 'patient');
console.log('Connected:', realtimeChatService.isConnected());

// Test send message
const conversationId = 'xxx';
await realtimeChatService.sendMessage(conversationId, 'Test message', 'text');

// Test upload
const result = await uploadService.uploadImage({
  uri: 'file://...',
  mimeType: 'image/jpeg',
  fileName: 'test.jpg',
}, conversationId);
```

---

## ✅ Kết Luận

Sau khi test xong tất cả các bước trên, bạn có thể tự tin:
- ✅ Chat với AI hoạt động hoàn hảo
- ✅ Chat với bác sĩ real-time hoạt động
- ✅ Upload ảnh qua socket hoạt động
- ✅ Typing indicator hoạt động
- ✅ Connection management ổn định

**Chúc bạn test thành công! 🎉**

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra console logs
2. Kiểm tra backend logs
3. Kiểm tra network tab (nếu dùng web)
4. Test trên web client để so sánh

**Endpoint Backend Quan Trọng:**
- Socket.IO: `ws://localhost:8081/chat`
- Health Check: `http://localhost:8081/health`
- API: `http://localhost:8081/api/v1/...`
