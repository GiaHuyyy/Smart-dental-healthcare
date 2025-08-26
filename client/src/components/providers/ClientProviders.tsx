"use client";

import { store } from '@/store';
import { SessionProvider } from "next-auth/react";
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionProvider>
        {children}
        <Toaster expand={false} position="top-right" richColors closeButton />
      </SessionProvider>
    </Provider>
  );
}
