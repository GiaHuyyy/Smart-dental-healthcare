import { Platform } from 'react-native';
import Constants from 'expo-constants';

let webrtc: any;

try {
  if (Platform.OS === 'web') {
    // Use the web shim on web
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    webrtc = require('./webrtc.web').default;
  } else {
    const isExpoGo = (Constants as any)?.executionEnvironment === 'storeClient' || (Constants as any)?.appOwnership === 'expo';

    if (isExpoGo) {
      // Safe mocks for Expo Go to prevent native module access
      class MediaStreamMock {
        toURL(): string { return ''; }
        getTracks(): any[] { return []; }
        getAudioTracks(): any[] { return []; }
        getVideoTracks(): any[] { return []; }
        addTrack(_: any): void {}
      }

      class EmptyClass {}

      const mediaDevicesMock = {
        async getUserMedia() {
          throw new Error('WebRTC requires a development build. Create a dev client: npx expo run:android or npx expo run:ios');
        },
        async enumerateDevices() { return []; },
      };

      const RTCViewMock = () => null;

      webrtc = {
        MediaStream: MediaStreamMock,
        RTCPeerConnection: EmptyClass,
        RTCIceCandidate: EmptyClass,
        RTCSessionDescription: EmptyClass,
        mediaDevices: mediaDevicesMock,
        RTCView: RTCViewMock,
      };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      webrtc = require('react-native-webrtc');
    }
  }
} catch (e) {
  // As a last resort, provide harmless mocks so the app can render
  class MediaStreamMockFallback {
    toURL(): string { return ''; }
    getTracks(): any[] { return []; }
    getAudioTracks(): any[] { return []; }
    getVideoTracks(): any[] { return []; }
    addTrack(_: any): void {}
  }
  const RTCViewMockFallback = () => null;
  webrtc = {
    MediaStream: MediaStreamMockFallback,
    RTCPeerConnection: class {},
    RTCIceCandidate: class {},
    RTCSessionDescription: class {},
    mediaDevices: { async getUserMedia() { throw e; }, async enumerateDevices() { return []; } },
    RTCView: RTCViewMockFallback,
  };
}

export const {
  MediaStream,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  RTCView,
} = webrtc;

export default webrtc;


