# Hệ thống Chat Realtime - Smart Dental Healthcare

Hệ thống chat realtime giữa bệnh nhân và bác sĩ được xây dựng dựa trên Socket.io và NestJS.

## 🚀 Tính năng

### ✅ Đã hoàn thành

- **Nhắn tin realtime**: Gửi và nhận tin nhắn tức thời
- **Quản lý cuộc trò chuyện**: Tạo và quản lý các cuộc trò chuyện
- **Trạng thái đang nhập**: Hiển thị khi người khác đang nhập tin nhắn
- **Đánh dấu đã đọc**: Theo dõi tin nhắn đã đọc/chưa đọc
- **Số tin nhắn chưa đọc**: Hiển thị badge số tin nhắn chưa đọc
- **Thu nhỏ/phóng to**: Điều khiển cửa sổ chat
- **Responsive UI**: Giao diện thân thiện trên mọi thiết bị

### 🔄 Có thể mở rộng sau

- Gửi file/hình ảnh
- Cuộc gọi voice/video
- Nhóm chat
- Emoji reactions
- Tin nhắn tự động từ chatbot

## 📁 Cấu trúc thư mục

### Server (NestJS)

```
server/src/modules/realtime-chat/
├── schemas/
│   ├── conversation.schema.ts    # Schema cuộc trò chuyện
│   └── message.schema.ts         # Schema tin nhắn
├── dto/
│   ├── create-conversation.dto.ts
│   ├── send-message.dto.ts
│   └── chat-actions.dto.ts
├── realtime-chat.controller.ts   # REST API endpoints
├── realtime-chat.service.ts      # Business logic
├── realtime-chat.gateway.ts      # WebSocket gateway
└── realtime-chat.module.ts       # Module configuration
```

### Client (Next.js)

```
client/src/
├── components/realtime-chat/
│   ├── ChatButton.tsx            # Nút chat chính
│   ├── ChatWindow.tsx            # Cửa sổ chat
│   ├── ConversationList.tsx      # Danh sách cuộc trò chuyện
│   ├── RealtimeChatManager.tsx   # Quản lý chat tổng thể
│   └── index.ts                  # Export file
├── contexts/
│   └── RealtimeChatContext.tsx   # React Context
├── services/
│   └── realtimeChatService.ts    # Socket.io service
└── components/chat/
    └── ChatIntegration.tsx       # Component tích hợp
```

## 🛠️ Cài đặt

### 1. Server Dependencies

```bash
cd server
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### 2. Client Dependencies

```bash
cd client
npm install socket.io-client
```

## 📖 Cách sử dụng

### 1. Tích hợp vào ứng dụng

Thêm `RealtimeChatProvider` vào root layout:

```tsx
// app/layout.tsx hoặc providers/ClientProviders.tsx
import { RealtimeChatProvider } from "@/contexts/RealtimeChatContext";

export default function ClientProviders({ children }) {
  return <RealtimeChatProvider>{children}</RealtimeChatProvider>;
}
```

### 2. Sử dụng trong component

```tsx
import { ChatIntegration } from "@/components/chat/ChatIntegration";

export default function MyPage() {
  return (
    <div>
      {/* Nội dung trang của bạn */}

      {/* Chat sẽ xuất hiện ở góc dưới phải */}
      <ChatIntegration />
    </div>
  );
}
```

### 3. Sử dụng với danh sách users

```tsx
import { ChatIntegration } from "@/components/chat/ChatIntegration";

export default function DoctorPage() {
  const [patients, setPatients] = useState([]);

  // Load danh sách bệnh nhân...

  return (
    <div>
      {/* Nội dung trang */}

      <ChatIntegration
        patientsList={patients} // Cho bác sĩ
      />
    </div>
  );
}
```

## 🔧 API Endpoints

### REST API

- `GET /realtime-chat/conversations` - Lấy danh sách cuộc trò chuyện
- `GET /realtime-chat/conversations/:id` - Lấy thông tin cuộc trò chuyện
- `GET /realtime-chat/conversations/:id/messages` - Lấy tin nhắn
- `POST /realtime-chat/conversations` - Tạo cuộc trò chuyện mới
- `POST /realtime-chat/conversations/:id/messages` - Gửi tin nhắn
- `GET /realtime-chat/conversations/with/:userId` - Tìm/tạo cuộc trò chuyện với user

### WebSocket Events

#### Client → Server

- `joinConversation` - Tham gia cuộc trò chuyện
- `leaveConversation` - Rời cuộc trò chuyện
- `sendMessage` - Gửi tin nhắn
- `markMessageRead` - Đánh dấu đã đọc
- `typing` - Trạng thái đang nhập

#### Server → Client

- `newMessage` - Tin nhắn mới
- `messageRead` - Tin nhắn đã được đọc
- `conversationUpdated` - Cuộc trò chuyện được cập nhật
- `userTyping` - User đang nhập
- `userOnline/userOffline` - Trạng thái online

## 🎨 UI/UX

### Nút Chat

- **Nút xanh**: Xem danh sách cuộc trò chuyện
- **Nút xanh lá**: Bắt đầu chat mới
- **Badge đỏ**: Số tin nhắn chưa đọc

### Cửa sổ Chat

- **Header**: Thông tin người chat, nút điều khiển
- **Messages**: Danh sách tin nhắn với timestamp
- **Input**: Ô nhập tin nhắn với nút gửi
- **Typing**: Hiển thị "đang nhập..."

### Danh sách Cuộc trò chuyện

- **Avatar**: Ảnh đại diện hoặc chữ cái đầu
- **Tên**: Tên người dùng + chuyên khoa (nếu là bác sĩ)
- **Preview**: Tin nhắn cuối cùng
- **Time**: Thời gian tin nhắn cuối
- **Badge**: Số tin nhắn chưa đọc

## 🔐 Bảo mật

- **JWT Authentication**: Xác thực qua JWT token
- **Room-based**: Chỉ participants mới có thể tham gia cuộc trò chuyện
- **Input Validation**: Kiểm tra dữ liệu đầu vào
- **Permission Check**: Kiểm tra quyền trước khi thực hiện action

## 🚀 Triển khai

### Environment Variables

#### Server (.env)

```
MONGODB_URI=mongodb://localhost:27017/smart-dental
JWT_SECRET=your-jwt-secret
```

#### Client (.env.local)

```
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

### Docker Support

Hệ thống hỗ trợ triển khai qua Docker với `docker-compose.yml` có sẵn.

## 🐛 Debug & Troubleshooting

### Kiểm tra kết nối

```js
// Client
import { realtimeChatService } from "@/services/realtimeChatService";
console.log("Connected:", realtimeChatService.isConnected());
```

### Log events

```js
// Client
realtimeChatService.on("connect", () => console.log("Connected"));
realtimeChatService.on("disconnect", () => console.log("Disconnected"));
```

### Server logs

Kiểm tra logs trong NestJS console để debug các sự kiện Socket.io.

## 📝 Notes

- **TypeScript errors**: Một số lỗi TypeScript nhỏ được bỏ qua theo yêu cầu
- **Extensible**: Code được thiết kế để dễ dàng mở rộng thêm tính năng
- **Performance**: Sử dụng MongoDB indexes và Socket.io rooms để tối ưu hiệu suất
- **Mobile Ready**: UI responsive hoạt động tốt trên mobile

## 🤝 Đóng góp

Để thêm tính năng mới:

1. Tạo DTO và validation rules
2. Update service methods
3. Add REST API endpoints
4. Implement WebSocket events
5. Create/update UI components
6. Test thoroughly

---

Hệ thống chat đã sẵn sàng sử dụng! 🎉
