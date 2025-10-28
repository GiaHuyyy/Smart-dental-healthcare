const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';

interface TopUpRequest {
  amount: number;
  paymentMethod: 'momo' | 'banking' | 'cash';
  description?: string;
}

class WalletService {
  async getBalance(accessToken: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/wallet/balance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      throw error;
    }
  }

  async topUp(accessToken: string, data: TopUpRequest) {
    try {
      const response = await fetch(`${API_URL}/api/v1/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error topping up wallet:', error);
      throw error;
    }
  }

  async getHistory(accessToken: string, page = 1, limit = 10) {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/wallet/history?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching wallet history:', error);
      throw error;
    }
  }

  async getStats(accessToken: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/wallet/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      throw error;
    }
  }
}

const walletService = new WalletService();
export default walletService;

