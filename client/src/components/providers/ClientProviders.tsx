"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from 'sonner';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster expand={false} position="top-right" richColors closeButton />
    </SessionProvider>
  );
}
