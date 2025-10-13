"use client";

import { store } from "@/store";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { Toaster } from "sonner";
import { GlobalSocketProvider } from "@/contexts/GlobalSocketContext";
import { RealtimeChatProvider } from "@/contexts/RealtimeChatContext";
import { WebRTCProvider } from "@/contexts/WebRTCContext";
import { CallProvider } from "@/contexts/CallProvider";
import IncomingCallModal from "@/components/call/IncomingCallModal";
import VideoCallInterface from "@/components/call/VideoCallInterface";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        {/* Global Socket Provider - Single connection for all features */}
        <GlobalSocketProvider>
          <RealtimeChatProvider>
            <WebRTCProvider>
              <CallProvider>
                {children}
                <Toaster expand={false} position="top-right" richColors closeButton />

                {/* Global Call Components */}
                <IncomingCallModal />
                <VideoCallInterface />
              </CallProvider>
            </WebRTCProvider>
          </RealtimeChatProvider>
        </GlobalSocketProvider>
      </SessionProvider>
    </Provider>
  );
}
