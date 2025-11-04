# 📞 Call Feature Setup Guide

## Step 1: Install Dependencies

```bash
cd mobile

# Install react-native-webrtc
npx expo install react-native-webrtc

# Install required permissions packages
npx expo install expo-av expo-camera
```

## Step 2: Update app.json

Thêm vào `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-webrtc",
        {
          "cameraPermission": "Cho phép $(PRODUCT_NAME) truy cập camera để thực hiện cuộc gọi video với bác sĩ",
          "microphonePermission": "Cho phép $(PRODUCT_NAME) truy cập microphone để thực hiện cuộc gọi với bác sĩ"
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Cho phép truy cập camera để cuộc gọi video"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Smart Dental cần truy cập camera để thực hiện cuộc gọi video với bác sĩ",
        "NSMicrophoneUsageDescription": "Smart Dental cần truy cập microphone để thực hiện cuộc gọi với bác sĩ"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "BLUETOOTH",
        "BLUETOOTH_CONNECT"
      ]
    }
  }
}
```

## Step 3: Prebuild (Required for native modules)

```bash
# Clear previous builds
npx expo prebuild --clean

# For development
npx expo run:android
# hoặc
npx expo run:ios
```

**Lưu ý**: `react-native-webrtc` là native module nên không chạy được với Expo Go. Phải build development build hoặc production build.

## Step 4: Test Installation

Tạo file test `mobile/test-webrtc.tsx`:

```typescript
import React, { useEffect, from 'react';
import { View, Text, Button } from 'react-native';
import { mediaDevices, RTCView } from 'react-native-webrtc';

export default function TestWebRTC() {
  const [stream, setStream] = React.useState(null);

  const startCamera = async () => {
    try {
      const mediaStream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });
      
      setStream(mediaStream);
      console.log('✅ Camera started successfully');
    } catch (error) {
      console.error('❌ Error starting camera:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {stream && (
        <RTCView
          streamURL={stream.toURL()}
          style={{ flex: 1 }}
        />
      )}
      <Button title="Start Camera" onPress={startCamera} />
    </View>
  );
}
```

## Next Steps

Sau khi setup xong:
1. ✅ Test camera/microphone access
2. ✅ Tạo WebRTC Service
3. ✅ Tạo Call Context
4. ✅ Build UI Components

---

**Troubleshooting**:

### Lỗi: "Unable to resolve module react-native-webrtc"
- Chạy `npx expo prebuild --clean`
- Rebuild app: `npx expo run:android` or `npx expo run:ios`

### Lỗi: Camera permission denied
- Check `app.json` permissions
- Rebuild app
- Cấp quyền trong Settings

### Lỗi: "Expo Go not supported"
- `react-native-webrtc` cần native build
- Dùng `npx expo run:android` thay vì Expo Go
