"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState, useCallback } from "react";
import realtimeBillingService, { Payment } from "@/services/realtimeBillingService";

interface PaymentSocketHook {
  isConnected: boolean;
  onNewPayment: (callback: (payment: Payment) => void) => () => void;
  onPaymentUpdate: (callback: (payment: Payment) => void) => () => void;
  onPaymentDelete: (callback: (paymentId: string) => void) => () => void;
}

/**
 * Hook to manage realtime payment updates for patients
 * Connects to /payments namespace and listens for payment events
 */
export function usePaymentSocket(): PaymentSocketHook {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    // Only connect when user is authenticated
    if (status !== "authenticated" || !session?.user) {
      console.log("⚠️ Payment socket: Not authenticated yet", { status, hasUser: !!session?.user });
      return;
    }

    // Prevent double connection
    if (isConnectingRef.current) {
      console.log("⚠️ Payment socket: Already connecting, skipping");
      return;
    }

    const userId = session.user._id;
    const token = (session as { access_token?: string }).access_token || "";

    console.log("🔍 Payment socket connection attempt:", {
      userId,
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 20)}...` : "none",
    });

    if (!token) {
      console.error("❌ No access token available for payment socket");
      return;
    }

    if (!userId) {
      console.error("❌ No user ID available for payment socket");
      return;
    }

    isConnectingRef.current = true;

    console.log("🔌 Connecting to payment socket...", {
      userId,
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
      namespace: "/payments",
    });

    // Connect to payment socket
    realtimeBillingService
      .connectPaymentSocket(token, userId)
      .then(() => {
        console.log("✅ Payment socket connected successfully");
        setIsConnected(true);
      })
      .catch((error) => {
        console.error("❌ Failed to connect payment socket:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
        setIsConnected(false);
        isConnectingRef.current = false;
      });

    // Cleanup on unmount or session change
    return () => {
      console.log("🔌 Cleaning up payment socket...");
      realtimeBillingService.disconnectPayment();
      setIsConnected(false);
      isConnectingRef.current = false;
    };
  }, [session, status]);

  /**
   * Register callback for new payment events
   * Returns cleanup function to remove listener
   */
  const onNewPayment = useCallback((callback: (payment: Payment) => void) => {
    realtimeBillingService.onPaymentNew(callback);

    // Return cleanup function
    return () => {
      realtimeBillingService.offPayment("payment:new");
    };
  }, []);

  /**
   * Register callback for payment update events
   * Returns cleanup function to remove listener
   */
  const onPaymentUpdate = useCallback((callback: (payment: Payment) => void) => {
    realtimeBillingService.onPaymentUpdate(callback);

    // Return cleanup function
    return () => {
      realtimeBillingService.offPayment("payment:update");
    };
  }, []);

  /**
   * Register callback for payment delete events
   * Returns cleanup function to remove listener
   */
  const onPaymentDelete = useCallback((callback: (paymentId: string) => void) => {
    realtimeBillingService.onPaymentDelete(callback);

    // Return cleanup function
    return () => {
      realtimeBillingService.offPayment("payment:delete");
    };
  }, []);

  return {
    isConnected,
    onNewPayment,
    onPaymentUpdate,
    onPaymentDelete,
  };
}
