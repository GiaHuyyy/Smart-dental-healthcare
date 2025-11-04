# 🚀 Hướng Dẫn Build & Test Call Features

## ✅ Đã Hoàn Thành

### 1. Code Implementation
- ✅ WebRTC Service (450+ lines) - Core logic
- ✅ Call Context Provider (450+ lines) - State management  
- ✅ Call UI Components:
  - CallButton - Nút bắt đầu cuộc gọi
  - IncomingCallModal - Modal nhận cuộc gọi (với animations)
  - CallScreen - Màn hình cuộc gọi chính
  - CallMessageBubble - Hiển thị call history
- ✅ Integration vào chat header
- ✅ CallProvider added to app layout
- ✅ Call route created

### 2. Dependencies Installed
```bash
✅ react-native-webrtc
✅ expo-av
✅ expo-camera
✅ expo-blur
✅ @expo/vector-icons
✅ socket.io-client
```

### 3. Permissions Configured
- ✅ iOS: NSCameraUsageDescription, NSMicrophoneUsageDescription, NSBluetoothAlwaysUsageDescription
- ✅ Android: CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, BLUETOOTH, BLUETOOTH_CONNECT
- ✅ Expo plugins: expo-camera, expo-av

### 4. All TypeScript Errors Fixed
- ✅ Colors import paths
- ✅ RTCPeerConnection event handlers
- ✅ Auth context integration
- ✅ Type definitions

---

## 🔨 Bước Tiếp Theo: Build Development App

### ⚠️ LƯU Ý QUAN TRỌNG
`react-native-webrtc` là **native module**, KHÔNG thể chạy trên Expo Go!
Bạn PHẢI build development app.

### Bước 1: Prebuild
```bash
cd mobile
npx expo prebuild --clean
```

Lệnh này sẽ:
- Tạo thư mục `android/` và `ios/`
- Config native modules
- Setup permissions
- Prepare build configuration

### Bước 2: Build & Run

#### Android:
```bash
npx expo run:android
```

Yêu cầu:
- Android Studio đã cài đặt
- Android SDK & NDK
- Android Emulator đang chạy HOẶC thiết bị Android kết nối USB
- JDK 17+

#### iOS (Mac only):
```bash
npx expo run:ios
```

Yêu cầu:
- Xcode đã cài đặt
- CocoaPods: `sudo gem install cocoapods`
- iOS Simulator HOẶC iPhone kết nối

### Bước 3: Troubleshooting Build

#### Lỗi thường gặp:

**1. "react-native-webrtc not found"**
```bash
cd mobile
rm -rf node_modules
npm install
npx expo prebuild --clean
```

**2. Android build failed - Gradle error**
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

