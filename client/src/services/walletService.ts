const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

interface TopUpRequest {
  amount: number;
  paymentMethod: "momo" | "banking" | "cash";
  description?: string;
}

class WalletService {
  async getBalance(accessToken: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/wallet/balance`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      throw error;
    }
  }

  async topUp(accessToken: string, data: TopUpRequest) {
    try {
      const response = await fetch(`${API_URL}/api/v1/wallet/topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error topping up wallet:", error);
      throw error;
    }
  }

  async getHistory(accessToken: string, page = 1, limit = 10) {
    try {
      const response = await fetch(`${API_URL}/api/v1/wallet/history?page=${page}&limit=${limit}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching wallet history:", error);
      throw error;
    }
  }

  async getStats(accessToken: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/wallet/stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching wallet stats:", error);
      throw error;
    }
  }

  async payWithWallet(accessToken: string, appointmentId: string, amount: number) {
    try {
      const response = await fetch(`${API_URL}/api/v1/wallet/pay-appointment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          appointmentId,
          amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async payPendingBill(accessToken: string, billId: string) {
    console.log("🔵 [CLIENT] Pay Pending Bill - START");
    console.log("🔵 [CLIENT] Request:", {
      billId,
      accessToken: accessToken ? "✅ Present" : "❌ Missing",
    });

    try {
      console.log("🔵 [CLIENT] Calling API:", `${API_URL}/api/v1/wallet/pay-bill`);

      const response = await fetch(`${API_URL}/api/v1/wallet/pay-bill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          billId,
        }),
      });

      console.log("🔵 [CLIENT] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("🔴 [CLIENT] Error response:", errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("🔵 [CLIENT] Success response:", result);
      return result;
    } catch (error) {
      console.error("🔴 [CLIENT] Error paying bill:", error);
      throw error;
    }
  }
}

const walletService = new WalletService();
export default walletService;
