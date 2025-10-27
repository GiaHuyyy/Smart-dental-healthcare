"use client";

import walletService from "@/services/walletService";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle, Clock, DollarSign, Plus, RefreshCw, TrendingUp, Wallet, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Transaction {
  _id: string;
  amount: number;
  createdAt: string;
  status: string;
  type: string;
}

export default function PatientWallet() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [showTopUp, setShowTopUp] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [topUpHistory, setTopUpHistory] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalTopUp: 0,
    successfulTransactions: 0,
  });
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);
  const [paymentCheckInterval, setPaymentCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchWalletData = useCallback(async () => {
    try {
      const accessToken = (session as any)?.access_token;
      if (!accessToken) return;

      const [balanceRes, historyRes, statsRes] = await Promise.all([
        walletService.getBalance(accessToken),
        walletService.getHistory(accessToken),
        walletService.getStats(accessToken),
      ]);

      if (balanceRes.success) {
        setWalletBalance(balanceRes.data.balance);
      }

      if (historyRes.success) {
        setTopUpHistory(historyRes.data.transactions);
      }

      if (statsRes.success) {
        setStats({
          totalTopUp: statsRes.data.totalTopUp,
          successfulTransactions: statsRes.data.successfulTransactions,
        });
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast.error("Không thể tải thông tin ví");
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchWalletData();
    }
  }, [session, fetchWalletData]);

  const handleTopUp = async () => {
    if (!amount || parseFloat(amount) < 10000) {
      toast.error("Số tiền nạp tối thiểu là 10,000 VNĐ");
      return;
    }

    const accessToken = (session as any)?.access_token;
    if (!accessToken) {
      toast.error("Vui lòng đăng nhập để nạp tiền");
      return;
    }

    setLoading(true);
    try {
      toast.info("Đang tạo yêu cầu nạp tiền...");
      
      const topUpAmount = parseFloat(amount);
      const response = await walletService.topUp(accessToken, {
        amount: topUpAmount,
        paymentMethod: 'momo',
        description: `Nạp ${topUpAmount.toLocaleString('vi-VN')} VNĐ vào ví`,
      });
      
      if (response.success && response.data?.payUrl) {
        // Store payment info for callback simulation
        const orderId = response.data.orderId;
        const userId = (session as any)?.user?._id;
        
        sessionStorage.setItem(`momo_payment_${orderId}`, JSON.stringify({
          userId,
          amount: topUpAmount,
          paymentMethod: 'momo',
          description: `Nạp ${topUpAmount.toLocaleString('vi-VN')} VNĐ vào ví`
        }));
        
        // Mở MoMo trong tab mới
        const paymentWindow = window.open(response.data.payUrl, '_blank');
        
        // Đóng modal và hiển thị loading state
        setAmount("");
        setShowTopUp(false);
        setLoading(false);
        setIsWaitingPayment(true);
        toast.info("Đang mở trang thanh toán MoMo...");
        
        // Start polling để check payment status
        const checkInterval = setInterval(async () => {
          try {
            // Check if payment window is closed
            if (paymentWindow?.closed) {
              clearInterval(checkInterval);
              setIsWaitingPayment(false);
              setPaymentCheckInterval(null);
              
              // Refresh wallet data
              const accessToken = (session as any)?.access_token;
              if (accessToken) {
                const balanceRes = await walletService.getBalance(accessToken);
                if (balanceRes.success) {
                  setWalletBalance(balanceRes.data.balance);
                }
                toast.info("Đã làm mới số dư");
              }
              return;
            }
          } catch (error) {
            console.error("Error checking payment status:", error);
          }
        }, 2000); // Check every 2 seconds
        
        setPaymentCheckInterval(checkInterval);
        
        // Clean up interval after 5 minutes
        setTimeout(() => {
          if (checkInterval) {
            clearInterval(checkInterval);
            setIsWaitingPayment(false);
            setPaymentCheckInterval(null);
            toast.info("Đã tắt kiểm tra thanh toán. Làm mới số dư để xem cập nhật.");
          }
        }, 5 * 60 * 1000);
        
      } else if (response.success && response.data?.deeplinkMiniApp) {
        // Redirect đến MiniApp
        window.location.href = response.data.deeplinkMiniApp;
      } else {
        toast.error("Không thể tạo yêu cầu thanh toán");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error topping up:", error);
      toast.error("Có lỗi xảy ra khi nạp tiền");
      setLoading(false);
    }
  };

  // Check for return status from MoMo and process callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    
    if (status === 'success') {
      console.log('✅ Thanh toán thành công, đang xử lý...');
      setIsWaitingPayment(false);
      
      // Clean URL
      window.history.replaceState({}, '', '/patient/wallet');
      
      // Get all pending payment info from sessionStorage
      const pendingKeys = Object.keys(sessionStorage).filter(key => key.startsWith('momo_payment_'));
      
      if (pendingKeys.length > 0) {
        // Process all pending payments
        pendingKeys.forEach(async (key) => {
          try {
            const paymentInfo = JSON.parse(sessionStorage.getItem(key) || '{}');
            const { amount, userId } = paymentInfo;
            
            if (userId && amount) {
              console.log(`💰 Processing payment: ${amount} VNĐ for user ${userId}`);
              
              // Update balance
              const response = await fetch(`http://localhost:8081/api/v1/wallet/test-callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  amount,
                  orderId: key.replace('momo_payment_', '')
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                sessionStorage.removeItem(key);
                toast.success(`Đã nạp ${amount.toLocaleString('vi-VN')} VNĐ vào ví!`);
              }
            }
          } catch (err) {
            console.error('Error processing payment:', err);
          }
        });
      }
      
      // Wait a moment then refresh wallet
      setTimeout(() => {
        fetchWalletData();
        toast.success("Thanh toán thành công! Số dư đã được cập nhật.");
      }, 1500);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [fetchWalletData]);

  // Close payment waiting overlay when status changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    
    if (status === 'success' && isWaitingPayment) {
      // Clear any intervals
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        setPaymentCheckInterval(null);
      }
    }
  }, [isWaitingPayment, paymentCheckInterval]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
      }
    };
  }, [paymentCheckInterval]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Payment Waiting Overlay */}
      {isWaitingPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Đang chờ thanh toán</h3>
              <p className="text-gray-600">
                Vui lòng hoàn tất thanh toán trên tab MoMo.
                <br />
                Tab sẽ tự động đóng khi thanh toán thành công.
              </p>
              <button
                onClick={() => {
                  setIsWaitingPayment(false);
                  if (paymentCheckInterval) {
                    clearInterval(paymentCheckInterval);
                    setPaymentCheckInterval(null);
                  }
                  fetchWalletData();
                  toast.info("Đã làm mới số dư");
                }}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Làm mới số dư
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ví điện tử</h1>
          <p className="text-gray-600 mt-1">Quản lý số dư và nạp tiền</p>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-2">Số dư hiện tại</p>
            <h2 className="text-4xl font-bold">{walletBalance.toLocaleString('vi-VN')} VNĐ</h2>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8" />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={() => setShowTopUp(!showTopUp)}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nạp tiền
          </button>
          <button
            onClick={fetchWalletData}
            disabled={loading}
            className="text-white/80 hover:text-white flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới số dư
          </button>
        </div>
      </div>

      {/* Top Up Modal */}
      <Dialog.Root open={showTopUp} onOpenChange={setShowTopUp}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-600" />
                Nạp tiền vào ví
              </h3>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số tiền nạp (VNĐ)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Nhập số tiền"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">Số tiền tối thiểu: 10,000 VNĐ</p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[50000, 100000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmount(amt.toString())}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {amt.toLocaleString('vi-VN')}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Dialog.Close asChild>
                  <button
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                    disabled={loading}
                  >
                    Hủy
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleTopUp}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Nạp tiền
                    </>
                  )}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng đã nạp</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.totalTopUp.toLocaleString('vi-VN')} VNĐ
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Giao dịch thành công</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.successfulTransactions}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Lần nạp gần nhất</p>
              <p className="text-xl font-bold text-gray-900">
                {topUpHistory.length > 0 
                  ? new Date(topUpHistory[0].createdAt).toLocaleDateString('vi-VN')
                  : 'Chưa có'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Lịch sử nạp tiền</h3>
        </div>

        <div className="p-6">
          {topUpHistory.length > 0 ? (
            <div className="space-y-3">
              {topUpHistory.map((transaction) => (
                <div
                  key={transaction._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        +{transaction.amount.toLocaleString('vi-VN')} VNĐ
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Thành công
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có lịch sử nạp tiền</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