**3. iOS build failed - Pod install**
```bash
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

**4. "No Java found"**
- Cài JDK 17: https://www.oracle.com/java/technologies/downloads/
- Set JAVA_HOME trong environment variables

**5. Metro bundler error**
```bash
npx expo start --clear
```

---

## 🧪 Testing Checklist

### Phase 1: Basic Audio Call ✅
- [ ] Open app và đăng nhập
- [ ] Vào chat với bác sĩ
- [ ] Click nút gọi audio (phone icon)
- [ ] App yêu cầu microphone permission
- [ ] Grant permission
- [ ] Cuộc gọi bắt đầu
- [ ] Thấy CallScreen hiển thị
- [ ] Timer đếm
- [ ] Toggle mute/unmute
- [ ] End call
- [ ] Quay về chat screen

### Phase 2: Basic Video Call ✅
- [ ] Click nút gọi video (videocam icon)
- [ ] App yêu cầu camera permission
- [ ] Grant permission
- [ ] Thấy local video stream
- [ ] Thấy CallScreen với video
- [ ] Toggle video on/off
- [ ] Switch camera (front/back)
- [ ] Toggle mute
- [ ] End call

### Phase 3: Incoming Call ✅
- [ ] Receiver nhận notification
- [ ] IncomingCallModal hiển thị
- [ ] Thấy pulse animation trên avatar
- [ ] Thấy shake animation trên modal
- [ ] Caller info hiển thị đúng
- [ ] Click Accept
- [ ] Navigate to CallScreen
- [ ] Streams kết nối
- [ ] Test Reject button

### Phase 4: Call Controls ✅
- [ ] Mute/Unmute hoạt động
- [ ] Video on/off hoạt động
- [ ] Switch camera hoạt động
- [ ] End call hoạt động
- [ ] Timer accurate
- [ ] Local video minimizable

### Phase 5: Connection States ✅
- [ ] "Connecting..." hiển thị
- [ ] "Connected" khi establish
- [ ] "Reconnecting..." khi network issue
- [ ] Connection state updates real-time

### Phase 6: Cross-Platform ✅
- [ ] Mobile (Patient) → Web (Doctor) audio call
- [ ] Mobile (Patient) → Web (Doctor) video call
- [ ] Web (Doctor) → Mobile (Patient) incoming
- [ ] Streams sync properly
- [ ] Audio quality good
- [ ] Video quality good

### Phase 7: Edge Cases ✅
- [ ] Permissions denied → Error message
- [ ] Network lost → Reconnecting state
- [ ] App background → Call continues (audio)
- [ ] App foreground → Resume properly
- [ ] Caller cancel before answer
- [ ] Multiple incoming calls handling
- [ ] Battery low scenario

### Phase 8: Call History ✅
- [ ] Call message saved in chat
- [ ] CallMessageBubble renders correctly
- [ ] Call type icon correct (audio/video)
- [ ] Call status correct (missed/answered/completed)
- [ ] Duration displays if completed
- [ ] Timestamp correct

---

## 📊 Performance Metrics

Monitor these during testing:

### Memory Usage:
- Idle: ~50-80 MB
- Audio call: ~80-120 MB
- Video call: ~120-180 MB

### Battery Drain:
- Audio call: ~10-15% per hour
- Video call: ~20-30% per hour

### Network Usage:
- Audio: ~50-100 KB/s
- Video 720p: ~500-1000 KB/s
- Video 1080p: ~1-2 MB/s

### CPU Usage:
- Audio encoding: ~10-15%
- Video encoding: ~30-50%

---

## 🐛 Known Issues & Workarounds

### 1. iOS Simulator - No Camera
**Issue**: iOS Simulator không có camera hardware
**Workaround**: Test trên thiết bị thật hoặc dùng external webcam

### 2. Android Emulator - Camera Issue
**Issue**: Emulator camera quality thấp
**Workaround**: Enable "Virtual camera" trong AVD settings

### 3. Network Firewall
**Issue**: ICE connection failed do firewall
**Workaround**: 
- Check STUN server accessible
- Có thể cần TURN server cho production

### 4. Audio Echo
**Issue**: Nghe thấy echo trong cuộc gọi
**Workaround**: 
- Dùng tai nghe
- Enable echo cancellation (đã có trong constraints)

---

## 📝 Test Report Template

```markdown
## Call Feature Test Report

**Tester**: [Tên]
**Date**: [Ngày test]
**Device**: [Android/iOS] - [Model] - [OS Version]
**Build**: Development Build

### Audio Call
- ✅/❌ Initiate call
- ✅/❌ Receive call
- ✅/❌ Mute/Unmute
- ✅/❌ End call
- ✅/❌ Audio quality
- Notes: [Ghi chú]

### Video Call
- ✅/❌ Initiate call
- ✅/❌ Receive call
- ✅/❌ Local stream
- ✅/❌ Remote stream
- ✅/❌ Toggle video
- ✅/❌ Switch camera
- ✅/❌ Video quality
- Notes: [Ghi chú]

### Edge Cases
- ✅/❌ Permission denied
- ✅/❌ Network issue
- ✅/❌ Background/Foreground
- ✅/❌ Cancel before answer
- Notes: [Ghi chú]

### Performance
- Memory usage: [XX MB]
- Battery drain: [XX% per hour]
- Network usage: [XX KB/s]
- Notes: [Ghi chú]

### Issues Found
1. [Mô tả issue]
2. [Mô tả issue]

### Overall Status
- [ ] Pass - Ready for production
- [ ] Pass with minor issues
- [ ] Fail - Need fixes
```

---

## 🎯 Next Steps After Testing

### If Tests Pass ✅:
1. ✅ Mark all todos complete
2. ✅ Create production build
3. ✅ Deploy to TestFlight/Play Store Beta
4. ✅ User acceptance testing
5. ✅ Production release

### If Issues Found ❌:
1. Document all issues
2. Prioritize (Critical/Major/Minor)
3. Fix critical issues first
4. Re-test after fixes
5. Repeat until pass

---

## 📞 Support

**Nếu gặp issue khi build/test:**

1. Check logs:
   - Android: `adb logcat`
   - iOS: Xcode Console

2. Check network:
   - WebRTC requires internet
   - STUN server phải accessible

3. Check permissions:
   - Settings → App → Permissions
   - Grant Camera + Microphone

4. Reinstall app:
   ```bash
   # Uninstall old version
   # Then rebuild
   npx expo run:android --device
   ```

---

**Happy Testing! 🎉**
