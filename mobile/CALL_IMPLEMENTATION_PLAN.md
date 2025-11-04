# 📞 Mobile Call Implementation Plan

## 🎯 Mục tiêu
Triển khai chức năng cuộc gọi Audio/Video cho mobile app đồng bộ với web client

## 📋 Phân tích Architecture hiện tại

### Backend (NestJS + Socket.IO)
- **WebRTC Gateway**: `/webrtc` namespace
- **Events hỗ trợ**:
  - `join-webrtc`: Đăng ký user vào WebRTC
  - `call-user`: Bắt đầu cuộc gọi
  - `incoming-call`: Nhận cuộc gọi đến
  - `answer-call`: Chấp nhận cuộc gọi
  - `reject-call`: Từ chối cuộc gọi
  - `call-ended`: Kết thúc cuộc gọi
  - `ice-candidate`: Trao đổi ICE candidates
- **Call Message System**: Lưu lịch sử cuộc gọi vào database
  - `callType`: 'audio' | 'video'
  - `callStatus`: 'missed' | 'answered' | 'rejected' | 'completed'
  - `callDuration`: Thời lượng cuộc gọi

### Web Client (Next.js + WebRTC)
- **CallProvider Context**: Quản lý toàn bộ call state
- **Components**:
  - `CallButton`: Nút bắt đầu cuộc gọi
  - `IncomingCallDialog`: Modal nhận cuộc gọi
  - `VideoCallInterface`: Màn hình cuộc gọi
- **WebRTC Flow**:
  1. Caller: getUserMedia → createPeerConnection → createOffer → emit 'call-user'
  2. Receiver: Nhận 'incoming-call' → getUserMedia → createAnswer → emit 'answer-call'
  3. Exchange ICE candidates
  4. Connect streams

## 🛠️ Implementation Plan cho Mobile

### Phase 1: Setup WebRTC cho React Native
**Libraries cần thiết**:
```json
{
  "react-native-webrtc": "^124.0.0",
  "socket.io-client": "^4.8.1" // (đã có)
}
```

**Permissions (app.json)**:
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-webrtc",
        {
          "cameraPermission": "Cho phép $(PRODUCT_NAME) truy cập camera để thực hiện cuộc gọi video",
          "microphonePermission": "Cho phép $(PRODUCT_NAME) truy cập microphone để thực hiện cuộc gọi"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Cần truy cập camera để cuộc gọi video",
        "NSMicrophoneUsageDescription": "Cần truy cập microphone để cuộc gọi"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS"
      ]
    }
  }
}
```

### Phase 2: Tạo WebRTC Service
**File**: `mobile/services/webrtcService.ts`

**Chức năng**:
- Connect/Disconnect WebRTC socket
- Create peer connection
- Handle ICE candidates
- Get user media (camera/microphone)
- Stream management
- Call events (incoming, answered, ended)

**API tương tự Web**:
```typescript
class WebRTCService {
  connect(userId: string, userRole: string, userName: string)
  disconnect()
  
  // Call actions
  initiateCall(receiverId: string, receiverName: string, isVideoCall: boolean)
  answerCall(callerId: string, callerName: string, isVideoCall: boolean)
  rejectCall(callerId: string, reason?: string)
  endCall()
  
  // Media controls
  toggleMute()
  toggleVideo()
  switchCamera()
  toggleSpeaker()
  
  // Events
  on(event: string, handler: Function)
  off(event: string, handler: Function)
}
```

### Phase 3: Tạo Call Context Provider
**File**: `mobile/contexts/CallContext.tsx`

**State Management**:
```typescript
interface CallState {
  inCall: boolean
  isReceivingCall: boolean
  isVideoCall: boolean
  
  caller: string | null
  callerName: string
  callerRole: 'doctor' | 'patient'
  
  receiver: string | null
  receiverName: string
  receiverRole: 'doctor' | 'patient'
  
