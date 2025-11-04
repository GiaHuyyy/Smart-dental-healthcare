# Hướng Dẫn Cài Đặt Call/Video Call

## Bước 1: Cài đặt dependencies

```bash
cd mobile
npx expo install react-native-webrtc expo-av expo-camera
npx expo install @expo/vector-icons expo-blur
npm install socket.io-client
```

## Bước 2: Cấu hình permissions trong app.json

Thêm vào `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Cho phép $(PRODUCT_NAME) truy cập camera để thực hiện cuộc gọi video.",
          "microphonePermission": "Cho phép $(PRODUCT_NAME) truy cập microphone để thực hiện cuộc gọi."
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "Cho phép $(PRODUCT_NAME) truy cập microphone để thực hiện cuộc gọi."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Cho phép Smart Dental Healthcare truy cập camera để thực hiện cuộc gọi video.",
        "NSMicrophoneUsageDescription": "Cho phép Smart Dental Healthcare truy cập microphone để thực hiện cuộc gọi.",
        "NSBluetoothAlwaysUsageDescription": "Cho phép Smart Dental Healthcare sử dụng Bluetooth để kết nối tai nghe trong cuộc gọi."
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "BLUETOOTH",
        "BLUETOOTH_ADMIN",
        "BLUETOOTH_CONNECT"
      ]
    }
  }
}
```

## Bước 3: Prebuild và Build development app

**LƯU Ý QUAN TRỌNG**: `react-native-webrtc` là native module, không thể chạy trên Expo Go. Bạn PHẢI build development app.

### Android:

```bash
npx expo prebuild --clean
npx expo run:android
```

### iOS:

```bash
npx expo prebuild --clean
npx expo run:ios
```

## Bước 4: Kiểm tra cài đặt

Sau khi build xong, app sẽ tự động mở trên thiết bị/emulator. Kiểm tra:

1. ✅ Đăng nhập vào app
2. ✅ Vào chat với bác sĩ
3. ✅ Click nút gọi điện/video call ở header
4. ✅ App yêu cầu quyền camera/microphone
5. ✅ Cho phép và bắt đầu cuộc gọi

## Các thành phần đã implement

### 1. WebRTC Service (`mobile/services/webrtcService.ts`)
- ✅ Kết nối Socket.IO với namespace `/webrtc`
- ✅ Quản lý RTCPeerConnection
- ✅ Xử lý ICE candidates
- ✅ Tạo offer/answer SDP
- ✅ Quản lý media streams (camera/microphone)
- ✅ Media controls: mute, video on/off, switch camera

### 2. Call Context (`mobile/contexts/CallContext.tsx`)
- ✅ React Context Provider cho call state
- ✅ Auto-connect khi authenticated
- ✅ Event listeners cho all call events
- ✅ Call timer với formatDuration()
- ✅ App state handling (background/foreground)

### 3. UI Components

#### CallButton (`mobile/components/call/CallButton.tsx`)
- ✅ Reusable button cho audio/video call
- ✅ Loading state
- ✅ Disabled khi đang trong call

#### IncomingCallModal (`mobile/components/call/IncomingCallModal.tsx`)
- ✅ Full-screen modal cho incoming call
- ✅ Pulse animation trên avatar
- ✅ Shake animation trên modal
- ✅ BlurView background
- ✅ Accept/Reject buttons

#### CallScreen (`mobile/components/call/CallScreen.tsx`)
- ✅ Full-screen interface cho active call
- ✅ RTCView cho local/remote video streams
- ✅ Control buttons: mute, video, switch camera, end call
- ✅ Call timer display
- ✅ Audio-only mode với avatar placeholder
- ✅ Minimizable local video

### 4. Integration
- ✅ CallProvider added to `mobile/app/_layout.tsx`
- ✅ IncomingCallModal at root level
- ✅ CallButton integrated in chat header (`mobile/app/chat/[id].tsx`)
- ✅ Call route created (`mobile/app/call.tsx`)

