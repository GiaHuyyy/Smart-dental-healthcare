/**
 * Web platform WebRTC implementation using browser's native WebRTC API
 * This file is used instead of react-native-webrtc when Platform.OS === 'web'
 */

// Import React for RTCView component
import * as React from "react";

// Check if we're in browser environment
const isBrowser = typeof window !== "undefined";

// Base class for MediaStream (fallback for SSR)
class MediaStreamBase {}

// Get the actual MediaStream class (browser or fallback)
const MediaStreamParent = isBrowser && typeof window.MediaStream !== "undefined" ? window.MediaStream : MediaStreamBase;

// MediaStream class with toURL() method for compatibility
export class MediaStream extends MediaStreamParent {
  toURL(): string {
    // Generate a unique URL for the stream
    // This is used by RTCView to identify the stream
    if ((this as any).id) {
      return `webrtc://${(this as any).id}`;
    }
    return "";
  }
}

// Export browser's WebRTC APIs (only in browser)
export const RTCPeerConnection =
  isBrowser && typeof window.RTCPeerConnection !== "undefined" ? window.RTCPeerConnection : (class {} as any);

export const RTCIceCandidate =
  isBrowser && typeof window.RTCIceCandidate !== "undefined" ? window.RTCIceCandidate : (class {} as any);

export const RTCSessionDescription =
  isBrowser && typeof window.RTCSessionDescription !== "undefined" ? window.RTCSessionDescription : (class {} as any);

// Use browser's native mediaDevices
// Media devices API
export const mediaDevices = {
  getUserMedia: async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
    if (!isBrowser) {
      throw new Error("WebRTC is only available in browser environment");
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // Wrap in our custom MediaStream class
    const customStream = new MediaStream();
    stream.getTracks().forEach((track) => customStream.addTrack(track));
    return customStream as any;
  },

  enumerateDevices: async (): Promise<MediaDeviceInfo[]> => {
    if (!isBrowser) {
      return [];
    }
    return navigator.mediaDevices.enumerateDevices();
  },
};

// RTCView component for web - renders video/audio element
export const RTCView = ({ streamURL, style, objectFit, mirror, ...props }: any) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && streamURL) {
      // Check if streamURL is a MediaStream-like object (has getTracks method)
      // This handles both our custom MediaStream class and browser's native MediaStream
      const isMediaStream =
        streamURL &&
        (streamURL instanceof MediaStream ||
          (typeof streamURL === "object" && typeof streamURL.getTracks === "function"));

      console.log("[RTCView] streamURL type:", typeof streamURL);
      console.log("[RTCView] isMediaStream:", isMediaStream);
      console.log("[RTCView] has getTracks:", typeof streamURL?.getTracks);

      if (isMediaStream && videoRef.current) {
        console.log("[RTCView] Setting srcObject with stream");
        console.log("[RTCView] Stream tracks:", streamURL.getTracks?.()?.length);
        console.log("[RTCView] Video tracks:", streamURL.getVideoTracks?.()?.length);
        console.log("[RTCView] Audio tracks:", streamURL.getAudioTracks?.()?.length);

        videoRef.current.srcObject = streamURL;
        videoRef.current.play().catch((err) => {
          console.error("[RTCView] Error playing video:", err);
        });
      }
    }
  }, [streamURL]);

  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: objectFit || "cover",
    transform: mirror ? "scaleX(-1)" : undefined,
    ...style,
  };

  return React.createElement("video", {
    ref: videoRef,
    style: videoStyle,
    autoPlay: true,
    playsInline: true,
    muted: mirror, // Mute local video to prevent echo
    ...props,
  });
};

// Default export for compatibility
export default {
  MediaStream,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  RTCView,
};
