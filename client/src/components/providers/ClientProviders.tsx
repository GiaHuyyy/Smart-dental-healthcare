"use client";

import { store } from "@/store";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { Toaster } from "sonner";
import { GlobalSocketProvider } from "@/contexts/GlobalSocketContext";
import { AppointmentProvider } from "@/contexts/AppointmentContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { RealtimeChatProvider } from "@/contexts/RealtimeChatContext";
import { CallProvider } from "@/contexts/CallContext";
import { IncomingCallModal, CallScreen } from "@/components/call";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        {/* Global Socket Provider - Single connection for all features */}
        <GlobalSocketProvider>
          {/* Appointment Context - Handles appointment-related events */}
          <AppointmentProvider>
            {/* Notification Context - Handles persistent notifications */}
            <NotificationProvider>
              {/* Chat Context - Reuses socket for chat (except private chat rooms) */}
              <RealtimeChatProvider>
                {/* Call Context - WebRTC calls */}
                <CallProvider>
                  {children}
                  <Toaster expand={false} position="top-right" richColors closeButton />

                  {/* Global Call Components */}
                  <IncomingCallModal />
                  <CallScreen />
                </CallProvider>
              </RealtimeChatProvider>
            </NotificationProvider>
          </AppointmentProvider>
        </GlobalSocketProvider>
      </SessionProvider>
    </Provider>
  );
}