## Kiến trúc WebRTC

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App                              │
├─────────────────────────────────────────────────────────────┤
│  CallScreen (UI)                                             │
│      ↓                                                       │
│  CallContext (State Management)                              │
│      ↓                                                       │
│  WebRTCService (Core Logic)                                  │
│      ↓                                                       │
│  Socket.IO Client (/webrtc namespace)                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                   NestJS Backend                             │
├─────────────────────────────────────────────────────────────┤
│  WebRTC Gateway (/webrtc namespace)                          │
│      ↓                                                       │
│  Signal events:                                              │
│    - call-user (offer)                                       │
│    - answer-call (answer)                                    │
│    - ice-candidate                                           │
│    - reject-call                                             │
│    - end-call                                                │
└─────────────────────────────────────────────────────────────┘
                   │
                   ↓ Relay signals
┌─────────────────────────────────────────────────────────────┐
│                  Web Client / Mobile                         │
│                  (Peer Connection)                           │
└─────────────────────────────────────────────────────────────┘
```

## Socket Events

### Client → Server:
- `call-user`: Gửi offer SDP và bắt đầu cuộc gọi
- `answer-call`: Gửi answer SDP để chấp nhận cuộc gọi
- `reject-call`: Từ chối cuộc gọi
- `end-call`: Kết thúc cuộc gọi
- `ice-candidate`: Gửi ICE candidate

### Server → Client:
- `incoming-call`: Thông báo cuộc gọi đến
- `call-answered`: Cuộc gọi đã được chấp nhận
- `call-rejected`: Cuộc gọi bị từ chối
- `call-ended`: Cuộc gọi đã kết thúc
- `ice-candidate`: Nhận ICE candidate từ peer

## Testing Checklist

### Audio Call
- [ ] Bắt đầu audio call từ mobile
- [ ] Nghe thấy âm thanh từ peer
- [ ] Toggle mute/unmute
- [ ] End call
- [ ] Nhận incoming audio call
- [ ] Accept/Reject incoming call

### Video Call
- [ ] Bắt đầu video call từ mobile
- [ ] Thấy local video stream
- [ ] Thấy remote video stream
- [ ] Toggle video on/off
- [ ] Switch camera (front/back)
- [ ] Toggle mute/unmute
- [ ] End call
- [ ] Nhận incoming video call

### Cross-platform
- [ ] Mobile (Patient) ↔ Web (Doctor)
- [ ] Mobile ↔ Mobile
- [ ] Connection state hiển thị đúng
- [ ] Call timer chính xác

### Edge Cases
- [ ] Permissions denied → Show error
- [ ] Network lost → Reconnecting state
- [ ] App background → Call continues
- [ ] App foreground → Resume call
- [ ] Caller cancel before answer
- [ ] Multiple incoming calls

## Troubleshooting

### "react-native-webrtc not found"
→ Chạy `npx expo prebuild --clean` và build lại

### Camera/Microphone permission không hiện
→ Kiểm tra app.json đã config đúng chưa

### Video không hiển thị
→ Kiểm tra RTCView có streamURL đúng không
→ Kiểm tra objectFit="cover"

### Audio không nghe thấy
→ Kiểm tra constraints có audio: true
→ Kiểm tra speaker được enable

### ICE connection failed
→ Kiểm tra STUN server
→ Kiểm tra network/firewall

## Next Steps

Sau khi cài đặt thành công:

1. **Test thoroughly**: Chạy qua toàn bộ test checklist
2. **UI Polish**: Tinh chỉnh animations, colors, sizing
3. **Error Handling**: Thêm error boundaries, retry logic
4. **Call History**: Render call messages trong chat
5. **Notifications**: Thêm push notification cho incoming calls
6. **Performance**: Monitor memory usage, battery drain
7. **Analytics**: Track call duration, quality, success rate

## Resources

- [react-native-webrtc docs](https://github.com/react-native-webrtc/react-native-webrtc)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/)
