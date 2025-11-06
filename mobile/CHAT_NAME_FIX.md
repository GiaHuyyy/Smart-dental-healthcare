# Chat Patient Name Display Fix - FINAL SOLUTION

## Vấn đề
Tên bệnh nhân không hiển thị đúng trong:
1. Danh sách chat (chat.tsx) - hiện "Bệnh nhân" thay vì tên thật
2. Chi tiết chat ([id].tsx) - cũng hiện "Bệnh nhân"

## Nguyên nhân chính - SOCKET.IO vs REST API

### Phát hiện quan trọng

**Patient Chat** (hoạt động tốt) sử dụng **REST API**:
```typescript
// File: mobile/app/(tabs)/chat.tsx
const response = await apiRequest<Conversation[]>(
  `/api/v1/realtime-chat/conversations?userId=${userId}&userRole=${userRole}`,
  {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.token}` },
  }
);

// Direct access to fullName
const doctorName = conversation.doctorId.fullName; // ✅ Works!
```

**Doctor Chat** (có vấn đề) sử dụng **Socket.IO**:
```typescript
// File: mobile/app/(doctor)/chat.tsx (cũ)
await realtimeChatService.loadConversations();

socket.on('conversationsLoaded', (data) => {
  // patientId không được populate đầy đủ
  // fullName = undefined ❌
});
```

### Vấn đề backend
- REST API endpoint `/api/v1/realtime-chat/conversations` **POPULATE đầy đủ** patientId và doctorId
- Socket.IO event `loadConversations` **KHÔNG POPULATE đúng** hoặc thiếu field `fullName`

## Giải pháp - Thống nhất dùng REST API

### Thay đổi chính trong `mobile/app/(doctor)/chat.tsx`

#### 1. Import thêm apiRequest
```typescript
import { apiRequest } from '@/utils/api';
```

#### 2. Thêm hàm fetchConversations (giống patient chat)
```typescript
const fetchConversations = useCallback(async () => {
  if (!session?.user?._id || !session?.token) return;

  try {
    const userId = session.user._id;
    const userRole = 'doctor';
    
    console.log('📡 [Doctor Chat] Loading conversations from REST API...');
    
    const response = await apiRequest<ChatConversation[]>(
      `/api/v1/realtime-chat/conversations?userId=${userId}&userRole=${userRole}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      }
    );

    if (response.data) {
      const items: ConversationItem[] = response.data.map((conv) => {
        const patient = conv.patientId;
        const patientName = patient.fullName || patient.name || 'Bệnh nhân';
        
        return {
          id: conv._id,
          patientId: patient._id,
          patientName, // ✅ Now has the real name!
          patientAvatar: patient.avatar,
          patientEmail: patient.email,
          lastMessage: conv.lastMessage?.content || 'Chưa có tin nhắn',
          lastMessageTime: conv.lastMessage?.createdAt || conv.updatedAt,
          unreadCount: conv.unreadDoctorCount || 0,
        };
      });
      
      setConversations(items);
      setFilteredConversations(items);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [session]);
```

#### 3. Sửa useEffect - Load via REST API thay vì Socket
```typescript
useEffect(() => {
  if (!session?.user?._id || !session?.token) return;

  const initializeChat = async () => {
    try {
      // Connect to socket for real-time updates
      await realtimeChatService.connect(session.token, session.user._id, 'doctor');
      
      // Setup real-time listeners
      setupSocketListeners();
      
      // Load initial conversations via REST API ✅
      await fetchConversations();
      
      console.log('✅ Chat initialized');
    } catch (error) {
      console.error('Error initializing chat:', error);
      setLoading(false);
    }
  };

  initializeChat();

  return () => {
    realtimeChatService.disconnect();
  };
}, [session, fetchConversations]);
```

#### 4. Đơn giản hóa setupSocketListeners
Chỉ lắng nghe real-time events, **KHÔNG** load conversations nữa:

```typescript
const setupSocketListeners = () => {
  const socket = realtimeChatService.getSocket();
  if (!socket) return;

  // ❌ REMOVED: conversationsLoaded event handler
  
  // ✅ KEEP: Real-time updates only
  socket.on('newMessage', (data) => {
    // Update existing conversation
  });
  
  socket.on('conversationCreated', (conversation) => {
    // Add new conversation
  });
};
```

#### 5. Sửa onRefresh
```typescript
const onRefresh = useCallback(() => {
  setRefreshing(true);
  fetchConversations(); // ✅ Use REST API
}, [fetchConversations]);
```

## So sánh: Trước và Sau

### TRƯỚC (Socket.IO - Có vấn đề)
```
Flow:
1. Connect Socket ✅
2. Emit 'loadConversations' ✅
3. Listen 'conversationsLoaded' ✅
4. Receive data ❌ patientId.fullName = undefined
5. Display "Bệnh nhân" ❌
```

### SAU (REST API - Hoạt động tốt)
```
Flow:
1. Connect Socket (chỉ cho real-time updates) ✅
2. GET /api/v1/realtime-chat/conversations ✅
3. Receive fully populated data ✅
4. patient.fullName = "Nguyễn Văn A" ✅
5. Display real name ✅
```

## Lợi ích của giải pháp mới

1. ✅ **Consistency**: Doctor chat và Patient chat dùng CÙNG endpoint REST API
2. ✅ **Reliability**: REST API được backend populate đầy đủ data
3. ✅ **Simplicity**: Code rõ ràng hơn, dễ debug
4. ✅ **Real-time**: Vẫn giữ Socket.IO cho `newMessage` và `conversationCreated`

## Cách test

### 1. Reload app
```bash
r  # Press 'r' in Metro terminal
```

### 2. Mở tab Chat của doctor
Kiểm tra console logs:
```
📡 [Doctor Chat] Loading conversations from REST API...
✅ [Doctor Chat] Loaded 3 conversations
🔍 FULL FIRST CONVERSATION: {
  "patientId": {
    "_id": "...",
    "fullName": "Nguyễn Văn A",  // ✅ Present!
    "email": "...",
    "avatar": "..."
  }
}
🔍 Processing conversation: ...
🔍 Patient data: {
  "_id": "...",
  "fullName": "Nguyễn Văn A",  // ✅ Present!
  ...
}
✅ Final patientName: Nguyễn Văn A  // ✅ Correct!
```

### 3. Xem danh sách
Mỗi conversation nên hiển thị **tên thật** của bệnh nhân.

### 4. Click vào conversation
Header chat detail nên hiển thị **tên thật** của bệnh nhân.

## Files đã sửa

### mobile/app/(doctor)/chat.tsx
**Changes:**
1. ✅ Import `apiRequest` từ `@/utils/api`
2. ✅ Thêm `fetchConversations()` function (REST API)
3. ✅ Sửa `useEffect` - gọi `fetchConversations()` thay vì `loadConversations()`
4. ✅ Đơn giản hóa `setupSocketListeners()` - xóa `conversationsLoaded` handler
5. ✅ Sửa `onRefresh` - gọi `fetchConversations()`
6. ✅ Thêm extensive logging để debug

### mobile/app/(doctor)/chat/[id].tsx
**No changes needed** - Đã nhận params đúng từ navigation

## Kết quả

- ✅ Tên bệnh nhân hiển thị đúng trong danh sách chat
- ✅ Tên bệnh nhân hiển thị đúng trong header chat detail
- ✅ Avatar, email bệnh nhân được truyền đúng
- ✅ Real-time updates vẫn hoạt động (newMessage, conversationCreated)
- ✅ Pull-to-refresh hoạt động
- ✅ Code đơn giản, nhất quán với patient chat

## Lưu ý cho Backend Team

Nếu muốn Socket.IO cũng hoạt động:
```javascript
// server/src/socket/chat.socket.js
socket.on('loadConversations', async ({ userId, userRole }) => {
  const conversations = await Conversation.find(query)
    .populate('patientId', 'fullName email avatar') // ← Ensure fullName is populated
    .populate('doctorId', 'fullName email avatar specialty')
    .populate('lastMessage')
    .sort('-updatedAt');
  
  socket.emit('conversationsLoaded', { conversations });
});
```

Nhưng vì REST API đã hoạt động tốt, không cần thiết phải sửa Socket.IO endpoint này.
