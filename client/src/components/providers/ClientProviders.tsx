"use client";

import { store } from "@/store";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { Toaster } from "sonner";
import { RealtimeChatProvider } from "@/contexts/RealtimeChatContext";
import { WebRTCProvider } from "@/contexts/WebRTCContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionProvider>
        <RealtimeChatProvider>
          <WebRTCProvider>
            {children}
            <Toaster expand={false} position="top-right" richColors closeButton />
          </WebRTCProvider>
        </RealtimeChatProvider>
      </SessionProvider>
    </Provider>
  );
}
