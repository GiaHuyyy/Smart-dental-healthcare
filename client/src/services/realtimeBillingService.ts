import { io, Socket } from "socket.io-client";

// Payment interfaces
export interface Payment {
  _id: string;
  patientId: string | { _id: string; fullName: string };
  doctorId: string | { _id: string; fullName: string };
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentMethod?: string;
  type: string;
  billType?: "consultation_fee" | "cancellation_charge" | "refund";
  refId?: string;
  refModel?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Revenue interfaces
export interface Revenue {
  _id: string;
  doctorId: string | { _id: string; fullName: string };
  patientId?: string | { _id: string; fullName: string };
  paymentId?: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  revenueDate?: string;
  status: "pending" | "completed";
  type: string;
  refId?: string;
  refModel?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Socket event data interfaces
interface PaymentEventData {
  type: "payment:new" | "payment:update" | "payment:delete";
  data: Payment | { paymentId: string };
  timestamp: string;
}

interface RevenueEventData {
  type: "revenue:new" | "revenue:update" | "revenue:delete";
  data: Revenue | { revenueId: string };
  timestamp: string;
}

/**
 * Realtime service for Payment and Revenue updates
 * Manages WebSocket connections to /payments and /revenue namespaces
 */
class RealtimeBillingService {
  private paymentSocket: Socket | null = null;
  private revenueSocket: Socket | null = null;
  private userId: string | null = null;
  private userRole: "patient" | "doctor" | null = null;