  callStartTime: Date | null
  callDuration: number
  callStatus: 'idle' | 'connecting' | 'connected' | 'ended'
  
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  
  isMuted: boolean
  isVideoOff: boolean
  isSpeakerOn: boolean
}
```

### Phase 4: UI Components

#### 4.1. CallButton Component
**File**: `mobile/components/call/CallButton.tsx`
- Icon buttons for audio/video call
- Integrate vào chat screen header
- Check connection status trước khi gọi

#### 4.2. IncomingCallModal
**File**: `mobile/components/call/IncomingCallModal.tsx`
- Full-screen modal
- Hiển thị thông tin người gọi (name, role, avatar)
- Nút Accept/Reject
- Ringtone sound

#### 4.3. CallScreen
**File**: `mobile/app/call/[id].tsx`
- Full-screen call interface
- Video streams (local + remote)
- Control buttons (mute, video, speaker, switch camera, end)
- Call timer
- Connection status indicator

### Phase 5: Chat Integration

#### 5.1. Call History Messages
**Hiển thị trong chat**:
```typescript
interface CallMessage {
  type: 'call'
  callType: 'audio' | 'video'
  callStatus: 'missed' | 'answered' | 'rejected' | 'completed'
  callDuration: number
  startedAt: Date
  endedAt?: Date
}
```

**UI Design**:
- Missed call: Red icon + "Cuộc gọi nhỡ"
- Answered: Green icon + Duration
- Outgoing: Blue icon + Status

#### 5.2. Chat Header Integration
Update `mobile/app/chat/[id].tsx`:
- Thêm Call buttons vào header (như web client)
- Audio call button
- Video call button

### Phase 6: Features Comparison

| Feature | Web Client | Mobile (Plan) | Status |
|---------|-----------|---------------|--------|
| Audio Call | ✅ | 🔄 | To implement |
| Video Call | ✅ | 🔄 | To implement |
| Call History | ✅ | 🔄 | To implement |
| Incoming Call Modal | ✅ | 🔄 | To implement |
| Mute/Unmute | ✅ | 🔄 | To implement |
| Video On/Off | ✅ | 🔄 | To implement |
| Speaker Toggle | ⚠️ Limited | 🔄 | To implement |
| Switch Camera | ❌ | 🔄 | Mobile only |
| Call Duration | ✅ | 🔄 | To implement |
| Connection Status | ✅ | 🔄 | To implement |

## 📝 Implementation Steps

### Step 1: Install Dependencies
```bash
cd mobile
npx expo install react-native-webrtc
```

### Step 2: Tạo WebRTC Service
- Tạo `webrtcService.ts`
- Implement Socket.IO connection cho `/webrtc` namespace
- Implement peer connection management
- Test connection

### Step 3: Tạo Call Context
- Tạo `CallContext.tsx`
- Integrate WebRTC service
- Implement state management
- Test state updates

### Step 4: UI Components
- CallButton component
- IncomingCallModal component  
- CallScreen component
- Test UI flow

### Step 5: Integration
- Add call buttons to chat header
- Implement call history rendering
- Update message types
- End-to-end testing

### Step 6: Testing & Optimization
- Test Audio call: Mobile ↔ Mobile
- Test Video call: Mobile ↔ Mobile
- Test Cross-platform: Mobile ↔ Web
- Test network conditions
- Optimize battery usage
- Handle edge cases (interruptions, permissions, etc.)

## 🔧 Technical Considerations

### React Native WebRTC
- **Pros**: Native performance, full WebRTC support
- **Cons**: Large bundle size (~20MB), complex setup
- **Alternative**: Consider `@daily-co/react-native-daily-js` for simpler implementation

### Permission Handling
```typescript
import { Camera } from 'expo-camera';
import * as Permissions from 'expo-permissions';

async function requestPermissions(isVideoCall: boolean) {
  const { status: audioStatus } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
  
  if (isVideoCall) {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    return audioStatus === 'granted' && cameraStatus === 'granted';
  }
  
  return audioStatus === 'granted';
}
```

### Background Handling
- Use `expo-task-manager` for background calls
- Handle app state changes (foreground/background)
- Save call state to AsyncStorage

### Push Notifications
- Integrate with FCM/APNs for incoming call notifications
- VoIP push notifications for iOS (CallKit)
- Android: Full-screen intent for incoming calls

## 🎨 UI/UX Design

### Call Screen Layout
```
┌─────────────────────────────┐
│     [Camera Preview]        │ ← Remote video (full screen)
│                             │
│                             │
│                             │
│     ┌─────────────┐        │
│     │ Local Video │        │ ← Floating local video
│     └─────────────┘        │
│                             │
│  👤 Dr. Tran Chi Bao       │ ← Name overlay
│  ⏱️  05:23                  │ ← Timer
│                             │
│  [🔇] [📹] [🔊] [🔄] [📞]  │ ← Controls
└─────────────────────────────┘
```

### Incoming Call Modal
```
┌─────────────────────────────┐
│                             │
│      [Avatar Image]         │
│                             │
│   Dr. Tran Chi Bao          │
│   Cuộc gọi video đến...     │
│                             │
│    [❌ Từ chối]  [✅ Chấp nhận]  │
│                             │
└─────────────────────────────┘
```

## 📊 Priority & Timeline

### High Priority (Week 1)
- ✅ Research & Planning (Done)
- 🔄 Setup dependencies
- 🔄 WebRTC Service basic
- 🔄 Audio call only

### Medium Priority (Week 2)
- 🔄 Call Context
- 🔄 IncomingCallModal
- 🔄 CallScreen basic
- 🔄 Video call support

### Low Priority (Week 3)
- 🔄 Call history UI
- 🔄 Advanced features (switch camera, speaker)
- 🔄 Polish UI/UX
- 🔄 Cross-platform testing

## 🚀 Quick Start Implementation

Bắt đầu với:
1. ✅ Install `react-native-webrtc`
2. ✅ Tạo `webrtcService.ts` cơ bản
3. ✅ Test audio call giữa 2 mobile devices
4. ✅ Expand to video call
5. ✅ Add UI components

---

**Note**: Document này sẽ được update theo tiến độ implementation.
