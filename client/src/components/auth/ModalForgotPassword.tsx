/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { sendRequest } from "@/utils/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import BaseStepModal from "./BaseStepModal";
import { AlertTriangle, Check, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";

interface ModalForgotPasswordProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
}

export default function ModalForgotPassword({ isModalOpen, setIsModalOpen }: ModalForgotPasswordProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userId, setUserId] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSendCode = async () => {
    setIsLoading(true);
    try {
      const res = await sendRequest<IBackendRes<any>>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/forgot-password`,
        method: "POST",
        body: { email },
      });

      if (res.data) {
        setUserId(res.data._id);
        setCurrentStep(2);
        setCountdown(60);
        toast.success("Mã xác thực đã được gửi đến email của bạn");
      } else {
        toast.error(res.message || "Không tìm thấy tài khoản với email này");
      }
    } catch (error) {
      console.error("Error sending code:", error);
      toast.error("Có lỗi xảy ra khi gửi mã xác thực");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    try {
      const res = await sendRequest<IBackendRes<any>>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/verify-reset-code`,
        method: "POST",
        body: {
          id: userId,
          code: verificationCode.trim(),
        },
      });

      if (res?.statusCode === 201) {
        setCurrentStep(3);
        toast.success("Mã xác thực hợp lệ");
      } else {
        toast.error(res?.message || "Mã xác thực không đúng hoặc đã hết hạn");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      toast.error("Có lỗi xảy ra khi xác thực mã");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendRequest<IBackendRes<any>>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/reset-password`,
        method: "POST",
        body: {
          id: userId,
          code: verificationCode.trim(),
          newPassword,
        },
      });

      if (res?.statusCode === 201) {
        toast.success("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.");
        handleCloseModal();
      } else {
        toast.error(res?.message || "Có lỗi xảy ra khi đặt lại mật khẩu");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Có lỗi xảy ra khi đặt lại mật khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
    setEmail("");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setCountdown(0);
    setUserId("");
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quên mật khẩu</h3>
              <p className="text-gray-600 text-sm">Nhập email để nhận mã xác thực đặt lại mật khẩu</p>
            </div>

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Nhập email của bạn"
              />
            </div>

            <button
              onClick={handleSendCode}
              disabled={isLoading || !email || countdown > 0}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Đang gửi...
                </span>
              ) : countdown > 0 ? (
                `Gửi lại sau ${countdown}s`
              ) : (
                "Gửi mã xác thực"
              )}
            </button>
          </>
        );

      case 2:
        return (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nhập mã xác thực</h3>
              <p className="text-gray-600 text-sm">
                Mã xác thực đã được gửi đến email: <span className="font-medium">{email}</span>
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Mã xác thực
              </label>
              <input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập mã xác thực"
              />
              <p className="text-xs text-gray-500 mt-1">Nhập mã xác thực</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBackStep}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Quay lại
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={isLoading || !verificationCode.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Đang xác thực...
                  </span>
                ) : (
                  "Xác thực"
                )}
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={handleSendCode}
                disabled={countdown > 0}
                className={`text-sm font-medium ${
                  countdown > 0 ? "text-gray-400 cursor-not-allowed" : "text-orange-600 hover:text-orange-800"
                }`}
              >
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại mã xác thực"}
              </button>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Đặt lại mật khẩu</h3>
              <p className="text-gray-600 text-sm">Nhập mật khẩu mới cho tài khoản của bạn</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nhập mật khẩu mới"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBackStep}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Quay lại
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isLoading || !newPassword || !confirmPassword}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Đang cập nhật...
                  </span>
                ) : (
                  "Đặt lại mật khẩu"
                )}
              </button>
            </div>

            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700">
                <span className="font-medium">Lưu ý:</span> Mật khẩu phải có ít nhất 6 ký tự.
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <BaseStepModal
      isModalOpen={isModalOpen}
      onClose={handleCloseModal}
      currentStep={currentStep}
      totalSteps={3}
      stepIndicatorColor="orange"
    >
      {renderStepContent()}
    </BaseStepModal>
  );
}