  /**
   * Connect to payment namespace (for patients)
   */
  connectPaymentSocket(token: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;
        console.log(`[Payment Socket] Starting connection...`);
        console.log(`[Payment Socket] User ID: ${userId}`);
        console.log(`[Payment Socket] Token: ${token ? `${token.substring(0, 20)}...` : "MISSING"}`);
        console.log(`[Payment Socket] Backend URL: ${process.env.NEXT_PUBLIC_BACKEND_URL}`);

        // Disconnect existing connection
        if (this.paymentSocket) {
          console.log(`[Payment Socket] Disconnecting existing socket...`);
          this.paymentSocket.disconnect();
        }

        const formattedToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
        const socketUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/payments`;

        console.log(`[Payment Socket] Connecting to: ${socketUrl}`);
        console.log(`[Payment Socket] Auth config:`, {
          hasToken: !!formattedToken,
          hasUserId: !!userId,
        });

        this.paymentSocket = io(socketUrl, {
          auth: {
            token: formattedToken,
            userId,
          },
          extraHeaders: {
            Authorization: formattedToken,
          },
          transports: ["websocket", "polling"],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.paymentSocket.on("connect", () => {
          console.log(`✅ Payment socket connected successfully!`);
          console.log(`   - Socket ID: ${this.paymentSocket?.id}`);
          console.log(`   - User ID: ${userId}`);
          resolve();
        });

        this.paymentSocket.on("connect_error", (error) => {
          console.error("❌ Payment socket connection error:", error);
          console.error("Error details:", {
            message: error.message,
            type: error.name,
            userId,
            url: socketUrl,
          });
          reject(error);
        });

        this.paymentSocket.on("disconnect", (reason) => {
          console.log("⚠️ Payment socket disconnected:", reason);
        });

        this.paymentSocket.on("reconnect_attempt", (attemptNumber) => {
          console.log(`🔄 Payment socket reconnect attempt ${attemptNumber}`);
        });

        this.paymentSocket.on("reconnect_failed", () => {
          console.error("❌ Payment socket reconnection failed");
        });

        // Debug all events
        this.paymentSocket.onAny((event, ...args) => {
          if (event !== "ping" && event !== "pong") {
            console.log(`[Payment Socket] Event received: ${event}`, args);
          }
        });
      } catch (error) {
        console.error("❌ Payment socket setup error:", error);
        reject(error);
      }
    });
  }

  /**
   * Connect to revenue namespace (for doctors)
   */
  connectRevenueSocket(token: string, doctorId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = doctorId;
        this.userRole = "doctor";
        console.log(`[Revenue Socket] Connecting for doctor: ${doctorId}`);

        // Disconnect existing connection
        if (this.revenueSocket) {
          this.revenueSocket.disconnect();
        }

        const formattedToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

        this.revenueSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/revenue`, {
          auth: {
            token: formattedToken,
            doctorId,
          },
          extraHeaders: {
            Authorization: formattedToken,
          },
          transports: ["websocket", "polling"],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.revenueSocket.on("connect", () => {
          console.log(`✅ Revenue socket connected: ${this.revenueSocket?.id}`);
          resolve();
        });

        this.revenueSocket.on("connect_error", (error) => {
          console.error("❌ Revenue socket connection error:", error);
          reject(error);
        });

        this.revenueSocket.on("disconnect", (reason) => {
          console.log("Revenue socket disconnected:", reason);
        });

        // Debug all events
        this.revenueSocket.onAny((event, ...args) => {
          if (event !== "ping" && event !== "pong") {
            console.log(`[Revenue Socket] Event: ${event}`, args);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect payment socket
   */
  disconnectPayment() {
    if (this.paymentSocket) {
      this.paymentSocket.disconnect();
      this.paymentSocket = null;
    }
  }

  /**
   * Disconnect revenue socket
   */
  disconnectRevenue() {
    if (this.revenueSocket) {
      this.revenueSocket.disconnect();
      this.revenueSocket = null;
    }
  }

  /**
   * Disconnect all sockets
   */
  disconnectAll() {
    this.disconnectPayment();
    this.disconnectRevenue();
    this.userId = null;
    this.userRole = null;
  }

  // ============== PAYMENT EVENT LISTENERS ==============

  /**
   * Listen for new payment events
   */
  onPaymentNew(callback: (payment: Payment) => void) {
    if (this.paymentSocket) {
      this.paymentSocket.on("payment:new", (data: PaymentEventData) => {
        console.log("🔔 New payment received:", data);
        callback(data.data as Payment);
      });
    }
  }

  /**
   * Listen for payment update events
   */
  onPaymentUpdate(callback: (payment: Payment) => void) {
    if (this.paymentSocket) {
      this.paymentSocket.on("payment:update", (data: PaymentEventData) => {
        console.log("🔔 Payment updated:", data);
        callback(data.data as Payment);
      });
    }
  }

  /**
   * Listen for payment delete events
   */
  onPaymentDelete(callback: (paymentId: string) => void) {
    if (this.paymentSocket) {
      this.paymentSocket.on("payment:delete", (data: PaymentEventData) => {
        console.log("🔔 Payment deleted:", data);
        const paymentId = (data.data as { paymentId: string }).paymentId;
        callback(paymentId);
      });
    }
  }

  /**
   * Remove payment event listener
   */
  offPayment(event: "payment:new" | "payment:update" | "payment:delete", callback?: (...args: unknown[]) => void) {
    if (this.paymentSocket) {
      this.paymentSocket.off(event, callback);
    }
  }

  // ============== REVENUE EVENT LISTENERS ==============

  /**
   * Listen for new revenue events
   */
  onRevenueNew(callback: (revenue: Revenue) => void) {
    if (this.revenueSocket) {
      this.revenueSocket.on("revenue:new", (data: RevenueEventData) => {
        console.log("🔔 New revenue received:", data);
        callback(data.data as Revenue);
      });
    }
  }

  /**
   * Listen for revenue update events
   */
  onRevenueUpdate(callback: (revenue: Revenue) => void) {
    if (this.revenueSocket) {
      this.revenueSocket.on("revenue:update", (data: RevenueEventData) => {
        console.log("🔔 Revenue updated:", data);
        callback(data.data as Revenue);
      });
    }
  }

  /**
   * Listen for revenue delete events
   */
  onRevenueDelete(callback: (revenueId: string) => void) {
    if (this.revenueSocket) {
      this.revenueSocket.on("revenue:delete", (data: RevenueEventData) => {
        console.log("🔔 Revenue deleted:", data);
        const revenueId = (data.data as { revenueId: string }).revenueId;
        callback(revenueId);
      });
    }
  }

  /**
   * Remove revenue event listener
   */
  offRevenue(event: "revenue:new" | "revenue:update" | "revenue:delete", callback?: (...args: unknown[]) => void) {
    if (this.revenueSocket) {
      this.revenueSocket.off(event, callback);
    }
  }

  // ============== CONNECTION STATUS ==============

  /**
   * Check if payment socket is connected
   */
  isPaymentConnected(): boolean {
    return this.paymentSocket?.connected || false;
  }

  /**
   * Check if revenue socket is connected
   */
  isRevenueConnected(): boolean {
    return this.revenueSocket?.connected || false;
  }

  /**
   * Get payment socket instance (for advanced usage)
   */
  getPaymentSocket(): Socket | null {
    return this.paymentSocket;
  }

  /**
   * Get revenue socket instance (for advanced usage)
   */
  getRevenueSocket(): Socket | null {
    return this.revenueSocket;
  }
}

// Export singleton instance
export const realtimeBillingService = new RealtimeBillingService();
export default realtimeBillingService;
